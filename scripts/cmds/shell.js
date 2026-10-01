const { exec } = require("child_process");
const { removeHomeDir } = global.utils;

const MAX_OUTPUT = 3500;

module.exports = {
	config: {
		name: "shell",
		aliases: ["sh", "exec", "run"],
		version: "1.0",
		author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",
		countDown: 5,
		role: 2,
		description: {
			en: "run a shell command on the bot server"
		},
		category: "owner",
		guide: {
			en: "{pn} <command>"
		}
	},

	langs: {
		en: {
			noCommand: "Please enter a shell command to run.",
			running: "Running...",
			empty: "(no output)",
			truncated: "\n... (output truncated)"
		}
	},

	onStart: async function ({ args, message, api, getLang }) {
		const command = args.join(" ").trim();
		if (!command)
			return message.SyntaxError ? message.SyntaxError() : message.reply(getLang("noCommand"));

		const msg = await message.reply(getLang("running"));

		const result = await new Promise((resolve) => {
			exec(command, { cwd: process.cwd(), maxBuffer: 1024 * 1024 * 8 }, (err, stdout, stderr) => {
				resolve({
					err,
					stdout: stdout ? String(stdout) : "",
					stderr: stderr ? String(stderr) : ""
				});
			});
		});

		let output = (result.stdout + "\n" + result.stderr).trim();
		output = removeHomeDir(output);
		if (!output && result.err)
			output = removeHomeDir(String(result.err.message || result.err));
		if (!output)
			output = getLang("empty");

		let body = output;
		if (body.length > MAX_OUTPUT)
			body = body.slice(0, MAX_OUTPUT) + getLang("truncated");

		if (msg && msg.messageID && typeof api.editMessage == "function")
			return await api.editMessage(body, msg.messageID);
		return message.reply(body);
	}
};
