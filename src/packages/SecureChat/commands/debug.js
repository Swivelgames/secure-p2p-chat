export default (Terminal,SecureChat) => {
	class DebugCommand {
		cmd() {
			SecureChat.debug = !SecureChat.debug;
			try {
				SecureChat.connections.forEach( (v) => v.debug = SecureChat.debug );
			} catch(e) {}
			Terminal.emit('echo', `DEBUG MODE: ${SecureChat.debug}`);
			Terminal.emit('commandExit');
		}
		man() {
			return `
				Usage: /debug

				Enables debug output for incoming messages.
				Currently, this command does not output debug information for local commands.

				[DEBUG MODE: ${SecureChat.debug}]
			`.trim().replace(/\t/g,"");
		}
	}

	return new DebugCommand();
}
