const { getStreamFromURL } = global.utils;

const PAGE_SIZE = 20;
const REACT_WORKING = "⏳";
const REACT_DONE = "✅";
const REACT_FAIL = "❌";

function react(api, emoji, messageID, threadID) {
	try {
		const result = api.setMessageReaction(emoji, messageID, threadID);
		if (result && typeof result.catch === "function")
			result.catch(() => null);
		return result;
	}
	catch (e) {
		return null;
	}
}

function displayName(thread) {
	if (thread.name)
		return thread.name;
	if (thread.threadName)
		return thread.threadName;
	if (thread.isGroup)
		return "(unnamed group)";
	return "(unnamed user)";
}

function snippetOf(thread) {
	const text = thread.snippet || thread.snippetMessage || "";
	return String(text).replace(/\s+/g, " ").trim().slice(0, 60);
}

async function loadPending(api) {
	const threads = await api.getThreadList(PAGE_SIZE, null, ["PENDING"]);
	return (threads || []).filter(thread => thread && thread.threadID);
}

function explainError(err) {
	const raw = String((err && (err.error || err.message)) || err || "");
	const text = raw.toLowerCase();
	if (text.includes("malformed") || text.includes("successful_results") || text.includes("error_results"))
		return { key: "loadFailed", values: [] };
	if (text.includes("checkpoint") || text.includes("not logged") || text.includes("login")
		|| /^13\d{5}$/.test(raw.trim()) || raw.includes("1367036") || raw.includes("1357004"))
		return { key: "sessionFailed", values: [] };
	return { key: "error", values: [raw] };
}

async function buildList({ api, message, threads, prefix, commandName, event, getLang }) {
	const lines = [getLang("header", threads.length)];

	for (let i = 0; i < threads.length; i++) {
		const thread = threads[i];
		const kind = thread.isGroup ? getLang("group") : getLang("user");
		const snippet = snippetOf(thread);
		lines.push(getLang("item", i + 1, kind, displayName(thread), snippet || getLang("noMessage")));
	}

	lines.push(getLang("footer", prefix, commandName));

	const thumbnails = [];
	for (const thread of threads) {
		if (!thread.imageSrc)
			continue;
		try {
			thumbnails.push(await getStreamFromURL(thread.imageSrc, `${thread.threadID}.jpg`));
		}
		catch (e) {
			// skip images that fail to load
		}
	}

	const body = lines.join("\n");
	const info = thumbnails.length
		? await message.reply({ body, attachment: thumbnails })
		: await message.reply(body);

	global.GoatBot.onReply.set(info.messageID, {
		commandName,
		messageID: info.messageID,
		author: event.senderID,
		threads
	});
}

module.exports = {
	config: {
		name: "pending",
		aliases: ["pendings", "requests", "msgrequest"],
		version: "1.0",
		author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",
		countDown: 5,
		role: 2,
		description: {
			en: "list and approve or decline pending message requests (users and groups in spam)"
		},
		category: "admin",
		guide: {
			en: "{pn}: list pending message requests"
				+ "\n   reply with a number to accept that request"
				+ "\n   reply with d<number> to decline that request (example: d2)"
				+ "\n   {pn} all: accept every pending request"
				+ "\n   {pn} clear: decline every pending request"
		}
	},

	langs: {
		en: {
			header: "Pending requests: %1",
			item: "%1. [%2] %3\n    %4",
			group: "group",
			user: "user",
			noMessage: "(no message)",
			footer: "Reply with a number to accept, or d<number> to decline.\n%1%2 all to accept all, %1%2 clear to decline all.",
			none: "No pending message requests.",
			loadFailed: "Could not load pending requests: Facebook returned a bad response. Your login/cookie is likely expired or flagged - re-login with fresh cookies and try again.",
			sessionFailed: "Could not load pending requests: the Facebook session is not valid (checkpoint or logged out). Re-login with fresh cookies and try again.",
			invalid: "Reply with a number between 1 and %1 (or d<number> to decline).",
			accepted: "Accepted.",
			declined: "Declined.",
			allDone: "Accepted %1 request(s).",
			clearDone: "Declined %1 request(s).",
			error: "Something went wrong: %1"
		}
	},

	onStart: async function ({ api, args, message, event, prefix, commandName, getLang }) {
		const action = (args[0] || "").toLowerCase();

		if (action === "all" || action === "clear") {
			const messageID = event.messageID;
			const threadID = event.threadID;
			react(api, REACT_WORKING, messageID, threadID);
			try {
				const threads = await loadPending(api);
				if (!threads.length) {
					react(api, REACT_FAIL, messageID, threadID);
					return message.reply(getLang("none"));
				}
				const accept = action === "all";
				await api.handleMessageRequest(threads.map(t => t.threadID), accept);
				react(api, REACT_DONE, messageID, threadID);
				return message.reply(getLang(accept ? "allDone" : "clearDone", threads.length));
			}
			catch (err) {
				react(api, REACT_FAIL, messageID, threadID);
				const info = explainError(err);
				return message.reply(getLang(info.key, ...info.values));
			}
		}

		try {
			const threads = await loadPending(api);
			if (!threads.length)
				return message.reply(getLang("none"));
			return buildList({ api, message, threads, prefix, commandName, event, getLang });
		}
		catch (err) {
			const info = explainError(err);
			return message.reply(getLang(info.key, ...info.values));
		}
	},

	onReply: async function ({ api, event, message, Reply, getLang }) {
		global.GoatBot.onReply.delete(Reply.messageID);
		const { threads, author } = Reply;
		if (event.senderID !== author)
			return;

		const body = (event.body || "").trim().toLowerCase();
		const decline = body.startsWith("d");
		const number = parseInt(decline ? body.slice(1) : body);

		if (isNaN(number) || number < 1 || number > threads.length)
			return message.reply(getLang("invalid", threads.length));

		const messageID = event.messageID;
		const threadID = event.threadID;
		react(api, REACT_WORKING, messageID, threadID);
		try {
			await api.handleMessageRequest(threads[number - 1].threadID, !decline);
			react(api, REACT_DONE, messageID, threadID);
		}
		catch (err) {
			react(api, REACT_FAIL, messageID, threadID);
			return message.reply(getLang("error", err.message || String(err)));
		}
	}
};
