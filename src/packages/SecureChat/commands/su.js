export default (Terminal, SecureChat) => {
	class SuCommand {
		cmd(parts, raw) {
			const oldUsername = Terminal.config.username;

			Terminal.emit('message', `changed their username to ${parts[1]}`, 'me');

			setTimeout(() => {
				Terminal.config.username = SecureChat.username = parts[1];
				Terminal.redrawPrompt();
				Terminal.emit('commandExit');
			}, 100);
		}
		man() {
			return `
				Usage: /su [new_username]

				Use this command to change your display name.

				By default, your username is the user you're currently logged in as.
			`.trim().replace(/\t/g, '');
		}
	}

	return new SuCommand();
};
