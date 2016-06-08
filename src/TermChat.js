import path from 'path';
import util from 'util';
import readline from 'readline';
import EventEmitter from 'events';
import SecureConnect from './SecureConnect.js';

export default class TermChat extends EventEmitter {
	constructor() {
		super();
	}

	setConfig(config) {
		this.config = Object.assign({
			"promptDelim": "$ ",
			"username": process.env['USER'],
			"motd": "Welcome to Terminal Chat"
		}, config);
	}

	init() {
		this.__handlers = {};

		this.initPrompt();

		this.addListener('echo', this.echo.bind(this) );
		this.addListener('command', this.handleCommand.bind(this) );

		this.initMotd();
	}

	initMotd() {
		this.emit('echo', this.config.motd);
	}

	initPrompt() {
		this.readline = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		this.curInput = "";
		process.stdin.setEncoding("utf8");
		process.stdin.on('data', (data) => {
			this.curInput += data.toString('utf8');
		});

		this.readline.setPrompt(this.config.username+this.config.promptDelim);
		this.readline.on('line', (msg) => {
			if( msg.split(/\s+/)[0].substr(0,1) === "/" ) {
				this.curInput = "";
				this.emit('command', msg.split(/\s+/), msg);
				this.once('commandExit', () => {
					this.readline.prompt(true);
					//this.redrawPrompt(true);
				});
			} else this.readline.prompt(true);
		});
		this.readline.prompt(true);
	}

	registerCommand(cmd, handler, silently) {
		this.__handlers[cmd] = handler;
		if(silently!==true) this.emit('echo', `Command Registered: ${cmd}`);
	}

	handleCommand(parts, raw) {
		let cmd = parts[0].substr(1);
		switch(cmd) {
			case "exit":
				console.log("Goodbye");
				console.log(" ");
				process.exit(0);
				break;
			case "motd":
				this.emit('echo', this.config.motd);
				break;
			case "me":
				let text = parts.slice(1).join(" ");
				this.emit('echo', `* ${this.config.username} ${text}`);
				break;
			case "import":
				try {
					require( path.join('../', parts[1]) ).default(this);
				} catch(e) {
					this.emit('echo', `Error importing ${parts[1]}`);
					this.emit('echo', e);
				}
				break;
			case "error":
				if(this.__lastError) {
					this.emit('echo', util.inspect(this.__lastError, null, false));
				}
				break;
			default:
				if(this.__handlers[cmd]) {
					try {
						this.__handlers[cmd](parts, raw, this);
					} catch(e) {
						this.emit('echo', `Error executing command: ${cmd}`);
						this.emit('echo', `(Type: /error to view stack)`);
						this.__lastError = e;
					}
					return;
				}

				this.emit('echo', `Unknown command: ${cmd}`);
		}

		this.emit('commandExit');
	}

	echo(msg) {
		this.readline.pause();
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		console.log(msg);
		this.redrawPrompt();
	}

	redrawPrompt(newLine, curInput) {
		if(newLine) console.log(" ");

		let text = this.config.username + this.config.promptDelim + this.curInput;
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		process.stdout.write(text);
		process.stdout.cursorTo(text.length);
		this.readline.resume();
	}
}
