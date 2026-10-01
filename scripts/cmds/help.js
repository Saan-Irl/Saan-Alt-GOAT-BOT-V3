const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");
const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;
const doNotDelete = "[ 🐐 | Goat Bot V2 ]";
/**
* @author NTKhang
* @author: do not delete it
* @message if you delete or edit it you will get a global ban
*/

module.exports = {
	config: {
		name: "help",
		version: "1.21",
		author: "NTKhang",
		countDown: 5,
		role: 0,
		description: {
			vi: "Xem cách sử dụng của các lệnh",
			en: "View command usage"
		},
		category: "info",
		guide: {
			vi: "   {pn}: hiển thị tất cả lệnh theo danh mục"
				+ "\n   {pn} <tên lệnh> [-u | usage | -g | guide]: chỉ hiển thị phần hướng dẫn sử dụng lệnh"
				+ "\n   {pn} <tên lệnh> [-i | info]: chỉ hiển thị phần thông tin về lệnh"
				+ "\n   {pn} <tên lệnh> [-r | role]: chỉ hiển thị phần quyền hạn của lệnh"
				+ "\n   {pn} <tên lệnh> [-a | alias]: chỉ hiển thị phần tên viết tắt của lệnh",
			en: "{pn}: show every command grouped by category"
				+ "\n   {pn} <command name> [-u | usage | -g | guide]: only show command usage"
				+ "\n   {pn} <command name> [-i | info]: only show command info"
				+ "\n   {pn} <command name> [-r | role]: only show command role"
				+ "\n   {pn} <command name> [-a | alias]: only show command alias"
		},
		priority: 1
	},

	langs: {
		vi: {
			header: "☠️ %1 ☠️",
			summary: "%1 lệnh trong %2 danh mục",
			categoryHeader: "╭─『 %1 』",
			categoryFooter: "╰───────────────♢",
			commandLine: "│ %1",
			joiner: " • ",
			noCommands: "Không có lệnh nào trong danh mục này",
			tip: "Gõ %1help <tên lệnh> để xem chi tiết",
			total: "Total Commands: %1",
			footerTip: "Type: %1help <command> for details",
			commandNotFound: "Lệnh \"%1\" không tồn tại",
			getInfoCommand: "╭── NAME ────⭓"
				+ "\n│ %1"
				+ "\n├── INFO"
				+ "\n│ Mô tả: %2"
				+ "\n│ Các tên gọi khác: %3"
				+ "\n│ Các tên gọi khác trong nhóm bạn: %4"
				+ "\n│ Version: %5"
				+ "\n│ Role: %6"
				+ "\n│ Thời gian mỗi lần dùng lệnh: %7s"
				+ "\n│ Author: %8"
				+ "\n├── USAGE"
				+ "\n│%9"
				+ "\n├── NOTES"
				+ "\n│ Nội dung bên trong <XXXXX> là có thể thay đổi"
				+ "\n│ Nội dung bên trong [a|b|c] là a hoặc b hoặc c"
				+ "\n╰──────⭔",
			onlyInfo: "╭── INFO ────⭓"
				+ "\n│ Tên lệnh: %1"
				+ "\n│ Mô tả: %2"
				+ "\n│ Các tên gọi khác: %3"
				+ "\n│ Các tên gọi khác trong nhóm bạn: %4"
				+ "\n│ Version: %5"
				+ "\n│ Role: %6"
				+ "\n│ Thời gian mỗi lần dùng lệnh: %7s"
				+ "\n│ Author: %8"
				+ "\n╰─────────────⭓",
			onlyUsage: "╭── USAGE ────⭓"
				+ "\n│%1"
				+ "\n╰─────────────⭓",
			onlyAlias: "╭── ALIAS ────⭓"
				+ "\n│ Các tên gọi khác: %1"
				+ "\n│ Các tên gọi khác trong nhóm bạn: %2"
				+ "\n╰─────────────⭓",
			onlyRole: "╭── ROLE ────⭓"
				+ "\n│%1"
				+ "\n╰─────────────⭓",
			doNotHave: "Không có",
			roleText0: "0 (Tất cả người dùng)",
			roleText1: "1 (Quản trị viên nhóm)",
			roleText2: "2 (Admin bot)",
			roleText0setRole: "0 (set role, tất cả người dùng)",
			roleText1setRole: "1 (set role, quản trị viên nhóm)"
		},
		en: {
			header: "☠️ %1 ☠️",
			summary: "%1 commands in %2 categories",
			categoryHeader: "╭─『 %1 』",
			categoryFooter: "╰───────────────♢",
			commandLine: "│ %1",
			joiner: " • ",
			noCommands: "No commands in this category",
			tip: "Type %1help <command name> to view its details",
			total: "Total Commands: %1",
			footerTip: "Type: %1help <command> for details",
			commandNotFound: "Command \"%1\" does not exist",
			getInfoCommand: "╭── NAME ────⭓"
				+ "\n│ %1"
				+ "\n├── INFO"
				+ "\n│ Description: %2"
				+ "\n│ Other names: %3"
				+ "\n│ Other names in your group: %4"
				+ "\n│ Version: %5"
				+ "\n│ Role: %6"
				+ "\n│ Time per command: %7s"
				+ "\n│ Author: %8"
				+ "\n├── USAGE"
				+ "\n│%9"
				+ "\n├── NOTES"
				+ "\n│ The content inside <XXXXX> can be changed"
				+ "\n│ The content inside [a|b|c] is a or b or c"
				+ "\n╰──────⭔",
			onlyInfo: "╭── INFO ────⭓"
				+ "\n│ Command name: %1"
				+ "\n│ Description: %2"
				+ "\n│ Other names: %3"
				+ "\n│ Other names in your group: %4"
				+ "\n│ Version: %5"
				+ "\n│ Role: %6"
				+ "\n│ Time per command: %7s"
				+ "\n│ Author: %8"
				+ "\n╰─────────────⭓",
			onlyUsage: "╭── USAGE ────⭓"
				+ "\n│%1"
				+ "\n╰─────────────⭓",
			onlyAlias: "╭── ALIAS ────⭓"
				+ "\n│ Other names: %1"
				+ "\n│ Other names in your group: %2"
				+ "\n╰─────────────⭓",
			onlyRole: "╭── ROLE ────⭓"
				+ "\n│%1"
				+ "\n╰─────────────⭓",
			doNotHave: "Do not have",
			roleText0: "0 (All users)",
			roleText1: "1 (Group administrators)",
			roleText2: "2 (Admin bot)",
			roleText0setRole: "0 (set role, all users)",
			roleText1setRole: "1 (set role, group administrators)"
		}
	},

	onStart: async function ({ message, args, event, threadsData, getLang, role, globalData }) {
		const langCode = await threadsData.get(event.threadID, "data.lang") || global.GoatBot.config.language;
		let customLang = {};
		const pathCustomLang = path.normalize(`${process.cwd()}/languages/cmds/${langCode}.js`);
		if (fs.existsSync(pathCustomLang))
			customLang = require(pathCustomLang);

		const { threadID } = event;
		const threadData = await threadsData.get(threadID);
		const prefix = getPrefix(threadID);
		const commandName = (args[0] || "").toLowerCase();
		let command = commands.get(commandName) || commands.get(aliases.get(commandName));
		const aliasesData = threadData.data.aliases || {
			// uid: ["userid", "id"]
		};
		if (!command) {
			for (const cmdName in aliasesData) {
				if (aliasesData[cmdName].includes(commandName)) {
					command = commands.get(cmdName);
					break;
				}
			}
		}

		if (!command) {
			const globalAliasesData = await globalData.get('setalias', 'data', []);
			// [{
			// 	commandName: "uid",
			// 	aliases: ["uid", "id]
			// }]
			for (const item of globalAliasesData) {
				if (item.aliases.includes(commandName)) {
					command = commands.get(item.commandName);
					break;
				}
			}
		}

		// ———————————————— LIST ALL COMMAND ——————————————— //
		if (!command && (!args[0] || !isNaN(args[0]))) {
			const categories = new Map();
			for (const [name, value] of commands) {
				if (value.config.role > 1 && role < value.config.role)
					continue;

				const category = (value.config.category || "NO CATEGORY").toLowerCase();
				const descriptionCustomLang = customLang[name]?.description;
				let description;
				if (descriptionCustomLang != undefined)
					description = checkLangObject(descriptionCustomLang, langCode);
				else if (value.config.description)
					description = checkLangObject(value.config.description, langCode);
				if (description)
					description = cropContent(description.charAt(0).toUpperCase() + description.slice(1), 46);
				else
					description = "—";

				if (!categories.has(category))
					categories.set(category, []);
				categories.get(category).push({
					name,
					description,
					priority: value.priority || 0
				});
			}

			const sortedCategories = [...categories.entries()]
				.map(([category, list]) => {
					list.sort((a, b) => a.name.localeCompare(b.name));
					return { category, list };
				})
				.sort((a, b) => a.category.localeCompare(b.category));

			let total = 0;
			const lines = [];
			const botName = global.GoatBot?.config?.nickNameBot || "Goat Bot";
			const header = getLang("header", botName);
			const boxWidth = visualWidth(getLang("categoryFooter"));
			const pad = Math.max(0, Math.floor((boxWidth - visualWidth(header)) / 2));
			lines.push(" ".repeat(pad) + header);

			for (const { category, list } of sortedCategories) {
				total += list.length;
				lines.push("");
				lines.push(getLang("categoryHeader", category.toUpperCase()));
				lines.push(getLang("commandLine", list.map(item => item.name).join(getLang("joiner"))));
				lines.push(getLang("categoryFooter"));
			}

			lines.push(getLang("total", total));
			lines.push(getLang("footerTip", prefix));
			return message.reply(lines.join("\n"));
		}
		// ———————————— COMMAND DOES NOT EXIST ———————————— //
		else if (!command && args[0]) {
			return message.reply(getLang("commandNotFound", args[0]));
		}
		// ————————————————— INFO COMMAND ————————————————— //
		else {
			const formSendMessage = {};
			const configCommand = command.config;

			let guide = configCommand.guide?.[langCode] || configCommand.guide?.["en"];
			if (guide == undefined)
				guide = customLang[configCommand.name]?.guide?.[langCode] || customLang[configCommand.name]?.guide?.["en"];

			guide = guide || {
				body: ""
			};
			if (typeof guide == "string")
				guide = { body: guide };
			const guideBody = guide.body
				.replace(/\{prefix\}|\{p\}/g, prefix)
				.replace(/\{name\}|\{n\}/g, configCommand.name)
				.replace(/\{pn\}/g, prefix + configCommand.name);

			const aliasesString = configCommand.aliases ? configCommand.aliases.join(", ") : getLang("doNotHave");
			const aliasesThisGroup = threadData.data.aliases ? (threadData.data.aliases[configCommand.name] || []).join(", ") : getLang("doNotHave");

			let roleOfCommand = configCommand.role;
			let roleIsSet = false;
			if (threadData.data.setRole?.[configCommand.name]) {
				roleOfCommand = threadData.data.setRole[configCommand.name];
				roleIsSet = true;
			}

			const roleText = roleOfCommand == 0 ?
				(roleIsSet ? getLang("roleText0setRole") : getLang("roleText0")) :
				roleOfCommand == 1 ?
					(roleIsSet ? getLang("roleText1setRole") : getLang("roleText1")) :
					getLang("roleText2");

			const author = configCommand.author;
			const descriptionCustomLang = customLang[configCommand.name]?.description;
			let description = checkLangObject(configCommand.description, langCode);
			if (description == undefined)
				if (descriptionCustomLang != undefined)
					description = checkLangObject(descriptionCustomLang, langCode);
				else
					description = getLang("doNotHave");

			let sendWithAttachment = false; // check subcommand need send with attachment or not

			if (args[1]?.match(/^-g|guide|-u|usage$/)) {
				formSendMessage.body = getLang("onlyUsage", guideBody.split("\n").join("\n│"));
				sendWithAttachment = true;
			}
			else if (args[1]?.match(/^-a|alias|aliase|aliases$/))
				formSendMessage.body = getLang("onlyAlias", aliasesString, aliasesThisGroup);
			else if (args[1]?.match(/^-r|role$/))
				formSendMessage.body = getLang("onlyRole", roleText);
			else if (args[1]?.match(/^-i|info$/))
				formSendMessage.body = getLang(
					"onlyInfo",
					configCommand.name,
					description,
					aliasesString,
					aliasesThisGroup,
					configCommand.version,
					roleText,
					configCommand.countDown || 1,
					author || ""
				);
			else {
				formSendMessage.body = getLang(
					"getInfoCommand",
					configCommand.name,
					description,
					aliasesString,
					aliasesThisGroup,
					configCommand.version,
					roleText,
					configCommand.countDown || 1,
					author || "",
					guideBody.split("\n").join("\n│")
				);
				sendWithAttachment = true;
			}

			if (sendWithAttachment && guide.attachment) {
				if (typeof guide.attachment == "object" && !Array.isArray(guide.attachment)) {
					const promises = [];
					formSendMessage.attachment = [];

					for (const keyPathFile in guide.attachment) {
						const pathFile = path.normalize(keyPathFile);

						if (!fs.existsSync(pathFile)) {
							const cutDirPath = path.dirname(pathFile).split(path.sep);
							for (let i = 0; i < cutDirPath.length; i++) {
								const pathCheck = `${cutDirPath.slice(0, i + 1).join(path.sep)}${path.sep}`; // create path
								if (!fs.existsSync(pathCheck))
									fs.mkdirSync(pathCheck); // create folder
							}
							const getFilePromise = axios.get(guide.attachment[keyPathFile], { responseType: 'arraybuffer' })
								.then(response => {
									fs.writeFileSync(pathFile, Buffer.from(response.data));
								});

							promises.push({
								pathFile,
								getFilePromise
							});
						}
						else {
							promises.push({
								pathFile,
								getFilePromise: Promise.resolve()
							});
						}
					}

					await Promise.all(promises.map(item => item.getFilePromise));
					for (const item of promises)
						formSendMessage.attachment.push(fs.createReadStream(item.pathFile));
				}
			}

			return message.reply(formSendMessage);
		}
	}
};

function checkLangObject(data, langCode) {
	if (typeof data == "string")
		return data;
	if (typeof data == "object" && !Array.isArray(data))
		return data[langCode] || data.en || undefined;
	return undefined;
}

function cropContent(content, max) {
	if (content.length > max) {
		content = content.slice(0, max - 3);
		content = content + "...";
	}
	return content;
}

function visualWidth(text) {
	let width = 0;
	for (const ch of String(text)) {
		const cp = ch.codePointAt(0);
		if (cp === 0xfe0f || cp === 0x200d)
			continue;
		if (cp >= 0x1f000 || (cp >= 0x2600 && cp <= 0x27bf) || (cp >= 0x2b00 && cp <= 0x2bff))
			width += 2;
		else
			width += 1;
	}
	return width;
}
