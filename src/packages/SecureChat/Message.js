const GroupSeparator = "\u001d";

export default class Message {
	constructor(obj, conn) {
		this.type = void 0;
		this.message = void 0;
		this.username = void 0;

		if(!conn) this.conn = obj;
		else {
			Object.assign(this, obj);
		}
	}

	encrypt() {
		return this.conn.remote.cert.encrypt(this.toString(), 'utf8', 'base64');
	}

	decrypt(message) {
		this.raw = message;

		var parsed;
		try {
			parsed = JSON.parse(
				this.conn.local.key.decrypt(
					message, 'base64', 'utf8'
				)
			);
		} catch(e) {
			return;
		};

		Object.assign(this, parsed);
	}

	toString() {
		var ret = {};
		Object.keys(this).filter(
			v => !!this[v] || !(v==="type") || !(v==="conn")
		).forEach(
			v => ret[v] = this[v]
		);

		ret = JSON.stringify(ret);
		if(this.type!=="SHAKE" || this.type!=="HELO") {
			ret = this.conn.remote.cert.encrypt(ret, 'utf8', 'base64');
		}

		return [this.type.toUpperCase(), ret].join(GroupSeparator);
	}
}
