import readline from 'readline';
import SecureConnect from './SecureConnect.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

export default class SecureChat {
	constructor() {
		this.conn = new SecureConnect();
		this.conn.receive( this.handleMessageReceived.bind(this) );

		this.initPrompt();
	}

	requestRemoteInfo() {

	}

	initPrompt() {
		this.curInput = "";
		process.stdin.setEncoding("utf8");
		process.stdin.on('data', (data) => {
			this.curInput += data.toString('utf8');
		});

		rl.on('line', (text) => {
			this.curInput = "";
			this.conn.send(text);
			this.prompt();
		});

		this.prompt();
	}

	prompt() {
		rl.setPrompt("<you> ");
		rl.prompt();
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
