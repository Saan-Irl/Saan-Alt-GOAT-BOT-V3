<img src="https://i.ibb.co/RQ28H2p/banner.png" alt="banner"><h1 align="center"><img src="./dashboard/images/logo-non-bg.png" width="22px"> SAAN GOATBOT V3 — UNHINGED</h1><p align="center">
	<em>A savage, feature-rich Facebook Messenger bot framework built for chaos, automation and pure Saan energy.</em>
</p><p align="center">
	<a href="https://nodejs.org/dist/v22.0.0">
		<img src="https://img.shields.io/badge/Node.js-22.x-brightgreen.svg?style=flat-square" alt="Node.js 22.x">
	</a>
	<img alt="license" src="https://img.shields.io/badge/license-MIT-green?style=flat-square">
	<img alt="platform" src="https://img.shields.io/badge/platform-Node.js%20%7C%20Docker-informational?style=flat-square">
</p><p align="center">
	<sub>
		<b>Built, modified & maintained by 𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍</b><br>
		<b>𝗦𝗔𝗔𝗡 𝗘𝗫𝗛𝗔𝗨𝗦𝗧𝗘𝗗</b> • Noisy code. Zero chill. 🥀
	</sub>
</p>---

🥀 ABOUT THIS BEAST

SAAN GOATBOT V3 — UNHINGED is a customised Messenger bot framework built for people who want more than a boring copy-paste bot.

Commands, games, automation, media tools, economy systems and random chaos—all packed into one bot.

«No fake flex. No unnecessary bullshit. Just code.»

---

☠️ WHAT'S INSIDE

🔥 Core Features

- Facebook Messenger bot framework
- Command & event system
- Custom aliases
- Role-based permissions
- Command cooldowns
- Thread-specific settings
- User & thread management
- Multi-language support
- Web dashboard
- MongoDB / SQLite support
- Custom reactions
- Media downloader
- Economy system
- Game commands
- Custom bot responses
- Automatic command loading

🩸 SAAN CUSTOMS

This version contains custom modifications maintained under the Saan Exhausted branding.

Including:

- Savage custom responses
- Custom economy commands
- Casino / game systems
- Media downloader
- Custom cooldown systems
- Custom usage limits
- Custom command layouts
- Custom author branding
- Random fixes & improvements
- Extra bullshit removed from the experience

---

🧨 REQUIREMENTS

- Node.js 22.x
- Git
- Optional MongoDB
- Basic JavaScript / Node.js knowledge
- Messenger account/session configuration

---

⚡ INSTALLATION

Clone the repo

git clone https://github.com/Fineshyt-Saan/SAAN-GOATBOT-V3.git
cd SAAN-GOATBOT-V3

Install dependencies

npm install

Start the beast

npm start

If the bot asks for account/session information, provide the required configuration according to the project setup.

---

⚙️ CONFIGURATION

Main configuration is controlled through the project's configuration files.

Setting| Purpose
"prefix"| Command prefix
"language"| Bot language
"nickNameBot"| Bot display name
"adminBot"| Bot administrator IDs
"dashBoard"| Dashboard configuration
"noPrefix"| Prefix-free command settings
"reactUnsend"| Reaction-based message removal
"reactMirror"| Reaction mirror system
"optionsFca"| Messenger API options
"facebookAccount"| Account/login configuration

🔐 Keep this shit private

Never expose:

- Facebook cookies
- App-state
- Access tokens
- Passwords
- MongoDB URI
- API keys
- Dashboard secrets

One leak = your account can get cooked.

---

🚀 RUN THE BOT

Normal

npm start

Development

npm run dev

Production

npm run prod

Use the scripts actually available inside "package.json".

---

🧠 HOW THIS THING WORKS

The framework receives Messenger events and routes them through the bot's command/event system.

"onStart"

Runs when a command is triggered.

"onChat"

Handles normal incoming messages.

"onFirstChat"

Runs when a thread is encountered for the first time after startup.

"onReaction"

Handles registered message reactions.

"onReply"

Handles replies to registered bot messages.

"onEvent"

Handles Messenger system events.

"handlerEvent"

Loads and processes event commands from:

scripts/events/

Commands are normally located at:

scripts/cmds/

---

🛠️ MAKE YOUR OWN COMMAND

Example:

module.exports = {
	config: {
		name: "hello",
		version: "1.0",
		author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",
		countDown: 5,
		role: 0,
		description: {
			en: "say hello"
		},
		category: "fun",
		guide: {
			en: "{pn} <name>"
		}
	},

	langs: {
		en: {
			reply: "Yo %1, what's good?"
		}
	},

	onStart: async function ({ args, message, getLang }) {
		return message.reply(
			getLang("reply", args[0] || "bro")
		);
	}
};

Author branding

Custom SAAN commands use:

𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍

Third-party source credits should remain where applicable.

---

🌐 LANGUAGES

Language files are generally located inside:

languages/
languages/cmds/
languages/events/

Available languages depend on the installed language files.

---

🧯 COMMON PROBLEMS

Node version error

Check:

package.json

and your hosting platform's Node.js runtime.

For this project, Node.js 22.x is the intended runtime where supported.

Dependency error

Try:

rm -rf node_modules
npm install

Then:

npm start

Database error

Check your MongoDB URI or SQLite configuration.

Login error

Verify that your session/account configuration is valid.

Do not randomly spam login attempts with broken credentials.

---

📸 SCREENSHOTS

Bot

<details>
	<summary>Bot Commands</summary>
	<p>
		<img src="YOUR_IMAGE_URL" width="399px">
	</p>
</details>

Dashboard

<details>
	<summary>Dashboard</summary>
	<p>
		<img src="YOUR_IMAGE_URL" width="399px">
	</p>
</details>

---

👑 CREDITS

SAAN EXHAUSTED

𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍

Project branding:

𝗦𝗔𝗔𝗡 𝗘𝗫𝗛𝗔𝗨𝗦𝗧𝗘𝗗

Repository:

Fineshyt-Saan/SAAN-GOATBOT-V3

---

🐐 ORIGINAL PROJECT

This project is based on the Goat Bot V2 framework.

Original upstream author:

NTKhang — Goat-Bot-V2

Original/third-party attribution remains acknowledged where required.

---

🖤 LICENSE

This repository contains code derived from third-party/open-source projects.

Respect the applicable licenses, copyright notices and attribution requirements of those projects and dependencies.

Do not remove required third-party license or copyright notices.

---

🥀 SAAN EXHAUSTED

<p align="center">
	<b>𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍</b>
</p><p align="center">
	<b>SAAN GOATBOT V3 — UNHINGED</b>
</p><p align="center">
	<em>Built different. Runs different. No chill.</em>
</p>