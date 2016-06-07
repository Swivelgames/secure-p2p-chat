import fs from 'fs';
import ursa from 'ursa';
import prompt from 'prompt';

// var cert = ursa.createPublicKey(fs.readFileSync('./certs/rsa.pub'));
// var key = ursa.createPrivateKey(fs.readFileSync('./certs/rsa.pem'));

var key = ursa.generatePrivateKey();
var cert = ursa.createPublicKey(key.toPublicPem());


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
