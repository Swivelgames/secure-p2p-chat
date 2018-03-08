export default Terminal => (contents) => {
	Terminal.emit('echo',
		[contents.username, contents.message].join(Terminal.config.promptDelim)
	);
};
