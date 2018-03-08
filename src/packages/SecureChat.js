import fs from 'fs';
import ursa from 'ursa';
import path from 'path';
import Client from './SecureChat/Client.js';
import Server from './SecureChat/Server.js';

export default class SecureChat {
	constructor(Terminal) {
		this.Terminal = Terminal;
		this.emit = Terminal.emit.bind(Terminal);
		this.emit('echo', 'Setting up SecureChat Package');

		this.debug = false;

		this.connections = [];
		this.handlers = {};

		this.username = Terminal.config.username || 'remote';

		this.initRSA();
		this.initHandlers();
		this.initCommands();
	}

	initRSA() {
		this.emit('echo', 'Generating RSA key-pair for secure session');

		const key = ursa.generatePrivateKey();
		const cert = ursa.createPublicKey(key.toPublicPem());

		this.secret = '';

		this.rsa = {
			local: {
				key,
				cert
			}
		};
	}

	initHandlers() {
		const { Terminal } = this;
		const dir = './SecureChat/handlers/';

		fs.readdir(path.join(__dirname, dir), (err, files) => {
			if (err) return;
			files.forEach((v) => {
				const type = v.split('.')[0].toUpperCase();
				const handler = require(path.join(__dirname, dir, v)).default;
				this.handlers[type] = handler(Terminal, this);
			});
		});
	}

	initCommands() {
		const { Terminal } = this;
		const dir = './SecureChat/commands/';

		fs.readdir(path.join(__dirname, dir), (err, files) => {
			if (err) return;
			files.forEach((v) => {
				const cmd = v.split('.')[0].toLowerCase();

				const factory = require(path.join(__dirname, dir, v)).default;
				const handler = factory(Terminal, this);

				handler.package = 'SecureChat';

				Terminal.registerCommand(cmd, handler);
			});
		});

		this.initIncludedCommands();
	}

	initIncludedCommands() {
		this.emit('echo', 'Registering commands...');

		const { Terminal } = this;

		Terminal.registerCommand('connect', (parts, raw, Term) => {
			try {
				Terminal.emit('echo', `Connecting to socket: ${parts[1]}`);

				this.client = new Client(this, parts, raw, Term);
			} catch (e) {
				Terminal.handleError(e);
			}
		}, () => `
			Usage: /connect HOST:PORT

			Connects to a currently listening SecureChat instance.
		`.trim().replace(/\t/g, ''));

		Terminal.registerCommand('listen', (parts, raw, Term) => {
			try {
				Terminal.emit('echo', 'Starting listener...');

				this.listener = new Server(this, parts, raw, Term);
			} catch (e) {
				Terminal.handleError(e);
			}

			Term.emit('commandExit');
		}, () => `
			Usage: /listen [HOST] PORT

			HOST: Optional, defaults to 'localhost'
			PORT: Port number, required if HOST is specified

			Starts listening for new connections, allowing others to connect to your discussion session.

			Currently, only one individual can connect.

			If neither HOST nor PORT is provided, PORT is randomized.
		`.trim().replace(/\t/g, ''));
	}

	handleMessage(contents) {
		const type = contents.type;

		this.handlers[type](contents);
	}

	killListener() {
		if (this.listener && this.listener.close) this.listener.close();
	}
}
