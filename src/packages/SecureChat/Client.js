import WebSocket from 'ws';

export dedault class Client {
	constructor(SecureChat, [,host], raw, Term) {
		this.SecureChat = SecureChat;
		this.Terminal = Term;

		this.host = host;

		this.client = new WebSocket(`ws://${host}/`);

		this.initOpen();
		this.initError();
	}

	initOpen() {
		const { client, Terminal, SecureChat } = this;
		const { rsa, connections, debug } = SecureChat;

		client.on('open', () => {
			SecureChat.killListener();
			client.REMOTE_ADDRESS = host;

			let Conn = new Connection(Terminal, SecureChat, client, rsa);
			Conn.debug = debug;
			connections.push(Conn);
			Conn.sendShake();
		});
	}

	initError() {
		const { client, host, Terminal } = this;
		const { rsa, connections, debug } = SecureChat;

		client.on('error', err => {
			Terminal.emit('echo', `Unable to connect to socket: ${host}`);
			Terminal.handleError(err);
			this.killListener();
		});
	}
}
