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
		this.connections = [];

		this.disableDecryption = false;

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
			}
		};
	}

	initCommands() {
		Terminal.emit('echo', 'Registering commands...');

		Terminal.registerCommand('raw', () => {
			this.disableDecryption = !this.disableDecryption;
			Terminal.emit('commandExit');
		});

		Terminal.registerCommand('su', (parts, raw, Term) => {
			let oldUsername = Term.config.username;

			Terminal.emit('message', `changed their username to ${parts[1]}`, 'me');

			setTimeout( () => {
				Term.config.username = this.username = parts[1];
				Term.redrawPrompt();
				Term.emit('commandExit');
			}, 100);
		});

		Terminal.registerCommand('me', (parts, raw, Term) => {
			let text = parts.slice(1).join(" ");
			Terminal.emit('echo', `* ${this.username} ${text}`);
			Terminal.emit('message', text, 'me');
		})

		Terminal.registerCommand(['part','kick','leave','disconnect'], (parts, raw, Term) => {
			try {
				this.killClient();
				this.killListener();
			} catch(e) {}
			Terminal.emit('commandExit');
		});

		Terminal.registerCommand('connect', (parts, raw, Term) => {
			try {
				Terminal.emit('echo', 'Connecting to socket: '+parts[1]);

				(function(client){
					client.on('open', () => {
						this.killListener();
						this.connections.push(let Conn = new Connection(client));
						Conn.sendShake();
					});

					client.on('error', (err) => {
						Term.emit('echo', `Unable to connect to socket: ${parts[1]}`);
						Terminal.handleError(err);
						this.killListener();
					});
				})(new WebSocket('ws://'+parts[1]+'/'));
			} catch(e) {
				Terminal.handleError(e);
			}
		});

		Terminal.registerCommand('listen', (parts, raw, Term) => {
			try {
				this.killListener();

				var opts = {
					port: Math.floor(Math.random() * 10000)
				};

				if(parts.length > 2) {
					opts.port = parts[2];
					opts.host = parts[1];
				} else if(parts.length > 1) {
					opts.port = parts[1];
				}

				var Listener = this.listener = new WebSocket.Server(opts);

				Term.emit('echo', `Listening for connections on port: ${opts.host||'localhost'}:${opts.port}`);

				Listener.on('error', (err) => {
					Term.emit('echo', `Unable to listen for connections on port: ${opts.host||'localhost'}:${opts.port}`);
					Term.emit('echo', `Common Problem: Make sure the port is not already in use by another instance or application.`);
					Terminal.handleError(err);
					this.killListener();
				});

				Listener.on('connection', (remote) => {
					this.connections.push(new Connection(remote));
				});
			} catch(e) {
				Terminal.handleError(e);
			}

			Term.emit('commandExit');
		});
	}

	handleMessage(contents) {
		Terminal.emit('echo',
			(this.rsa.remote.username = contents.username || this.rsa.remote.username) +
			Terminal.config.promptDelim +
			origMsg
		);

/*		if(!parsed) this.showRemoteMessage(raw);

		if(parsed.hasOwnProperty('message')) {
			this.showRemoteMessage(parsed.message, parsed.username, parsed.type || "text");
		}
		if(parsed.hasOwnProperty('publicCert')) {
			this.handleHandshake(parsed);
		}*/
	}

	showRemoteMessage(msg, username, type) {
		var origMsg = msg;
		if(!this.disableDecryption) origMsg = this.rsa.local.key.decrypt(msg, 'base64', 'utf8');

		switch(type) {
			case "me":
				Terminal.emit('echo',
					'* ' +
					(this.rsa.remote.username = username || this.rsa.remote.username) +
					' ' + origMsg
				);
				break;
			case "text":
			default:
				Terminal.emit('echo',
					(this.rsa.remote.username = username || this.rsa.remote.username) +
					Terminal.config.promptDelim +
					origMsg
				);
		}
	}

	killListener() {
		if(this.listener && this.listener.close) this.listener.close();
	}
}

global.SecureChatInstance = new SecureChat();
