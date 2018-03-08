export default (Terminal, SecureChat) => ({
	cmd: ([, newUsername]) => {
		Terminal.emit('message', `changed their username to ${newUsername}`, 'me');

		setTimeout(() => {
			SecureChat.username = newUsername;
			Terminal.config.username = newUsername;
			Terminal.redrawPrompt();
			Terminal.emit('commandExit');
		}, 100);
	},
	man: () => `
		Usage: /su [new_username]

		Use this command to change your display name.

		By default, your username is the user you're currently logged in as.
	`.trim().replace(/\t/g, '')
});
