import os from 'os';
import fs from 'fs';

export default (Terminal) => {
	Terminal.registerCommand('cat', (parts, raw, terminal) => {
		terminal.emit('echo', fs.readFileSync(parts[1]) + os.EOL);
		terminal.emit('commandExit');
	});
};
