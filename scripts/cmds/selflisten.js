const fs = require("fs-extra");

module.exports = {
	config: {
		name: "selflisten",
		aliases: ["sl", "selflistenmode"],
		version: "1.0",
		author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",
		countDown: 5,
		role: 2,
		description: {
			en: "turn on/off selfListen so the bot also receives messages sent by itself"
		},
		category: "owner",
		guide: {
			en: "   {pn} [on | off]: turn on/off selfListen"
				+ "\n   {pn} status: show the current selfListen value"
				+ "\n   selfListen is read when the bot connects to Facebook, so restart the bot after changing it"
		}
	},

	langs: {
		en: {
			turnedOn: "✅ Turned on selfListen. Restart the bot for it to take effect.",
			turnedOff: "✅ Turned off selfListen. Restart the bot for it to take effect.",
			status: "📌 selfListen is currently %1",
			on: "on",
			off: "off"
		}
	},

	onStart: async function ({ args, message, getLang }) {
		const option = args[0] ? args[0].toLowerCase() : "";
		const optionsFca = global.GoatBot.config.optionsFca || (global.GoatBot.config.optionsFca = {});

		if (!option || option === "status" || option === "check")
			return message.reply(getLang("status", optionsFca.selfListen === true ? getLang("on") : getLang("off")));

		if (option !== "on" && option !== "off")
			return message.SyntaxError();

		const value = option === "on";
		optionsFca.selfListen = value;
		global.GoatBot.config.optionsFca.selfListen = value;
		fs.writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
		return message.reply(getLang(value ? "turnedOn" : "turnedOff"));
	}
};
