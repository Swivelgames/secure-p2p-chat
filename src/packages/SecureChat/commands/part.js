export default (Terminal, SecureChat) => ({
	cmd: () => {
		try {
			SecureChat.connections.forEach(v => v.close());
			SecureChat.killListener();
		} catch (e) { /* fail silently */ }
		Terminal.emit('commandExit');
	},

	man: () => `
		Usage: /part

		Gracefully closes the current connection
	`.trim().replace(/\t/g, '')
});
