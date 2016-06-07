import fs from 'fs';
import ursa from 'ursa';
import prompt from 'prompt';
import yargs from 'yargs';
import readline from 'readline';

import util from 'util';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

export default class SecureChat {
	constructor() {
		var argv = this.argv = yargs.argv, key, cert;

		if(argv.t || argv.temp) {
			console.log("Using a temporary RSA keypair");
			key = ursa.generatePrivateKey();
			cert = ursa.createPublicKey(key.toPublicPem());
		} else {
			console.log("Using RSA keypair in 'certs' folder");
			cert = ursa.createPublicKey(fs.readFileSync('./certs/rsa.pub'));
			key = ursa.createPrivateKey(fs.readFileSync('./certs/rsa.pem'));
		}

		this.rsa = {
			"local": {
				"key": key,
				"cert": cert
			},
			"remote": {
				"cert": void 0
			}
		};

		this.curInput = "";
		process.stdin.setEncoding("utf8");
		process.stdin.on('data', (data) => {
			this.curInput += data.toString('utf8');
		});

		rl.on('line', (text) => {
			this.curInput = "";
			var localRSA = this.rsa.local;
			var enc = localRSA.cert.encrypt(text, 'utf8', 'base64');
			var dec = localRSA.key.decrypt(enc, 'base64', 'utf8');

			console.log(`<remote> ${dec}`);

			this.requestMessage();
		});

		this.requestMessage();
	}

	requestRemoteInfo() {

	}

	handleMessageReceived(msg) {
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		rl.pause();
		console.log("<remote> Hey, how's it going?");
		rl.resume();
		let text = "<you> "+this.curInput;
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		process.stdout.write(text);
		process.stdout.cursorTo(text.length);
	}

	requestMessage() {
		rl.setPrompt("<you> ");
		rl.prompt();

		setTimeout( () => this.handleMessageReceived() , 1000 );
	}
}
