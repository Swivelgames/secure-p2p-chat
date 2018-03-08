export default Terminal => ({
	cmd: ([, cmdName = false]) => {
		if (!cmdName) {
			Terminal.emit('exec', '/man man');
		} else if (
			cmdName in Terminal.Commands &&
			Terminal.Commands[cmdName].man
		) {
			const page = Terminal.Commands[cmdName].man;
			if (typeof page === 'string') Terminal.emit('echo', page);
			else if (typeof page === 'function') {
				Terminal.emit('echo', page());
			}
		} else if (cmdName in Terminal.Commands) {
			Terminal.emit('echo', `man: /${cmdName} does not have any help information`);
		} else {
			Terminal.emit('echo', `man: Unknown command: ${cmdName}`);
		}
		Terminal.emit('commandExit');
	},

	man: () => {
		let output = '';
		output += 'Usage: /man [cmd_name]\n\n';
		output += 'Command MAN Compatibility List:\n';
		output += 'DOCS  CMD	PKG\n';
		Object.keys(Terminal.Commands).forEach((v) => {
			const cmd = Terminal.Commands[v];
			output += `[${cmd.man ? 'x' : ' '}]   ${cmd.name}	${cmd.package} \n`;
		});
		return output;
	}
});
