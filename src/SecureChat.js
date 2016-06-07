import readline from 'readline';
import SecureConnect from './SecureConnect.js';

var rl;

export default class SecureChat {
	constructor() {
		this.conn = new SecureConnect();
		this.conn.receive( this.handleMessageReceived.bind(this) );
		this.conn.connected( this.handleConnected.bind(this) );

		this.initReadLine();

		this.requestRemoteInfo();
	}

	initReadLine() {
		rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});
	}

	requestRemoteInfo() {
		rl.setPrompt('Remote Peer: ');
		rl.once('line', (remote) => {
			if(!remote) return;
			this.conn.expressIntent(remote, this.handleConnected.bind(this));
		});
		rl.prompt();
	}

	handleConnected() {
		rl.close();
		this.initReadLine();
		this.initPrompt();
		rl.on('line', this.handleMessageSend.bind(this));
		this.prompt();
	}

	initPrompt() {
		this.curInput = "";
		process.stdin.setEncoding("utf8");
		process.stdin.on('data', (data) => {
			this.curInput += data.toString('utf8');
		});

		this.prompt();
	}

	prompt() {
		rl.setPrompt("<you> ");
		rl.prompt();
	}

	handleMessageSend(text) {
		this.curInput = "";
		this.conn.send(text);
		this.prompt();
	}

	handleMessageReceived(msg) {
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		rl.pause();
		console.log(`<remote> ${msg}`);
		rl.resume();
		let text = "<you> "+this.curInput;
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		process.stdout.write(text);
		process.stdout.cursorTo(text.length);
	}
}
