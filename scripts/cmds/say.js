const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

const BASE_URL = "https://tts.neokex.xyz";
const DEFAULT_VOICE = "Donald Trump";
const DEFAULT_LANG = "en";
const MAX_CHARS = 500;
const REQUEST_TIMEOUT = 120000;

const REACT_WAIT = "⏳";
const REACT_DONE = "✅";
const REACT_FAIL = "❌";

const LANGUAGES = {
	en: "en", eng: "en", english: "en",
	ja: "ja", jp: "ja", jpn: "ja", japanese: "ja", jap: "ja",
	es: "es", spa: "es", spanish: "es", espanol: "es",
	zh: "zh", cn: "zh", chi: "zh", chinese: "zh", mandarin: "zh",
	ko: "ko", kr: "ko", kor: "ko", korean: "ko",
	pt: "pt", por: "pt", portuguese: "pt",
	fr: "fr", fra: "fr", french: "fr",
	de: "de", ger: "de", deu: "de", german: "de",
	ru: "ru", rus: "ru", russian: "ru",
	ar: "ar", ara: "ar", arabic: "ar",
	hi: "hi", hin: "hi", hindi: "hi",
	id: "id", ind: "id", indonesian: "id",
	th: "th", tha: "th", thai: "th",
	vi: "vi", vie: "vi", vietnamese: "vi",
	tr: "tr", tur: "tr", turkish: "tr",
	it: "it", ita: "it", italian: "it",
	nl: "nl", dut: "nl", dutch: "nl",
	pl: "pl", pol: "pl", polish: "pl",
	uk: "uk", ukr: "uk", ukrainian: "uk",
	tl: "tl", fil: "tl", filipino: "tl", tagalog: "tl",
	cy: "cy", welsh: "cy",
	la: "la", latin: "la",
	km: "km", khmer: "km"
};

const LANG_NAMES = {
	en: "English", ja: "Japanese", es: "Spanish", zh: "Chinese",
	ko: "Korean", pt: "Portuguese", fr: "French", de: "German",
	ru: "Russian", ar: "Arabic", hi: "Hindi", id: "Indonesian",
	th: "Thai", vi: "Vietnamese", tr: "Turkish", it: "Italian",
	nl: "Dutch", pl: "Polish", uk: "Ukrainian", tl: "Filipino",
	cy: "Welsh", la: "Latin", km: "Khmer"
};

const json = axios.create({
	baseURL: BASE_URL,
	timeout: REQUEST_TIMEOUT,
	headers: { "User-Agent": "Goatbot-Neoaz/say" }
});

const audio = axios.create({
	baseURL: BASE_URL,
	timeout: REQUEST_TIMEOUT,
	responseType: "arraybuffer",
	headers: { "User-Agent": "Goatbot-Neoaz/say" }
});

const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function normalize(str) {
	return String(str || "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "")
		.trim();
}

function resolveLanguage(input) {
	const key = String(input || "").toLowerCase().replace(/[^a-z]/g, "");
	if (!key)
		return null;
	if (LANGUAGES[key])
		return LANGUAGES[key];
	return null;
}

function relevanceRank(name, query) {
	const n = normalize(name);
	const q = normalize(query);
	if (!q)
		return 3;
	if (n === q)
		return 0;
	if (n.startsWith(q))
		return 1;
	if (n.includes(q))
		return 2;
	return 3;
}

async function searchVoices(query, langCode) {
	const params = { q: query, min_likes: 5 };
	const code = langCode || DEFAULT_LANG;
	if (code)
		params.language = code;
	const key = normalize(query + "|" + (code || ""));
	const cached = searchCache.get(key);
	if (cached && Date.now() - cached.at < CACHE_TTL)
		return cached.items;
	const res = await json.get("/v1/search", { params });
	const raw = res.data || {};
	let items = (Array.isArray(raw) ? raw : raw.items || []).filter(v => v && v.name);
	items.sort((a, b) =>
		relevanceRank(a.name, query) - relevanceRank(b.name, query) ||
		(b.likes || 0) - (a.likes || 0));
	searchCache.set(key, { items, at: Date.now() });
	if (searchCache.size > 40)
		searchCache.delete(searchCache.keys().next().value);
	return items;
}

async function resolveByTitle(title, langCode) {
	const params = { q: title, min_likes: 0, all: "true" };
	const code = langCode || DEFAULT_LANG;
	if (code)
		params.language = code;
	const res = await json.get("/v1/search", { params });
	const raw = res.data || {};
	const items = (Array.isArray(raw) ? raw : raw.items || []).filter(v => v && v.name);
	const exact = items.find(v => normalize(v.name) === normalize(title));
	return exact || items[0] || null;
}

function parseNumber(token) {
	const m = /^#?(\d{1,2})$/.exec(String(token || "").trim());
	if (!m)
		return null;
	const n = Number(m[1]);
	if (n < 1)
		return null;
	return n;
}

function parseArgs(args) {
	const text = [];
	let voice = null;
	let lang = null;
	let badLang = null;
	let pick = null;
	let pendingVoice = false;
	const voiceWords = [];
	const isFlag = (s) => /^(--?v|--?lang|--?language)(=|$)/i.test(s);
	for (let i = 0; i < args.length; i++) {
		const arg = String(args[i] == null ? "" : args[i]);
		const lower = arg.toLowerCase();
		if (lower === "--lang" || lower === "--language" || lower === "-lang" || lower === "-l") {
			if (i + 1 < args.length) {
				const rawLang = args[++i];
				lang = resolveLanguage(rawLang);
				if (!lang)
					badLang = rawLang;
			}
			continue;
		}
		if (/^(--lang|--language|-lang|-l)=/i.test(arg)) {
			const rawLang = arg.split("=").slice(1).join("=");
			lang = resolveLanguage(rawLang);
			if (!lang)
				badLang = rawLang;
			continue;
		}
		if (lower === "--v" || lower === "-v") {
			pendingVoice = true;
			continue;
		}
		if (/^(--v|-v)=/i.test(arg)) {
			pendingVoice = true;
			voiceWords.push(arg.split("=").slice(1).join("="));
			continue;
		}
		const n = parseNumber(arg);
		if (n !== null && (pendingVoice || voiceWords.length)) {
			pick = n;
			pendingVoice = false;
			continue;
		}
		if (pendingVoice || voiceWords.length) {
			if (isFlag(arg)) {
				pendingVoice = false;
				text.push(arg);
				continue;
			}
			voiceWords.push(arg);
			continue;
		}
		if (n !== null && i === args.length - 1 && args.length > 1) {
			pick = n;
			continue;
		}
		text.push(arg);
	}
	if (voiceWords.length)
		voice = voiceWords.join(" ").trim();
	if (pick !== null && !voice && text.length) {
		const words = text.slice();
		voice = words.pop();
		return { text: words.join(" ").trim(), voice, lang, badLang, pick };
	}
	return { text: text.join(" ").trim(), voice, lang, badLang, pick };
}

function formatList(list, query, langCode) {
	const lines = [];
	list.forEach((v, i) => {
		const langs = (v.languages || []).join("/");
		lines.push(`${i + 1}. ${v.name} ❤️${v.likes || 0}${langs ? " [" + langs + "]" : ""}`);
	});
	const code = langCode || DEFAULT_LANG;
	const scope = code ? ` · ${LANG_NAMES[code] || code}` : "";
	return `🔍 "${query}"${scope} — ${list.length} result(s):\n${lines.join("\n")}`;
}

function react(api, id, threadID, emoji) {
	try {
		if (api?.setMessageReaction && id && threadID) {
			api.setMessageReaction(emoji, id, threadID);
		}
	} catch (e) {}
}

module.exports = {
	config: {
		name: "say",
		aliases: ["tts", "voice", "vocal"],
		version: "2.0",
		author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",
		countDown: 5,
		role: 0,
		description: {
			en: "convert text to speech with famous character and celebrity voices"
		},
		category: "media",
		guide: {
			en: "{pn} <text> --v <voice>: speak text with a voice"
				+ "\n {pn} Yare yare --v aizen"
				+ "\n {pn} search aizen -l jp: search voices in Japanese"
				+ "\n {pn} Yare yare --v aizen #3: use the 3rd search result"
				+ "\n {pn} list -l es: browse voices in Spanish"
				+ "\n {pn} <text>: no --v uses " + DEFAULT_VOICE
				+ "\n --lang / -l <code> filters by language (en, jp, es, ...); English if omitted"
				+ "\n Maximum " + MAX_CHARS + " letters allowed"
		}
	},
	langs: {
		en: {
			missingText: "⚠️ Please enter the text to speak.\nExample: {pn} Yare yare --v aizen",
			noVoice: "❌ No voice matched \"%1\".\nTry: {pn} search %1",
			notFound: "❌ No voices matched \"%1\".",
			searchHeader: "🔍 Voices matching \"%1\" (%2):",
			searchFooter: "\n\nUse {pn} <text> --v %1 #N to pick one.",
			listHeader: "🎙️ Voices (%1):",
			emptyResponse: "❌ The voice server returned no audio.",
			serverError: "❌ The voice server is unreachable or busy. Try again.",
			tooLong: "⚠️ Text is too long (%1 chars). Keep it under %2.",
			badNumber: "⚠️ Number #%1 is out of range (only %2 results).",
			badLang: "⚠️ Unknown language \"%1\". Try en, jp, es, ko, zh, fr, de...",
			noResult: "❌ Nothing found."
		}
	},
	onStart: async function ({ api, message, event, args, getLang }) {
		const head = String(args[0] || "").toLowerCase();
		const sub = ["search", "list", "find", "voices"].includes(head) ? head : null;
		const { text, voice: voiceFlag, lang, badLang, pick } = parseArgs(sub ? args.slice(1) : args);

		if (badLang) {
			react(api, event.messageID, event.threadID, REACT_FAIL);
			return message.reply(getLang("badLang", badLang));
		}

		if (sub) {
			const query = text.trim();
			let results;
			try {
				results = await searchVoices(query || "", lang);
			}
			catch (e) {
				react(api, event.messageID, event.threadID, REACT_FAIL);
				return message.reply(getLang("serverError"));
			}
			if (!results.length) {
				react(api, event.messageID, event.threadID, REACT_FAIL);
				return message.reply(getLang("notFound", query));
			}
			const top = results.slice(0, 10);
			react(api, event.messageID, event.threadID, REACT_DONE);
			return message.reply(
				formatList(top, query || "*", lang) + "\nUse: {pn} <text> --v " + (query || "name") + " #N"
			);
		}

		let selected = null;
		if (pick !== null) {
			const query = voiceFlag || text;
			if (!query) {
				react(api, event.messageID, event.threadID, REACT_FAIL);
				return message.reply(getLang("missingText"));
			}
			let results;
			try {
				results = await searchVoices(query, lang);
			}
			catch (e) {
				react(api, event.messageID, event.threadID, REACT_FAIL);
				return message.reply(getLang("serverError"));
			}
			if (!results.length) {
				react(api, event.messageID, event.threadID, REACT_FAIL);
				return message.reply(getLang("notFound", query));
			}
			if (pick > results.length) {
				react(api, event.messageID, event.threadID, REACT_FAIL);
				return message.reply(getLang("badNumber", pick, results.length));
			}
			selected = results[pick - 1];
		}
		else if (voiceFlag) {
			try {
				selected = await resolveByTitle(voiceFlag, lang);
				if (!selected) {
					const results = await searchVoices(voiceFlag, lang);
					selected = results[0] || null;
				}
			}
			catch (e) {
			}
			if (!selected) {
				react(api, event.messageID, event.threadID, REACT_FAIL);
				return message.reply(getLang("noVoice", voiceFlag));
			}
		}

		let spoken = text;
		if (!spoken && event?.messageReply)
			spoken = String(event.messageReply.body || "").trim();
		if (!selected)
			selected = await resolveByTitle(DEFAULT_VOICE, lang);
		if (!spoken) {
			react(api, event.messageID, event.threadID, REACT_FAIL);
			return message.reply(getLang("missingText"));
		}

		const letters = Array.from(spoken.trim());
		if (letters.length > MAX_CHARS) {
			react(api, event.messageID, event.threadID, REACT_FAIL);
			return message.reply(getLang("tooLong", letters.length, MAX_CHARS));
		}

		react(api, event.messageID, event.threadID, REACT_WAIT);

		let buffer;
		try {
			const res = await audio.post("/v1/tts", {
				voice: selected.id || selected.name,
				text: spoken,
				format: "mp3"
			});
			buffer = Buffer.from(res.data);
		}
		catch (e) {
			react(api, event.messageID, event.threadID, REACT_FAIL);
			if (e.response?.status === 422)
				return message.reply(getLang("tooLong", letters.length, MAX_CHARS));
			return message.reply(getLang("serverError"));
		}

		if (!buffer || !buffer.length) {
			react(api, event.messageID, event.threadID, REACT_FAIL);
			return message.reply(getLang("emptyResponse"));
		}

		const file = path.join(os.tmpdir(), `say_${Date.now()}.mp3`);
		await fs.writeFile(file, buffer);

		react(api, event.messageID, event.threadID, REACT_DONE);

		return message.reply({
			attachment: fs.createReadStream(file)
		}, () => {
			try {
				fs.unlinkSync(file);
			}
			catch (_e) {
			}
		});
	}
};
