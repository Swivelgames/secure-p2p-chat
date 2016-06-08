import TermChat from './TermChat.js';

const Terminal = new TermChat();

global.Terminal = Terminal;

Terminal.setConfig();
Terminal.init();
