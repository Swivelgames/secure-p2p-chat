export default (Terminal, SecureChat) => ({
	cmd: () => {
		SecureChat.debug = !SecureChat.debug;
		try {
			SecureChat.connections.forEach((v) => {
				v.debug = SecureChat.debug;
			});
		} catch (e) { /* fail silently */ }
		Terminal.emit('echo', `DEBUG MODE: ${SecureChat.debug}`);
		Terminal.emit('commandExit');
	},

	man: () => `
		Usage: /debug

		Enables debug output for incoming messages.
		Currently, this command does not output debug information for local commands.

		[DEBUG MODE: ${SecureChat.debug}]
	`.trim().replace(/\t/g, '')
});
