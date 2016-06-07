import fs from 'fs';
import ursa from 'ursa';
import prompt from 'prompt';
import yargs from 'yargs';

var argv = yargs.argv, key, cert;

if(argv.t || argv.temp) {
	console.log("Using a temporary RSA keypair");
	key = ursa.generatePrivateKey();
	cert = ursa.createPublicKey(key.toPublicPem());
} else {
	console.log("Using RSA keypair in 'certs' folder");
	cert = ursa.createPublicKey(fs.readFileSync('./certs/rsa.pub'));
	key = ursa.createPrivateKey(fs.readFileSync('./certs/rsa.pem'));
}

prompt.message = "<you>";
prompt.delimiter = "";

(function startPrompt(){
	prompt.start();
	prompt.get([':'], function(err, result){
		if(err || !result || !result.hasOwnProperty(':')) return;

		var text = result[':']; //"Hello World!";
		var enc = cert.encrypt(text, 'utf8', 'base64');
		var dec = key.decrypt(enc, 'base64', 'utf8');

		console.log('[: '+enc+' :] => [$ '+dec+' $]');
		startPrompt();
	});
})();
