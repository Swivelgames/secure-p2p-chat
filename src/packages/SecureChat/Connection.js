import util from 'util';
import url from 'url';
import fs from 'fs';
import ursa from 'ursa';
import yargs from 'yargs';
import WebSocket from 'ws';
import Message from './Message.js';

const GroupSeparator = "\u001d";

export default (Terminal,SecureChat) => class Connection {
	constructor(client, rsa) {
		this.client = client;

		this.debug = false;

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
		Terminal.emit('echo', `Establishing new connection with ${this.client.REMOTE_ADDRESS}`);

		this.client.on('message', (raw) => {
			if(!raw) return;

			let [type,contents] = raw.split(GroupSeparator);

			if(type==="SHAKE") {
				if(this.debug) Terminal.emit('echo', `[SHAKE] => ${contents}`);
				return this.handleShake(type, contents);
			}

			let msg = new Message(this);
			let error = msg.decrypt(contents);
			if(error) {
				Terminal.emit('echo', `Terminating Connection (received malformed socket message)`);
				this.terminate();
				return;
			}

			msg.type = type;

			if(this.debug) Terminal.emit('echo', `[${type}] => ${util.inspect(msg, false, 0)}`);

			if(type==="HELO") {
				return this.handleHelo(type, msg);
			}

			return this.handleMessage(type, msg);
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

			var msg = new Message({
				"type": type || "text",
				"username": SecureChat.username,
				"message": msg
			}, this);

			this.client.send(msg.toString());
		});
	}

	handleShake(type,contents) {
		Terminal.emit('echo', 'Received SHAKE...');

		if(this.flags.SHAKE===2) return;

		try {
			this.rsa.remote.cert = ursa.createPublicKey(
				(JSON.parse(contents)).publicCert
			);
		} catch(e) {
			Terminal.emit('echo', `Terminating Connection (Malformed handshake: SHAKE)`);
			return this.terminate();
		}
		this.flags.SHAKE+=2;

		if(this.flags.SHAKE===3) {
			this.sendHelo();
		} else if(this.flags.SHAKE===2) {
			this.sendShake();
		}
	}

	sendShake() {
		Terminal.emit('echo', 'Sending SHAKE...');

		let msg = new Message({
			"type": "SHAKE",
			"publicCert": this.rsa.local.cert.toPublicPem('utf8')
		}, this);

		this.client.send(msg.toString());

		this.flags.SHAKE++;
	}

	handleHelo(type,msg) {
		Terminal.emit('echo', 'Receiving HELO...');

		if(this.flags.SHAKE!==3) {
			Terminal.emit('echo', 'Handshake steps were out of order. Terminating session.');
			return this.terminate();
		}

		if(this.flags.HELO===3
		|| this.flags.HELO===2) return;

		this.rsa.remote.username = msg.username;
		this.flags.HELO+=2;

		if(this.flags.HELO===2) {
			this.sendHelo();
		} else if(this.flags.HELO===3) {
			this.ready();
		}
	}

	sendHelo() {
		Terminal.emit('echo', 'Sending HELO...');

		let msg = new Message({
			"type": "HELO",
			"username": SecureChat.username
		}, this);

		this.client.send(msg.toString());

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
