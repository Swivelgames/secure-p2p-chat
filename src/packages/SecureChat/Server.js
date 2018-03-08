/* eslint-disable no-param-reassign */
import WebSocket from 'ws';
import Connection from './Connection.js';

export default class Server {
	constructor(SecureChat, parts, raw, Term) {
		this.SecureChat = SecureChat;
		this.Terminal = Term;
		this.emit = Term.emit.bind(Term);

		const opts = {
			port: Math.floor(Math.random() * 10000)
		};

		if (parts.length > 2) {
			opts.port = parts[2];
			opts.host = parts[1];
		} else if (parts.length > 1) {
			opts.port = parts[1];
			opts.host = '0.0.0.0';
		}

		this.options = opts;

		this.initListener();
		this.initError();
	}

	initListener() {
		const { options, Terminal, SecureChat } = this;
		const { host = 'localhost', port } = options;
		const { rsa, connections, debug } = SecureChat;

		SecureChat.killListener();

		const Listener = new WebSocket.Server(options);
		SecureChat.listener = Listener;

		this.emit('echo', `Listening for connections on port: ${host}:${port}`);

		Listener.on('connection', (remote) => {
			const {
				upgradeReq: {
					connection: {
						remoteAddress
					}
				}
			} = remote;

			remote.REMOTE_ADDRESS = remoteAddress;

			const Conn = new Connection(Terminal, SecureChat, remote, rsa);

			Conn.debug = debug;

			connections.push(Conn);
		});
	}

	initError() {
		const { SecureChat, Terminal, options } = this;
		const { host = 'localhost', port } = options;

		SecureChat.listener.on('error', (err) => {
			this.emit('echo', `Unable to listen for connections on port: ${host}:${port}`);
			this.emit('echo', 'Common Problem: Make sure the port is not already in use by another instance or application.');
			Terminal.handleError(err);
			SecureChat.killListener();
		});
	}
}
