import util from 'util';
import ursa from 'ursa';
import WebSocket from 'ws';
import Message from './Message.js';

const GroupSeparator = '\u001d';

export default class Connection {
	constructor(Terminal, SecureChat, client, rsa) {
		this.Terminal = Terminal;
		this.SecureChat = SecureChat;
		this.emit = Terminal.emit.bind(Terminal);

		this.client = client;

		this.debug = false;

		this.rsa = {
			local: rsa.local,
			remote: {
				cert: void 0,
				username: 'remote'
			}
		};

		this.flags = {
			SHAKE: 0, // 1=LOCAL,2=REMOTE,3=BOTH(READY FOR HELO)
			HELO: 0 // 1=LOCAL,2=REMOTE,3=BOTH(READY FOR CHAT)
		};

		this.init();
	}

	init() {
		this.emit('echo', `Establishing new connection with ${this.client.REMOTE_ADDRESS}`);

		this.client.on('message', (raw) => {
			if (!raw) return;

			const [type, contents] = raw.split(GroupSeparator);

			if (type === 'SHAKE') {
				if (this.debug) this.emit('echo', `[SHAKE] => ${contents}`);
				this.handleShake(type, contents);
				return;
			}

			const msg = new Message(this);
			const error = msg.decrypt(contents);
			if (error) {
				this.emit('echo', 'Terminating Connection (received malformed socket message)');
				this.terminate();
				return;
			}

			msg.type = type;

			if (this.debug) this.emit('echo', `[${type}] => ${util.inspect(msg, false, 0)}`);

			if (type === 'HELO') {
				this.handleHelo(type, msg);
				return;
			}

			this.handleMessage(type, msg);
		});

		this.client.on('close', () => {
			if (this.listener) this.emit('echo', '* SecureChat no longer listening...');
			this.close();
			this.Terminal.removeAllListeners('message');
			this.emit('echo', `* ${this.rsa.remote.username} has left this session: (Connection reset by peer)`);
			this.terminate();
		});
	}

	ready() {
		const { SecureChat: { username }, Terminal } = this;

		this.emit('echo', `* ${this.rsa.remote.username} has connected this session.`);

		Terminal.addListener('message', (msg, type) => {
			if (!msg || this.client.readyState !== WebSocket.OPEN) return;

			const msgInst = new Message({
				type: type || 'text',
				username,
				message: msg
			}, this);

			this.client.send(msgInst.toString());
		});
	}

	handleShake(type, contents) {
		this.emit('echo', 'Received SHAKE...');

		if (this.flags.SHAKE === 2) return;

		try {
			this.rsa.remote.cert = ursa.createPublicKey(
				(JSON.parse(contents)).publicCert
			);
		} catch (e) {
			this.emit('echo', 'Terminating Connection (Malformed handshake: SHAKE)');
			this.terminate();
			return;
		}
		this.flags.SHAKE += 2;

		if (this.flags.SHAKE === 3) {
			this.sendHelo();
		} else if (this.flags.SHAKE === 2) {
			this.sendShake();
		}
	}

	sendShake() {
		this.emit('echo', 'Sending SHAKE...');

		const msg = new Message({
			type: 'SHAKE',
			publicCert: this.rsa.local.cert.toPublicPem('utf8')
		}, this);

		this.client.send(msg.toString());

		this.flags.SHAKE += 1;
	}

	handleHelo(type, msg) {
		this.emit('echo', 'Receiving HELO...');

		if (this.flags.SHAKE !== 3) {
			this.emit('echo', 'Handshake steps were out of order. Terminating session.');
			this.terminate();
			return;
		}

		if (this.flags.HELO === 3 || this.flags.HELO === 2) return;

		this.rsa.remote.username = msg.username;
		this.flags.HELO += 2;

		if (this.flags.HELO === 2) {
			this.sendHelo();
		} else if (this.flags.HELO === 3) {
			this.ready();
		}
	}

	sendHelo() {
		const { SecureChat: { username } } = this;

		this.emit('echo', 'Sending HELO...');

		const msg = new Message({
			type: 'HELO',
			username
		}, this);

		this.client.send(msg.toString());

		this.flags.HELO += 1;

		if (this.flags.HELO === 3 && this.flags.SHAKE === 3) this.ready();
	}

	handleMessage(type, contents) {
		const { SecureChat } = this;
		if (this.flags.SHAKE !== 3 || this.flags.HELO !== 3) {
			this.emit('echo', 'Terminating Connection (Received message before handshake completed)');
			this.terminate();
			return;
		}

		let parsed;
		try {
			parsed = JSON.parse(contents);
		} catch (e) {
			parsed = contents;
		}

		parsed.type = type;
		parsed.username = parsed.username || this.rsa.remote.username;

		SecureChat.handleMessage(parsed);
	}

	close() {
		if (this.client && this.client.close) this.client.close();
	}

	terminate() {
		if (this.client && this.client.terminate) this.client.terminate();
		else this.close();
	}
}
