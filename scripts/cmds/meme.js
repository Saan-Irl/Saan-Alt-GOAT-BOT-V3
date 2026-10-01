const axios = require("axios");
const { getStreamFromURL } = global.utils;

const LIST_API = "https://meme-api.com/gimme/wholesomememes";

module.exports = {
	config: {
		name: "meme",
		version: "1.0",
		author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",
		countDown: 5,
		role: 0,
		description: {
			en: "send a random meme from a public api"
		},
		category: "image",
		guide: {
			en: "{pn}\n   {pn} <subreddit>"
		}
	},

	langs: {
		en: {
			loading: "🐊 Fetching a fresh meme...",
			error: "❌ Could not fetch a meme right now:\n%1",
			caption: "😂 %1"
				+ "\n👍 %2 | 💬 %3"
		}
	},

	onStart: async function ({ args, message, getLang, api, event }) {
		const subreddit = (args[0] || "").replace(/[^a-zA-Z0-9_]/g, "");
		let data;
		try {
			const url = subreddit ? `https://meme-api.com/gimme/${subreddit}` : LIST_API;
			data = (await axios.get(url, { timeout: 15000 })).data;
			if (!data || !data.url)
				throw new Error("Empty response from meme api");
		}
		catch (err) {
			return message.reply(getLang("error", err.message));
		}

		const msg = await message.reply(getLang("loading"));
		try {
			const stream = await getStreamFromURL(data.url, `meme.${(data.url.split(".").pop() || "jpg").split("?")[0]}`);
			const caption = getLang("caption", data.title, data.ups, data.comments);
			if (msg && msg.messageID && typeof api.editMessage == "function") {
				await api.editMessage(caption, msg.messageID);
				return message.send({ attachment: stream });
			}
			return message.send({ body: caption, attachment: stream });
		}
		catch (err) {
			if (msg && msg.messageID && typeof api.editMessage == "function")
				await api.editMessage(getLang("error", err.message), msg.messageID);
			else
				return message.reply(getLang("error", err.message));
		}
	}
};
