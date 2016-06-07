import WebSocket from 'ws';

export default class P2PIntent {
	constructor(port, handshake) {
		this.port = port || Math.floor(Math.random() * 10000);
		this.handshake = handshake || "hello";
		this.listenForIntent();
	}

	listenForIntent() {
		var that = this,
			Listener = this.listener = new WebSocket.Server({ port: this.port });

		Listener.on('connection', (remote) => {
			this.client = remote;

			this.connectionEstablished();

			this.client.send(this.handshake);
		});

		console.log("Listening on port: "+(this.port));
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
			process.stdout.clearLine();
			process.stdout.cursorTo(0);
			console.log("Connection Closed: Peer Disconnected");
			process.exit(0);
		})
	}

	handleMessage(raw, parsed) {
		console.log("received: " + raw);
	}

	expressIntent(remote, connected) {
		if(!remote) return;

		var that = this,
		Clnt = this.client = new WebSocket('ws://'+remote+'/');

		Clnt.on('open', () => {
			this.listener.close();
			this.client.send(this.handshake);
			connected();
		});

		this.connectionEstablished();
	}
}
