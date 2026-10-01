const fs = require("fs-extra");
const path = require("path");
const { Store } = require("express-session");

const SESSION_DIR = path.join(__dirname, "..", "..", "database", "data", "sessions");

class FileStore extends Store {
	constructor(options = {}) {
		super(options);
		this.ttl = options.ttl || 1000 * 60 * 60 * 24 * 7;
		this.dir = options.dir || SESSION_DIR;
		this.cleanupInterval = setInterval(() => this.reap(), 1000 * 60 * 60).unref();
		fs.ensureDirSync(this.dir);
	}

	filePath(sid) {
		return path.join(this.dir, `${encodeURIComponent(sid)}.json`);
	}

	read(sid) {
		try {
			const file = this.filePath(sid);
			if (!fs.existsSync(file))
				return null;
			const data = JSON.parse(fs.readFileSync(file, "utf8"));
			const expires = data?.cookie?.expires;
			if (expires && new Date(expires).getTime() < Date.now()) {
				fs.removeSync(file);
				return null;
			}
			return data;
		}
		catch (err) {
			return null;
		}
	}

	get(sid, callback) {
		try {
			callback(null, this.read(sid));
		}
		catch (err) {
			callback(err);
		}
	}

	set(sid, session, callback) {
		try {
			fs.outputFileSync(this.filePath(sid), JSON.stringify(session));
			callback && callback(null);
		}
		catch (err) {
			callback && callback(err);
		}
	}

	touch(sid, session, callback) {
		this.set(sid, session, callback);
	}

	destroy(sid, callback) {
		try {
			fs.removeSync(this.filePath(sid));
			callback && callback(null);
		}
		catch (err) {
			callback && callback(err);
		}
	}

	all(callback) {
		try {
			const sessions = fs.readdirSync(this.dir)
				.filter(name => name.endsWith(".json"))
				.map(name => {
					try {
						return JSON.parse(fs.readFileSync(path.join(this.dir, name), "utf8"));
					}
					catch (err) {
						return null;
					}
				})
				.filter(Boolean);
			callback(null, sessions);
		}
		catch (err) {
			callback(err);
		}
	}

	length(callback) {
		try {
			callback(null, fs.readdirSync(this.dir).filter(name => name.endsWith(".json")).length);
		}
		catch (err) {
			callback(err);
		}
	}

	clear(callback) {
		try {
			fs.emptyDirSync(this.dir);
			callback && callback(null);
		}
		catch (err) {
			callback && callback(err);
		}
	}

	reap() {
		try {
			const now = Date.now();
			for (const name of fs.readdirSync(this.dir)) {
				if (!name.endsWith(".json"))
					continue;
				const file = path.join(this.dir, name);
				try {
					const data = JSON.parse(fs.readFileSync(file, "utf8"));
					const expires = data?.cookie?.expires;
					if (expires && new Date(expires).getTime() < now)
						fs.removeSync(file);
				}
				catch (err) {
					fs.removeSync(file);
				}
			}
		}
		catch (err) { }
	}
}

module.exports = FileStore;
