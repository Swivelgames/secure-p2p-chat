export default (Terminal) => {
	class ManCommand {
		cmd(parts, raw) {
			if(!parts[1]) {
				Terminal.emit('exec', '/man man');
			} else if(Terminal.__man.hasOwnProperty(parts[1])) {
				let page = Terminal.__man[parts[1]];
				if(typeof page === "string") Terminal.emit('echo', page);
				else if(typeof page === "function") {
					Terminal.emit('echo', page());
				}
			} else {
				if(Terminal.__handlers.hasOwnProperty(parts[1])) {
					Terminal.emit('echo', `${parts[1]} does not have any help information`);
				} else {
					Terminal.emit('echo', `man: Unknown command: ${parts[1]}`);
				}
			}
			Terminal.emit('commandExit');
		}
		man() {
			var output = '';
			output += `Usage: /man [cmd_name]`+"\n\n";
			output += "Command MAN Compatibility List:\n"
			output += "DOCS  CMD\n";
			Object.keys(Terminal.__handlers).forEach( (v) => {
				output += `[${Terminal.__man.hasOwnProperty(v) ? "x" : " "}]   ${v}`+"\t\t"+(v.package||"")+"\n";
			});
			return output;
		}
	}

	return new ManCommand();
}
