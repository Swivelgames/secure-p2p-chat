import fs from 'fs';
import ursa from 'ursa';
import path from 'path';
import yargs from 'yargs';
import WebSocket from 'ws';
import ConnectionClass from './Securechat/Connection.js';

var Connection
const Terminal = global.Terminal;

class SecureChat {
	constructor() {
		Terminal.emit('echo', 'Setting up SecureChat Package');

		Connection = ConnectionClass(Terminal,this);

		this.init();
	}

	init() {
		this.debug = false;

		this.connections = [];
		this.handlers = {};

		this.username = Terminal.config.username || "remote";

		this.initRSA();
		this.initHandlers();
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

	initHandlers() {
		var dir = './SecureChat/handlers/';
		fs.readdir( path.join(__dirname, dir), (err, files) => {
			if(err) return;
			files.forEach( (v) => {
				var type = v.split('.')[0].toUpperCase();
				var handler = require(path.join(__dirname, dir, v)).default;
				this.handlers[type] = handler(Terminal, this);
			});
		})
	}

	initCommands() {
		var dir = './SecureChat/commands/';
		fs.readdir( path.join(__dirname, dir), (err, files) => {
			if(err) return;
			files.forEach( (v) => {
				var cmd = v.split('.')[0].toLowerCase();

				var factory = require(path.join(__dirname, dir, v)).default;
				var handler = factory(Terminal, this);

				Terminal.registerCommand(cmd, handler);
			});
		});

		this.initIncludedCommands();
	}

	initIncludedCommands() {
		Terminal.emit('echo', 'Registering commands...');

		Terminal.registerCommand('connect', (parts, raw, Term) => {
			try {
				Terminal.emit('echo', 'Connecting to socket: '+parts[1]);

				(function(client, host){
					client.on('open', () => {
						this.killListener();
						client.REMOTE_ADDRESS = host;
						let Conn = new Connection(client, this.rsa);
						Conn.debug = this.debug;
						this.connections.push(Conn);
						Conn.sendShake();
					});

					client.on('error', (err) => {
						Term.emit('echo', `Unable to connect to socket: ${host}`);
						Terminal.handleError(err);
						this.killListener();
					});
				}).call(this, new WebSocket('ws://'+parts[1]+'/'), parts[1]);
			} catch(e) {
				Terminal.handleError(e);
			}
		}, () =>`
			Usage: /connect HOST:PORT

			Connects to a currently listening SecureChat instance.
		`.trim().replace(/\t/g,""));

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
					remote.REMOTE_ADDRESS = remote.upgradeReq.connection.remoteAddress;
					let Conn = new Connection(remote, this.rsa)
					Conn.debug = this.debug;
					this.connections.push(Conn);
				});
			} catch(e) {
				Terminal.handleError(e);
			}

			Term.emit('commandExit');
		}, () =>`
			Usage: /listen [HOST] PORT

			HOST: Optional, defaults to 'localhost'
			PORT: Port number, required if HOST is specified

			Starts listening for new connections, allowing others to connect to your discussion session.

			Currently, only one individual can connect.

			If neither HOST nor PORT is provided, PORT is randomized.
		`.trim().replace(/\t/g,""));
	}

	handleMessage(contents) {
		let type = contents.type;

		this.handlers[type](contents);
	}

	killListener() {
		if(this.listener && this.listener.close) this.listener.close();
	}
}

global.SecureChatInstance = new SecureChat();
