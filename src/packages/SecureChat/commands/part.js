export default (Terminal,SecureChat) => {
	class PartCommand {
		cmd() {
			try {
				SecureChat.connections.forEach( (v) => v.close() );
				SecureChat.killListener();
			} catch(e) {}
			Terminal.emit('commandExit');
		}
		man() {
			return `
				Usage: /part

				Gracefully closes the current connection
			`.trim().replace(/\t/g,"");
		}
	}

	return new PartCommand();
}
