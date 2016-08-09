export default (Terminal, SecureChat) => {
	return (contents) => {
		Terminal.emit('echo', `* ${contents.username} ${contents.message}`);
	}
}
