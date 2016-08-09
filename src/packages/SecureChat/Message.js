const GroupSeparator = "\u001d";

export default class Message {
	constructor(obj, conn) {
		this.type = void 0;
		this.message = void 0;
		this.username = void 0;

		if(!conn) this.conn = obj;
		else {
			this.conn = conn;
			Object.assign(this, obj);
		}
	}

	decrypt(message) {
		this.raw = message;

		var parsed;
		try {
			parsed = JSON.parse(
				this.conn.rsa.local.key.decrypt(
					message, 'base64', 'utf8'
				)
			);
		} catch(e) {
			return e;
		}

		Object.assign(this, parsed);
	}

	toString() {
		var ret = {};
		Object.keys(this).filter(
			v => ["type","conn","raw"].indexOf(v) > -1 ? false : !!this[v]
		).forEach(
			v => ret[v] = this[v]
		);

		ret = JSON.stringify(ret);
		if(this.type!=="SHAKE") {
			ret = this.conn.rsa.remote.cert.encrypt(ret, 'utf8', 'base64');
		}

		return [this.type.toUpperCase(), ret].join(GroupSeparator);
	}
}
