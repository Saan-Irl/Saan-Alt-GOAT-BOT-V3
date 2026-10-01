const fs = require("fs-extra");

module.exports = {
	config: {
		name: "whitelist",
		aliases: ["wl", "whitelistmode"],
		version: "1.0",
		author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",
		countDown: 5,
		role: 2,
		description: {
			en: "manage the user and thread whitelist and turn whitelist-mode on/off"
		},
		category: "owner",
		guide: {
			en: "   {pn} [on | off]: turn user whitelist mode on/off"
				+ "\n   {pn} thread [on | off]: turn thread whitelist mode on/off"
				+ "\n   {pn} add <uid | @tag | reply>: add user(s) to the whitelist (defaults to the sender)"
				+ "\n   {pn} remove <uid | @tag | reply>: remove user(s) from the whitelist"
				+ "\n   {pn} addthread [threadID]: add a thread to the whitelist (defaults to this chat)"
				+ "\n   {pn} removethread [threadID]: remove a thread from the whitelist"
				+ "\n   {pn} list: show the user whitelist"
				+ "\n   {pn} listthread: show the thread whitelist"
		}
	},

	langs: {
		en: {
			turnedOn: "✅ Turned on user whitelist mode",
			turnedOff: "✅ Turned off user whitelist mode",
			threadTurnedOn: "✅ Turned on thread whitelist mode",
			threadTurnedOff: "✅ Turned off thread whitelist mode",
			added: "✅ Added %1 to the whitelist:\n%2",
			alreadyAdded: "\n⚠️ %1 already in the whitelist:\n%2",
			removed: "✅ Removed %1 from the whitelist:\n%2",
			notInList: "\n⚠️ %1 not in the whitelist:\n%2",
			missingIdAdd: "⚠️ Please enter a uid, tag a user, or reply to a message to add",
			missingIdRemove: "⚠️ Please enter a uid, tag a user, or reply to a message to remove",
			listUser: "📑 User whitelist (%1):\n%2",
			listThread: "📑 Thread whitelist (%1):\n%2",
			empty: "  (empty)",
			on: "on",
			off: "off"
		}
	},

	onStart: async function ({ args, message, event, usersData, threadsData, getLang }) {
		const config = global.GoatBot.config;
		const userMode = config.whiteListMode || (config.whiteListMode = { enable: false, whiteListIds: [] });
		const threadMode = config.whiteListModeThread || (config.whiteListModeThread = { enable: false, whiteListThreadIds: [] });
		if (!Array.isArray(userMode.whiteListIds))
			userMode.whiteListIds = [];
		if (!Array.isArray(threadMode.whiteListThreadIds))
			threadMode.whiteListThreadIds = [];

		const action = (args[0] || "").toLowerCase();
		const command = action;
		const rest = args.slice(1);

		const save = () => fs.writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));

		const collectUids = () => {
			if (event.mentions && Object.keys(event.mentions).length > 0)
				return Object.keys(event.mentions);
			if (event.messageReply)
				return [event.messageReply.senderID];
			return rest.filter(arg => /^\d+$/.test(arg));
		};

		if (action === "thread") {
			const sub = (rest[0] || "").toLowerCase();
			if (sub !== "on" && sub !== "off")
				return message.SyntaxError();
			threadMode.enable = sub === "on";
			save();
			return message.reply(getLang(threadMode.enable ? "threadTurnedOn" : "threadTurnedOff"));
		}

		switch (command) {
			case "":
			case "status":
				return message.reply(
					getLang("listUser", userMode.enable ? getLang("on") : getLang("off"),
						userMode.whiteListIds.length ? userMode.whiteListIds.map(uid => `• ${uid}`).join("\n") : getLang("empty"))
					+ "\n" + getLang("listThread", threadMode.enable ? getLang("on") : getLang("off"),
						threadMode.whiteListThreadIds.length ? threadMode.whiteListThreadIds.map(tid => `• ${tid}`).join("\n") : getLang("empty"))
				);
			case "on":
				userMode.enable = true;
				save();
				return message.reply(getLang("turnedOn"));
			case "off":
				userMode.enable = false;
				save();
				return message.reply(getLang("turnedOff"));
			case "thread": {
				return message.SyntaxError();
			}
			case "add": {
				const uids = collectUids();
				if (uids.length === 0)
					return message.reply(getLang("missingIdAdd"));
				const added = [];
				const existed = [];
				for (const uid of uids) {
					if (userMode.whiteListIds.includes(uid))
						existed.push(uid);
					else {
						userMode.whiteListIds.push(uid);
						added.push(uid);
					}
				}
				save();
				const nameOf = async uid => {
					const name = await usersData.getName(uid).catch(() => uid);
					return `• ${name} (${uid})`;
				};
				return message.reply(
					(added.length ? getLang("added", added.length, (await Promise.all(added.map(nameOf))).join("\n")) : "")
					+ (existed.length ? getLang("alreadyAdded", existed.length, (await Promise.all(existed.map(nameOf))).join("\n")) : "")
				);
			}
			case "remove":
			case "rm":
			case "del": {
				const uids = collectUids();
				if (uids.length === 0)
					return message.reply(getLang("missingIdRemove"));
				const removed = [];
				const missing = [];
				for (const uid of uids) {
					if (userMode.whiteListIds.includes(uid)) {
						userMode.whiteListIds.splice(userMode.whiteListIds.indexOf(uid), 1);
						removed.push(uid);
					}
					else
						missing.push(uid);
				}
				save();
				return message.reply(
					(removed.length ? getLang("removed", removed.length, removed.map(uid => `• ${uid}`).join("\n")) : "")
					+ (missing.length ? getLang("notInList", missing.length, missing.map(uid => `• ${uid}`).join("\n")) : "")
				);
			}
			case "addthread":
			case "addt": {
				const tid = rest.find(arg => /^\d+$/.test(arg)) || event.threadID;
				if (threadMode.whiteListThreadIds.includes(tid))
					return message.reply(getLang("alreadyAdded", 1, `• ${tid}`));
				threadMode.whiteListThreadIds.push(tid);
				save();
				return message.reply(getLang("added", 1, `• ${tid}`));
			}
			case "removethread":
			case "removet":
			case "delthread": {
				const tid = rest.find(arg => /^\d+$/.test(arg)) || event.threadID;
				if (!threadMode.whiteListThreadIds.includes(tid))
					return message.reply(getLang("notInList", 1, `• ${tid}`));
				threadMode.whiteListThreadIds.splice(threadMode.whiteListThreadIds.indexOf(tid), 1);
				save();
				return message.reply(getLang("removed", 1, `• ${tid}`));
			}
			case "list":
			case "-l": {
				if (userMode.whiteListIds.length === 0)
					return message.reply(getLang("listUser", userMode.enable ? getLang("on") : getLang("off"), getLang("empty")));
				const names = await Promise.all(userMode.whiteListIds.map(async uid => {
					const name = await usersData.getName(uid).catch(() => uid);
					return `• ${name} (${uid})`;
				}));
				return message.reply(getLang("listUser", userMode.enable ? getLang("on") : getLang("off"), names.join("\n")));
			}
			case "listthread":
			case "listt": {
				if (threadMode.whiteListThreadIds.length === 0)
					return message.reply(getLang("listThread", threadMode.enable ? getLang("on") : getLang("off"), getLang("empty")));
				const names = await Promise.all(threadMode.whiteListThreadIds.map(async tid => {
					const name = await threadsData.get(tid, "threadName").catch(() => null);
					return `• ${name || "Unnamed"} (${tid})`;
				}));
				return message.reply(getLang("listThread", threadMode.enable ? getLang("on") : getLang("off"), names.join("\n")));
			}
			default:
				return message.SyntaxError();
		}
	}
};
