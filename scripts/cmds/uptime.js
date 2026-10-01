const os = require("os");

module.exports = {
	config: {
		name: "uptime",
		aliases: ["up", "runtime", "status"],
		version: "1.0",
		author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",
		countDown: 5,
		role: 0,
		description: {
			en: "show how long the bot has been running and its system stats"
		},
		category: "info",
		guide: {
			en: "{pn}"
		}
	},

	langs: {
		en: {
			loading: "🐊 Measuring uptime...",
			format: "╭─────────────⭓"
				+ "\n│ ⏱️ UPTIME"
				+ "\n├─────⭔"
				+ "\n│ %1"
				+ "\n│ Days: %2 | Hours: %3"
				+ "\n│ Minutes: %4 | Seconds: %5"
				+ "\n├─────⭔"
				+ "\n│ 💻 SYSTEM"
				+ "\n│ CPU: %6 (%7 cores)"
				+ "\n│ RAM: %8 / %9 (%10%)"
				+ "\n│ Platform: %11 %12"
				+ "\n│ Node: %13"
				+ "\n├─────⭔"
				+ "\n│ 🐑 Bot: %14"
				+ "\n│ 🧩 Commands: %15"
				+ "\n│ 👥 Users: %16"
				+ "\n│ 💬 Threads: %17"
				+ "\n╰─────────────⭓"
		}
	},

	onStart: async function ({ message, api, getLang, role }) {
		const startTime = (global.GoatBot && global.GoatBot.startTime) || (Date.now() - process.uptime() * 1000);
		const msg = await message.reply(getLang("loading"));

		const frames = ["▰▱▱▱▱▱▱▱▱▱", "▰▰▰▱▱▱▱▱▱▱", "▰▰▰▰▰▰▱▱▱▱", "▰▰▰▰▰▰▰▰▱▱", "▰▰▰▰▰▰▰▰▰▰"];
		const EDIT_INTERVAL = 700;
		let stopped = false;
		const canEdit = msg && msg.messageID && typeof api.editMessage == "function";
		const editSafely = async (text, messageID) => {
			try {
				await Promise.race([
					api.editMessage(text, messageID),
					new Promise((_, reject) => setTimeout(() => reject(new Error("editMessage timeout")), 8000))
				]);
				return true;
			}
			catch (err) {
				return false;
			}
		};
		const animating = canEdit
			? (async () => {
				for (const frame of frames) {
					if (stopped)
						return;
					await new Promise(resolve => setTimeout(resolve, EDIT_INTERVAL));
					if (stopped)
						return;
					const ok = await editSafely(`${getLang("loading")}\n${frame}`, msg.messageID);
					if (!ok)
						return;
				}
			})()
			: Promise.resolve();

		const uptimeMs = Date.now() - startTime;
		const totalSec = Math.floor(uptimeMs / 1000);
		const days = Math.floor(totalSec / 86400);
		const hours = Math.floor((totalSec % 86400) / 3600);
		const minutes = Math.floor((totalSec % 3600) / 60);
		const seconds = totalSec % 60;

		const cpus = os.cpus();
		const cpuModel = (cpus[0] && cpus[0].model || "Unknown").trim();
		const cores = cpus.length;

		const totalMem = os.totalmem();
		const freeMem = os.freemem();
		const usedMem = totalMem - freeMem;
		const memPercent = ((usedMem / totalMem) * 100).toFixed(1);

		const human = (bytes) => {
			const units = ["B", "KB", "MB", "GB", "TB"];
			let i = 0;
			let value = bytes;
			while (value >= 1024 && i < units.length - 1) {
				value /= 1024;
				i++;
			}
			return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
		};

		const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
		const botName = (global.GoatBot && global.GoatBot.config && global.GoatBot.config.nickNameBot) || "Goat Bot";
		const commandCount = global.GoatBot && global.GoatBot.commands ? global.GoatBot.commands.size : 0;
		const userCount = global.db && global.db.allUserData ? global.db.allUserData.length : 0;
		const threadCount = global.db && global.db.allThreadData ? global.db.allThreadData.length : 0;

		const body = getLang(
			"format",
			uptimeString, days, hours, minutes, seconds,
			cpuModel, cores,
			human(usedMem), human(totalMem), memPercent,
			os.platform(), os.arch(),
			process.version,
			botName, commandCount, userCount, threadCount
		);

		if (canEdit) {
			await Promise.race([animating, new Promise(resolve => setTimeout(resolve, frames.length * EDIT_INTERVAL + 3000))]);
			stopped = true;
			const edited = await editSafely(body, msg.messageID);
			if (edited)
				return;
		}
		return message.reply(body);
	}
};
