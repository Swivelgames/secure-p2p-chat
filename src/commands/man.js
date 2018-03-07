export default (Terminal) => {
	class ManCommand {
		cmd(parts, raw) {
			if (!parts[1]) {
				Terminal.emit('exec', '/man man');
			} else if (Terminal.Commands.hasOwnProperty(parts[1]) && Terminal.Commands[parts[1]].man) {
				const page = Terminal.Commands[parts[1]].man;
				if (typeof page === 'string') Terminal.emit('echo', page);
				else if (typeof page === 'function') {
					Terminal.emit('echo', page());
				}
			} else if (Terminal.Commands.hasOwnProperty(parts[1])) {
				Terminal.emit('echo', `man: /${parts[1]} does not have any help information`);
			} else {
				Terminal.emit('echo', `man: Unknown command: ${parts[1]}`);
			}
			Terminal.emit('commandExit');
		}
		man() {
			let output = '';
			output += 'Usage: /man [cmd_name]\n\n';
			output += 'Command MAN Compatibility List:\n';
			output += 'DOCS  CMD	PKG\n';
			Object.keys(Terminal.Commands).forEach((v) => {
				const cmd = Terminal.Commands[v];
				output += `[${cmd.man ? 'x' : ' '}]   ${cmd.name}	${cmd.package}` + '\n';
			});
			return output;
		}
	}

	return new ManCommand();
};
