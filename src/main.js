import fs from 'fs';
import ursa from 'ursa';

var cert = ursa.createPublicKey(fs.readFileSync('./certs/rsa.pub'));
var key = ursa.createPrivateKey(fs.readFileSync('./certs/rsa.pem'));

var text = "Hello World!";
var enc = cert.encrypt(text, 'utf8', 'base64');
var dec = key.decrypt(enc, 'base64', 'utf8');

console.log(dec);
