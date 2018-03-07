/* eslint-disable no-console */

import fs from 'fs';
import vm from 'vm';
import path from 'path';
import http from 'http';
import https from 'https';
import readline from 'readline';
import EventEmitter from 'events';

export default class TermChat extends EventEmitter {
	constructor(config) {
		super();
		if (config) {
			this.setConfig(config);
			this.init();
		}
	}

	setConfig(config) {
		this.config = Object.assign({
			promptDelim: '$ ',
			username: process.env.USER,
			motd: 'Welcome to Terminal Chat',
			verbose: false
		}, config);
	}

	init() {
		this.initVerbose();

		this.Commands = {};

		this.initCommands();
		this.initPackages();

		this.initPrompt();

		this.addListener('echo', this.echo.bind(this));
		this.addListener('command', this.handleCommand.bind(this));
		this.addListener('exec', (cmd) => {
			this.emit('command', cmd.split(/\s+/), cmd);
		});

		this.initMotd();
	}

	initVerbose() {
		if (!this.config.verbose) {
			this.emit = EventEmitter.prototype.emit.bind(this);
			return;
		}

		this.emit = (...args) => {
			this.echo(`[${args[0]}] ${args[1]}`, true);
			return EventEmitter.prototype.emit.apply(this, args);
		};
	}

	initMotd() {
		this.emit('echo', this.config.motd);
	}

	initCommands() {
		const dir = './commands/';
		fs.readdir(path.join(__dirname, dir), (err, files) => {
			if (err) return;
			files.forEach((v) => {
				const cmd = v.split('.')[0].toLowerCase();

				const factory = require(path.join(__dirname, dir, v)).default;
				const handler = factory(this);

				handler.package = 'CORE';

				this.registerCommand(cmd, handler);
			});
		});
	}

	initPackages() {
		fs.readdir(path.join(__dirname, './packages/'), (err, files) => {
			if (err) return;
			files.forEach((v) => {
				this.localImport(path.join(__dirname, './packages/', v));
			});
		});
	}

	initPrompt() {
		this.readline = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		this.curInput = '';
		process.stdin.setEncoding('utf8');
		process.stdin.on('data', (data) => {
			this.curInput += data.toString('utf8');
		});

		this.readline.on('line', (msg) => {
			if (msg.split(/\s+/)[0].substr(0, 1) === '/') {
				this.curInput = '';
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
		this.curInput = '';
		this.readline.setPrompt(this.config.username + this.config.promptDelim);
		this.readline.prompt(true);
	}

	registerCommand(cmd, handler, man) {
		if (cmd.length && typeof cmd === 'object') {
			for (let i = 0; i < cmd.length; i += 1) {
				this.registerCommand(cmd[i], handler, man);
			}
			return;
		}

		if (typeof handler !== 'function') {
			const { name = cmd } = handler;
			this.Commands[cmd] = {
				...handler, name
			};
			return;
		}

		this.Commands[cmd] = {
			name: cmd,
			package: '',
			cmd: handler,
			man
		};
	}

	handleCommand(parts, raw) {
		const cmd = parts[0].substr(1);
		switch (cmd) {
			case 'ls':
				this.emit('echo', [
					'man', 'ls', 'verbose', 'exit', 'motd', 'import', 'error'
				].concat(Object.keys(this.Commands)).join('    '));
				break;
			case 'verbose':
				this.emit('echo', 'Toggling verbose (e.g., "echo" all emits)');
				this.emit('echo', `this.config.verbose = ${!this.config.verbose}`);
				this.config.verbose = !this.config.verbose;
				this.initVerbose();
				break;
			case 'exit':
				this.emit('echo', 'Goodbye');
				this.emit('echo', ' ');
				process.exit(0);
				break;
			case 'motd':
				this.emit('echo', this.config.motd);
				break;
			case 'import':
				this.import(parts, raw);
				return;
			case 'error':
				if (this.__lastError) {
					this.emit('echo', this.__lastError);
					this.emit('echo', this.__lastError.message);
					this.emit('echo', this.__lastError.stack);
				}
				break;
			default:
				if (Object.getOwnPropertyNames(
					this.Commands
				).indexOf(cmd) > -1) {
					try {
						this.Commands[cmd].cmd(parts, raw, this);
					} catch (e) {
						this.handleError(e);
					}
					return;
				}

				this.emit('echo', `Unknown command: ${cmd}`);
		}

		this.emit('commandExit');
	}

	handleError(e) {
		this.emit('echo', 'Error: (Type: /error to view stack)');
		this.__lastError = e;
		this.emit('commandExit');
	}

	echo(msg, forceEcho) {
		if (this.config.verbose && !forceEcho) return;

		this.readline.pause();
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		console.log(msg);
		this.redrawPrompt();
	}

	redrawPrompt(newLine, curInput) {
		if (newLine) console.log(' ');
		const input = curInput || this.curInput || ' ';

		const promptText = this.config.username + this.config.promptDelim;

		this.readline.setPrompt(promptText);

		const text = `${promptText}${input}`;

		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		process.stdout.write(text);
		process.stdout.cursorTo((text.length) - 1);

		this.readline.resume();
	}

	use(Middleware) {
		try {
			// console.log(JSON.stringify({
			// 	Middleware,
			// 	construct: typeof Middleware,
			// 	name: Middleware.constructor.name,
			// 	typeof: typeof Middleware.constructor
			// }, null, '\t'));

			if (Middleware && Middleware.constructor && typeof Middleware.constructor === 'function') {
				return new Middleware(this);
			}
			return Middleware(this);
		} catch (e) {
			this.handleError(e);
		} finally {
			this.emit('commandExit');
		}
		return null;
	}

	import([, addr]) {
		const importLoc = path.join(__dirname, '../', addr);

		let fileExists = false;
		try {
			fileExists = fs.statSync(importLoc).isFile();
		} catch (e) { /* fail silently */ }

		if (fileExists) {
			this.localImport(importLoc);
		} else {
			this.remoteImport(addr);
		}
	}

	localImport(importLoc) {
		this.use(require(importLoc));
	}

	remoteImport(importLoc) {
		let getter;
		if (importLoc.indexOf('https:') > -1) {
			getter = https;
		} else {
			getter = http;
		}

		try {
			this.emit('echo', `Importing ${importLoc}`);
			getter.get(importLoc, (res) => {
				let progress = '/';
				let data = '';

				res.setEncoding('utf8');

				res.on('data', (chunk) => {
					/* eslint-disable no-nested-ternary */
					data += chunk;
					process.stdout.cursorTo(0);
					process.stdout.clearLine();
					process.stdout.write(`Importing [${progress = (
						progress === '/' ? '|' :
							progress === '|' ? '\\' :
								progress === '\\' ? '-' : '/'
					)}]`);
					/* eslint-enable no-nested-ternary */
				});

				res.on('end', () => {
					this.emit('echo', 'Initializing and Contextualizing...');

					try {
						this.emit('echo', 'Reading resource package file');

						const opts = {
							filename: path.join(
								path.resolve(__dirname), Buffer.from(`${importLoc}`, 'utf8').toString('base64')
							),
							displayErrors: true
						};

						this.emit('echo', 'Executed script in new context');

						const Module = vm.runInThisContext(data, opts);

						this.use(Module);
					} catch (e) {
						this.handleError(e);
					}

					this.emit('commandExit');
				});
			});
		} catch (e) {
			this.handleError(e);
		}
	}
}
