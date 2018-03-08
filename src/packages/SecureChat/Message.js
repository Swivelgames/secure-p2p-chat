const GroupSeparator = '\u001d';

export default class Message {
	constructor(obj, conn) {
		this.type = void 0;
		this.message = void 0;
		this.username = void 0;

		if (!conn) this.conn = obj;
		else {
			this.conn = conn;
			Object.assign(this, obj);
		}
	}

	decrypt(message) {
		this.raw = message;

		let parsed;
		try {
			parsed = JSON.parse(
				this.conn.rsa.local.key.decrypt(
					message, 'base64', 'utf8'
				)
			);
		} catch (e) {
			return;
		}

		Object.assign(this, parsed);
	}

	toString() {
		const retObj = Object
			.keys(this)
			.filter(
				v => (['type', 'conn', 'raw'].indexOf(v) > -1 ? false : !!this[v])
			)
			.reduce((r, cV) => ({
				...r,
				[cV]: this[cV]
			}), {});

		let ret = JSON.stringify(retObj);
		if (this.type !== 'SHAKE') {
			ret = this.conn.rsa.remote.cert.encrypt(ret, 'utf8', 'base64');
		}

		return [this.type.toUpperCase(), ret].join(GroupSeparator);
	}
}
