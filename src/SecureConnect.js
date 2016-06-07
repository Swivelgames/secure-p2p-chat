import fs from 'fs';
import ursa from 'ursa';
import yargs from 'yargs';
import P2PIntent from './P2PIntent.js';

export default class SecureConnect extends P2PIntent {
	constructor() {
		super();

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
				"cert": void 0
			}
		};

		this.handshake = JSON.stringify({
			"publicCert": this.rsa.local.cert.toPublicPem('utf8')
		});

		this.cbs = [];
		this.handshakeCbs = [];
	}

	handleHandshake() {
		for(var i=0;i<this.handshakeCbs.length;i++) this.handshakeCbs[i].call(this);
	}

	handleMessage(raw, parsed) {
		if(!parsed) this.showRemoteMessage(raw);
		if(parsed.hasOwnProperty('message')) {
			this.showRemoteMessage(parsed.message);
		}
		if(parsed.hasOwnProperty('publicCert')) {
			this.rsa.remote.cert = ursa.createPublicKey(parsed.publicCert);
			this.handleHandshake();
		}
	}

	showRemoteMessage(msg) {
		var origMsg;
		if(this.argv.raw) {
			origMsg = msg;
		} else {
			origMsg = this.rsa.local.key.decrypt(msg, 'base64', 'utf8');
		}
		for(var i=0;i<this.cbs.length;i++) this.cbs[i].call(this, origMsg);
	}

	connected(cb) {
		this.handshakeCbs.push(cb);
	}

	receive(cb) {
		this.cbs.push(cb);
	}

	send(text) {
		this.client.send( JSON.stringify({
			"message": this.rsa.remote.cert.encrypt(text, 'utf8', 'base64')
		}) );
	}
}
