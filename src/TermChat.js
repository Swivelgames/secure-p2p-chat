import os from 'os';
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import util from 'util';
import http from 'http';
import https from 'https';
import readline from 'readline';
import EventEmitter from 'events';

export default class TermChat extends EventEmitter {
	constructor(config) {
		super();
		if(config) {
			this.setConfig(config);
			this.init();
		}
	}

	setConfig(config) {
		this.config = Object.assign({
			"promptDelim": "$ ",
			"username": process.env['USER'],
			"motd": "Welcome to Terminal Chat",
			"verbose": false
		}, config);
	}

	init() {
		this.initVerbose();

		this.__handlers = {};
		this.__man = {};

		this.initPackages();

		this.initPrompt();

		this.addListener('echo', this.echo.bind(this) );
		this.addListener('command', this.handleCommand.bind(this) );

		this.initMotd();
	}

	initVerbose() {
		if(!this.config.verbose) {
			this.emit = EventEmitter.prototype.emit.bind(this);
			return;
		}

		this.emit = (function() {
			this.echo(`[${arguments[0]}] ${arguments[1]}`, true);
			return EventEmitter.prototype.emit.apply(this,arguments);
		}).bind(this);
	}

	initMotd() {
		this.emit('echo', this.config.motd);
	}

	initPackages() {
		fs.readdir( path.join(__dirname, './packages/'), (err, files) => {
			if(err) return;
			files.forEach( (v) => {
				this.localImport( path.join(__dirname, './packages/', v) );
			});
		})
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

		this.readline.on('line', (msg) => {
			if( msg.split(/\s+/)[0].substr(0,1) === "/" ) {
				this.curInput = "";
				this.emit('command', msg.split(/\s+/), msg);
				this.once('commandExit', () => {
					this.prompt();
				});
			} else {
				this.emit('message', msg);
				this.prompt();
			}
		});
		this.prompt();
	}

	prompt() {
		this.curInput = "";
		this.readline.setPrompt(this.config.username+this.config.promptDelim);
		this.readline.prompt(true);
	}

	registerCommand(cmd, handler, man) {
		if(cmd.length && typeof cmd === "object") {
			for(var i=0;i<cmd.length;i++) {
				this.registerCommand(cmd[i], handler, man);
			}
			return;
		}

		if(typeof handler !== "function") {
			this.__man[cmd] = handler.man;
			this.__handlers[cmd] = handler.cmd;
			return;
		} else if(man) {
			this.__man[cmd] = man;
		}

		this.__handlers[cmd] = handler;
	}

	handleCommand(parts, raw) {
		let cmd = parts[0].substr(1);
		switch(cmd) {
			case "man":
			case "help":
				if(!parts[1]) {
					this.emit('echo',`Usage: /${cmd.toLowerCase()} [cmd_name]`+"\n");
					this.emit('echo', "Commands:");
					Object.keys(this.__handlers).forEach( (v) => {
						this.emit('echo',` - ${v} ${this.__man.hasOwnProperty(v) ? "" : "(no docs)"}`);
					});
				} else if(this.__man.hasOwnProperty(parts[1])) {
					let page = this.__man[parts[1]];
					if(typeof page === "string") this.emit('echo', page);
					else if(typeof page === "function") {
						this.emit('echo', page());
					}
				} else {
					if(this.__handlers.hasOwnProperty(parts[1])) {
						this.emit('echo', `${parts[1]} does not have any help information`);
					} else {
						this.emit('echo', `${cmd.toUpperCase()}: Unknown command: ${parts[1]}`);
					}
				}
				break;
			case "ls":
				this.emit('echo', [
					"man", "ls", "verbose", "exit", "motd", "import", "error"
				].concat(Object.keys(this.__handlers)).join("    "));
				break;
			case "verbose":
				this.emit('echo', 'Toggling verbose (e.g., "echo" all emits)');
				this.emit('echo', `this.config.verbose = ${!this.config.verbose}`);
				this.config.verbose = !this.config.verbose;
				this.initVerbose();
				break;
			case "exit":
				console.log("Goodbye");
				console.log(" ");
				process.exit(0);
				break;
			case "motd":
				this.emit('echo', this.config.motd);
				break;
			case "import":
				var importLoc = path.join(__dirname, '../', parts[1]);

				var fileExists = false;
				try {
					fileExists = fs.statSync(importLoc).isFile();
				} catch(e) {}

				if(fileExists) {
					this.localImport(importLoc);
				} else {
					this.remoteImport(parts[1]);
				}
				return;
				break;
			case "error":
				if(this.__lastError) {
					this.emit('echo', this.__lastError);
					this.emit('echo', this.__lastError.message);
					this.emit('echo', this.__lastError.stack);
				}
				break;
			default:
				if(this.__handlers[cmd]) {
					try {
						this.__handlers[cmd](parts, raw, this);
					} catch(e) {
						this.handleError(e);
					}
					return;
				}

				this.emit('echo', `Unknown command: ${cmd}`);
		}

		this.emit('commandExit');
	}

	handleError(e) {
		this.emit('echo', `Error: (Type: /error to view stack)`);
		this.__lastError = e;
		this.emit('commandExit');
	}

	echo(msg, forceEcho) {
		if(this.config.verbose && !forceEcho) return;

		this.readline.pause();
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		console.log(msg);
		this.redrawPrompt();
	}

	redrawPrompt(newLine, curInput) {
		if(newLine) console.log(" ");
		if(!curInput) {
			if(this.curInput) curInput = this.curInput;
			else curInput = " ";
		}

		let promptText = this.config.username + this.config.promptDelim;
		this.readline.setPrompt(promptText);
		let text = promptText + curInput;
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		process.stdout.write(text);
		process.stdout.cursorTo( (text.length) - 1 );
		this.readline.resume();
	}

	localImport(importLoc) {
		try {
			require(importLoc);
		} catch(e) {
			this.handleError(e);
		} finally {
			Terminal.emit('commandExit');
		}
	}

	remoteImport(importLoc) {
		var getter;
		if(importLoc.indexOf('https:') > -1) {
			getter = https;
		} else {
			getter = http;
		}

		try {
			this.emit('echo', `Importing ${importLoc}`);
			getter.get(importLoc, (res) => {
				var progress = '/';
				var data = '';

				res.setEncoding('utf8');

				res.on('data', (chunk) => {
					data+=chunk;
					process.stdout.cursorTo(0);
					process.stdout.clearLine();
					process.stdout.write("Importing [" + (progress=(
						progress === "/" ? "|" :
						progress === "|" ? "\\" :
						progress === "\\" ? "-" : "/"
					)) + "]");
				});

				res.on('end', () => {
					this.emit('echo', `Initializing and Contextualizing...`);

					try {
						eval(data);
					} catch(e) {
						this.handleError(e);
					}

					this.emit('commandExit');
				});
			});
		} catch(e) {
			this.handleError(e);
		}
	}
}
