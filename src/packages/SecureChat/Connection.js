import fs from 'fs';
import ursa from 'ursa';
import yargs from 'yargs';
import WebSocket from 'ws';

const GroupSeparator = "\u001d";

const Terminal = global.Terminal;
const SecureChat = global.SecureChatInstance;

export default class Connection {
	constructor(client, rsa) {
		this.client = client;

		this.rsa = {
			"local": rsa.local,
			"remote": {
				"cert": void 0,
				"username": "remote"
			}
		};

		this.flags = {
			"SHAKE": 0, // 1=LOCAL,2=REMOTE,3=BOTH(READY FOR HELO)
			"HELO": 0 // 1=LOCAL,2=REMOTE,3=BOTH(READY FOR CHAT)
		};

		this.init();
	}

	init() {
		Terminal.emit('echo', `Establishing new connection with ${client.upgradeReq.connection.remoteAddress}`);

		this.client.on('message', (raw) => {
			let {type,contents} = raw.split("\u001D");

			switch(type) {
				case "SHAKE":
					this.handleShake(type,contents);
					break;
				case "HELO":
					this.handleHelo(type,contents);
					break;
				default:
					this.handleMessage(type,contents);
			}
		});

		this.client.on('close', () => {
			if(this.listener) Terminal.emit('echo', '* SecureChat no longer listening...');
			this.close();
			Terminal.removeAllListeners('message');
			Terminal.emit('echo', `* ${this.rsa.remote.username} has left this session: (Connection reset by peer)`);
			this.terminate();
		});
	}

	ready() {
		Terminal.emit('echo', `* ${this.rsa.remote.username} has connected this session.`);

		Terminal.addListener('message', (msg, type) => {
			if(!msg || this.client.readyState !== WebSocket.OPEN) return;

			let msg = new Message({
				"type": type || "text",
				"username": Terminal.username,
				"message": msg
			}, this.rsa);

			this.client.send(msg);
		});
	}

	handleShake(type,contents) {
		Terminal.emit('echo', 'Received SHAKE...');

		if(this.flags.SHAKE===3) {
			this.sendHelo();
		}

		if(this.flags.SHAKE===2) return;

		try {
			this.rsa.remote.cert = (JSON.parse(contents)).publicCert;
		} catch(e) {
			Terminal.emit('echo', `Terminating Connection (Malformed handshake: SHAKE)`);
			return this.terminate();
		}
		this.flags.SHAKE+=2;

		if(this.flags.SHAKE===2) {
			this.sendShake();
		}
	}

	sendShake() {
		Terminal.emit('echo', 'Sending SHAKE...');

		let msg = new Message({
			"type": "SHAKE",
			"publicCert": this.rsa.local.cert.toPublicPem('utf8')
		}, this.rsa);

		this.client.send(msg);

		this.flags.SHAKE++;
	}

	handleHelo(type,contents) {
		Terminal.emit('echo', 'Receiving HELO...');

		if(this.flags.SHAKE!==3) {
			Terminal.emit('echo', 'Handshake steps were out of order. Terminating session.');
			return this.terminate();
		}

		if(this.flags.HELO===3
		|| this.flags.HELO===2) return;

		try {
			this.rsa.remote.username = (JSON.parse(contents)).username;
		} catch(e) {
			Terminal.emit('echo', `Terminating Connection (Malformed handshake: HELO)`);
			return this.terminate();
		}
		this.flags.HELO+=2;

		if(this.flags.HELO===2) {
			this.sendHelo();
		}
	}

	sendHelo() {
		Terminal.emit('echo', 'Sending HELO...');

		let msg = new Message({
			"type": "HELO",
			"username": Terminal.username
		}, this.rsa);

		this.client.send(msg);

		this.flags.HELO++;

		if(this.flags.HELO===3 && this.flags.SHAKE===3) this.ready();
	}

	handleMessage(type, contents) {
		if(this.flags.SHAKE!==3
		|| this.flags.HELO!==3) {
			Terminal.emit('echo', 'Terminating Connection (Received message before handshake completed)');
			return this.terminate();
		}

		var parsed;
		try {
			parsed = JSON.parse(contents);
		} catch(e) {}

		contents.type = type;
		contents.username = contents.username || this.rsa.remote.username;

		SecureChat.handleMessage(contents);
	}

	close() {
		if(this.client && this.client.close) this.client.close();
	}

	terminate() {
		if(this.client && this.client.terminate) this.client.terminate();
		else this.close();
	}
}
