import fs from 'fs';
import ursa from 'ursa';
import yargs from 'yargs';
import WebSocket from 'ws';

const Terminal = global.Terminal;

class SecureChat {
	constructor() {
		Terminal.emit('echo', 'Setting up SecureChat Package');

		this.init();
	}

	init() {
		this.cbs = [];
		this.handshakeCbs = [];

		this.username = Terminal.config.username || "remote";

		this.initRSA();
		this.initCommands();
	}

	initRSA() {
		Terminal.emit('echo', 'Generating RSA key-pair for secure session');

		var key = ursa.generatePrivateKey(),
			cert = ursa.createPublicKey(key.toPublicPem());

		this.rsa = {
			"local": {
				"key": key,
				"cert": cert
			},
			"remote": {
				"cert": void 0,
				"username": "remote"
			}
		};

		Terminal.emit('echo', 'Setting up handshake');

		this.handshake = JSON.stringify({
			"username": this.username,
			"publicCert": this.rsa.local.cert.toPublicPem('utf8')
		});
	}

	initCommands() {
		Terminal.emit('echo', 'Registering commands...');

		Terminal.registerCommand('su', (parts, raw, Term) => {
			Term.config.username = this.username = parts[1];
			Term.emit('commandExit');
		});

		Terminal.registerCommand('connect', (parts, raw, Term) => {
			var that = this,
				Clnt = this.client = new WebSocket('ws://'+parts[1]+'/');

			Clnt.on('open', () => {
				if(this.listener && this.listener.close) {
					this.listener.close();
				}

				this.connectionEstablished();
			});

			Term.emit('commandExit');
		});

		Terminal.registerCommand('listen', (parts, raw, Term) => {
			var port = Math.floor(Math.random() * 10000);

			if(parts.length > 1 && !!parts[1]) port = parts[1];

			var Listener = this.listener = new WebSocket.Server({ port: port });

			Listener.on('connection', (remote) => {
				this.client = remote;

				this.connectionEstablished();
			});

			Term.emit('echo', `Listening for connections on port: ${port}`);

			Term.emit('commandExit');
		})
	}

	connectionEstablished() {
		this.client.on('message', (raw) => {
			let parsed;
			try {
				parsed = JSON.parse(raw);
			} catch(e) {}

			this.handleMessage(raw, parsed);
		});

		this.client.on('close', () => {
			Terminal.emit('echo', `SecureChat: ${this.rsa.remote.username} has left this session: (Connection reset by peer)`);
		});

		Terminal.addListener('message', (msg) => {
			this.client.send(JSON.stringify({
				"username": this.username,
				"message": this.rsa.remote.cert.encrypt(msg, 'utf8', 'base64')
			}));
		});

		this.client.send(this.handshake);
	}

	handleMessage(raw, parsed) {
		if(!parsed) this.showRemoteMessage(raw);
		if(parsed.hasOwnProperty('message')) {
			this.showRemoteMessage(parsed.message, parsed.username);
		}
		if(parsed.hasOwnProperty('publicCert')) {
			this.rsa.remote.cert = ursa.createPublicKey(parsed.publicCert);
			this.rsa.remote.username = parsed.username;
			this.handleHandshake(parsed);
		}
	}

	showRemoteMessage(msg, username) {
		var origMsg = this.rsa.local.key.decrypt(msg, 'base64', 'utf8');
		Terminal.emit('echo', (username || "remote") + Terminal.config.promptDelim + origMsg);
	}

	handleHandshake(parsed) {
		Terminal.emit('echo', `* ${this.rsa.remote.username} has connected to your session.`);
	}
}

global.SecureChatInstance = new SecureChat();
