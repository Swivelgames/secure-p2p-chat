export default (Terminal, SecureChat) => ({
	cmd: (parts) => {
		const text = parts.slice(1).join(' ');
		Terminal.emit('echo', `* ${SecureChat.username} ${text}`);
		Terminal.emit('message', text, 'me');
	},

	man: () => `
		Usage: /me [msg]

		Displays a message as if it were stated in third person.

		Example:
		$ /me is tired
		* ${SecureChat.username} is tired
	`.trim().replace(/\t/g, '')
});
