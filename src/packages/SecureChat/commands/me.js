export default (Terminal,SecureChat) => {
	class MeCommand {
		cmd(parts, raw) {
			let text = parts.slice(1).join(" ");
			Terminal.emit('echo', `* ${SecureChat.username} ${text}`);
			Terminal.emit('message', text, 'me');
		}
		man() {
			return `
				Usage: /me [msg]

				Displays a message as if it were stated in third person.

				Example:
				$ /me is tired
				* ${SecureChat.username} is tired
			`.trim().replace(/\t/g,"");
		}
	}

	return new MeCommand();
}
