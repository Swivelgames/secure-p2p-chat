import fs from 'fs';
import ursa from 'ursa';
import yargs from 'yargs';

export default class SecureConnect {
	constructor() {
		var argv = this.argv = yargs.argv, key, cert;

		if(argv.t || argv.temp) {
			console.log("Using a temporary RSA keypair");
			key = ursa.generatePrivateKey();
			cert = ursa.createPublicKey(key.toPublicPem());
		} else {
			console.log("Using RSA keypair in 'certs' folder");
			key = ursa.createPrivateKey(fs.readFileSync('./certs/rsa.pem'));
			cert = ursa.createPublicKey(fs.readFileSync('./certs/rsa.pub'));
		}

		this.rsa = {
			"local": {
				"key": key,
				"cert": cert
			},
			"remote": {
				"cert": cert
			}
		};

		this.cbs = [];

		this.listen();
	}

	listen() { console.log("Waiting for remote connection..."); }
	connect(rmt) { console.log("Connecting to remote: "+rmt); }

	handleMessage(msg) {
		var origMsg = this.rsa.local.key.decrypt(msg, 'base64', 'utf8');
		for(var i=0;i<this.cbs.length;i++) this.cbs[i].call(this, origMsg);
	}

	receive(cb) {
		this.cbs.push(cb);
	}

	send(text) {
		this.handleMessage(this.rsa.remote.cert.encrypt(text, 'utf8', 'base64'));
	}
}
