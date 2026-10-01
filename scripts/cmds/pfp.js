const axios = require("axios");
const { getStreamFromURL, findUid } = global.utils;

module.exports = {
	config: {
		name: "pfp",
		aliases: ["profilepic", "avataruser", "getavatar"],
		version: "1.0",
		author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",
		countDown: 5,
		role: 0,
		description: {
			en: "get the profile picture of a facebook user"
		},
		category: "info",
		guide: {
			en: "{pn}: get your own profile picture"
				+ "\n   {pn} @tag: get the profile picture of tagged people"
				+ "\n   {pn} <uid | profile link>"
				+ "\n   {pn} (reply to a message)"
		}
	},

	langs: {
		en: {
			loading: "🐊 Looking up the profile picture...",
			noTarget: "❌ Please tag someone, reply to their message, or give a uid / profile link.",
			notFound: "❌ Could not find the profile picture for this user.",
			error: "❌ An error occurred:\n%1",
			caption: "🖼️ Profile picture of %1"
		}
	},

	onStart: async function ({ args, message, event, getLang, api }) {
		const mentions = Object.keys(event.mentions || {});
		let target = mentions.length
			? mentions
			: (event.type === "message_reply" ? [event.messageReply.senderID] : null)
				|| (args[0] ? [args[0]] : [event.senderID]);

		const resolved = [];
		for (const item of target) {
			if (/^\d+$/.test(item)) {
				resolved.push({ uid: item, name: event.mentions?.[item]?.replace(/@/g, "") || null });
				continue;
			}
			try {
				const uid = await findUid(item);
				resolved.push({ uid, name: null });
			}
			catch (err) {
				return message.reply(getLang("error", err.message));
			}
		}

		if (!resolved.length || resolved.some(item => !item.uid))
			return message.reply(getLang("notFound"));

		const msg = await message.reply(getLang("loading"));
		try {
			const attachments = [];
			const names = [];
			for (const item of resolved) {
				let name = item.name;
				if (!name) {
					try {
						const info = (await axios.get(`https://graph.facebook.com/${item.uid}?fields=name&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { timeout: 10000 })).data;
						name = info.name;
					}
					catch (err) { }
				}
				names.push(name || item.uid);
				const pfpUrl = `https://graph.facebook.com/${item.uid}/picture?height=1500&width=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
				attachments.push(await getStreamFromURL(pfpUrl, `pfp_${item.uid}.jpg`));
			}

			const caption = getLang("caption", names.join(", "));
			if (msg && msg.messageID && typeof api.editMessage == "function") {
				await api.editMessage(caption, msg.messageID);
				return message.send({ attachment: attachments.length === 1 ? attachments[0] : attachments });
			}
			return message.send({ body: caption, attachment: attachments.length === 1 ? attachments[0] : attachments });
		}
		catch (err) {
			if (msg && msg.messageID && typeof api.editMessage == "function")
				await api.editMessage(getLang("error", err.message), msg.messageID);
			else
				return message.reply(getLang("error", err.message));
		}
	}
};
