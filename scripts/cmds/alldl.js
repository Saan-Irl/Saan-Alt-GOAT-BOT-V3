const btch = require("btch-downloader");
const { getStreamFromURL } = global.utils;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const REACT_WORKING = "⏳";
const REACT_DONE = "✅";
const REACT_FAIL = "❌";

function decodeJwtPayload(token) {
	try {
		const part = String(token).split(".")[1];
		if (!part)
			return null;
		const padded = part.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - part.length % 4) % 4);
		return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
	}
	catch (e) {
		return null;
	}
}

function resolveMediaSource(rawUrl) {
	if (!rawUrl || typeof rawUrl !== "string")
		return { url: null, isVideo: false, headers: null };
	const token = (rawUrl.match(/[?&]token=([^&]+)/) || [])[1];
	if (token) {
		const payload = decodeJwtPayload(decodeURIComponent(token));
		if (payload && payload.url) {
			const inner = payload.url;
			const isVideo = /\.(mp4|mov|m4v|webm)(?:[?#]|$)/i.test(inner)
				|| /video|reels|dash|progressive|xpv|clip/i.test(inner);
			return { url: inner, isVideo, headers: payload.headers || null };
		}
	}
	return { url: rawUrl, isVideo: /\.(mp4|mov|m4v|webm)(?:[?#]|$)/i.test(rawUrl), headers: null };
}

const PLATFORMS = [
	{
		name: "YouTube",
		match: /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|live\/|embed\/|v\/)|youtu\.be\/[A-Za-z0-9_-]{6,})/i,
		referer: "https://www.youtube.com/",
		run: url => btch.youtube(url),
		extract: data => ({
			title: data.title,
			thumbnail: data.thumbnail,
			author: data.author,
			video: data.mp4 || null,
			audio: data.mp3 || null
		})
	},
	{
		name: "TikTok",
		match: /(?:tiktok\.com\/(?:@[^/]+\/video\/\d+|video\/\d+|t\/[A-Za-z0-9]+)|(?:vt|vm)\.tiktok\.com\/[A-Za-z0-9]+)/i,
		run: url => btch.ttdl(url),
		extract: data => ({
			title: data.title,
			thumbnail: data.thumbnail,
			author: "",
			video: (data.video || [])[0] || null,
			audio: (data.audio || [])[0] || null
		})
	},
	{
		name: "Twitter / X",
		match: /(?:twitter\.com|x\.com)\/[^/]+\/status\/\d+/i,
		run: url => btch.twitter(url),
		extract: data => {
			const raw = data.url;
			let link = null;
			if (Array.isArray(raw)) {
				for (const item of raw.slice().reverse()) {
					link = item.hd || item.sd || Object.values(item)[0];
					if (link)
						break;
				}
			}
			else if (typeof raw === "string")
				link = raw;
			return { title: data.title, thumbnail: "", author: "", video: link, audio: null };
		}
	},
	{
		name: "Facebook",
		match: /(?:facebook\.com\/(?:[^/]+\/videos\/|watch\/?\?|reel\/|video\.php|share\/v\/|share\/r\/|[^/]+\/posts\/)|fb\.watch\/[A-Za-z0-9_-]+)/i,
		run: url => btch.fbdown(url),
		extract: data => ({
			title: "",
			thumbnail: "",
			author: "",
			video: data.HD || data.Normal_video || null,
			audio: null
		})
	},
	{
		name: "Instagram",
		match: /instagram\.com\/(?:p|reel|reels|tv|share)\/[A-Za-z0-9_-]+/i,
		run: url => btch.igdl(url),
		extract: data => {
			const items = Array.isArray(data.result) ? data.result : [];
			const media = items.length ? resolveMediaSource(items[0].url) : { url: null, isVideo: false };
			return {
				title: "",
				thumbnail: items[0]?.thumbnail || "",
				author: "",
				headers: media.headers,
				video: media.isVideo ? media.url : null,
				audio: null,
				image: media.isVideo ? null : media.url
			};
		}
	},
	{
		name: "Pinterest",
		match: /(?:pinterest\.[a-z.]+\/pin\/\d+|pin\.it\/[A-Za-z0-9]+)/i,
		run: url => btch.pinterest(url),
		extract: data => {
			const pin = data.result?.result || data.result || {};
			let video = pin.video_url || null;
			if (!video && pin.videos)
				for (const key of Object.keys(pin.videos))
					if (pin.videos[key]?.url) {
						video = pin.videos[key].url;
						break;
					}
			return {
				title: pin.title || pin.description || "",
				thumbnail: pin.image || pin.image_url || "",
				author: pin.uploader?.username || pin.user?.username || "",
				video,
				audio: null,
				image: video ? null : (pin.image || pin.image_url || null)
			};
		}
	},
	{
		name: "CapCut",
		match: /capcut\.com\/(?:template-detail|t|video)\/[A-Za-z0-9]+/i,
		referer: "https://www.capcut.com/",
		run: url => btch.capcut(url),
		extract: data => ({
			title: data.title,
			thumbnail: data.coverUrl,
			author: data.authorName,
			video: data.originalVideoUrl || null,
			audio: null
		})
	},
	{
		name: "SoundCloud",
		match: /soundcloud\.com\/[^/\s]+\/[^/\s?#]+/i,
		run: url => btch.soundcloud(url),
		extract: data => {
			const item = data.result || {};
			return {
				title: item.title,
				thumbnail: item.thumbnail,
				author: "",
				video: null,
				audio: item.downloadMp3 || item.audio || null
			};
		}
	},
	{
		name: "Douyin",
		match: /(?:douyin\.com\/(?:video|note)\/\d+|v\.douyin\.com\/[A-Za-z0-9]+)/i,
		run: url => btch.douyin(url),
		extract: data => {
			const item = data.result || {};
			let video = null;
			if (Array.isArray(item.links))
				for (const link of item.links)
					if (link.url) {
						video = link.url;
						break;
					}
			return {
				title: item.title,
				thumbnail: item.thumbnail,
				author: "",
				video: video || item.video || null,
				audio: null
			};
		}
	},
	{
		name: "Threads",
		match: /threads\.(?:net|com)\/(?:@[^/]+\/)?(?:post|t)\/[A-Za-z0-9_-]+/i,
		run: url => btch.threads(url),
		extract: data => {
			const item = data.result || {};
			return {
				title: "",
				thumbnail: item.image || "",
				author: "",
				video: item.video || null,
				audio: null,
				image: item.video ? null : (item.image || null)
			};
		}
	},
	{
		name: "SnackVideo",
		match: /snackvideo\.com\/(?:video|p|v)\/[A-Za-z0-9_-]+/i,
		run: url => btch.snackvideo(url),
		extract: data => {
			const item = data.result || data;
			return {
				title: item.title,
				thumbnail: item.thumbnail,
				author: item.creator?.name || "",
				video: item.videoUrl || item.url || null,
				audio: null
			};
		}
	},
	{
		name: "Kuaishou",
		match: /(?:kuaishou\.com\/(?:short-video|f)\/[A-Za-z0-9_-]+|v\.kuaishou\.com\/[A-Za-z0-9_-]+)/i,
		run: url => btch.kuaishou(url),
		extract: data => {
			const item = data.result || data;
			return {
				title: item.title,
				thumbnail: item.thumbnail || "",
				author: item.author || item.username || "",
				video: item.videoUrl || null,
				audio: null
			};
		}
	},
	{
		name: "Xiaohongshu",
		match: /xiaohongshu\.com\/(?:explore|discovery\/item)\/[A-Za-z0-9]+/i,
		run: url => btch.xiaohongshu(url),
		extract: data => {
			const item = data.result || {};
			const videos = item.videos || item.video;
			let video = null;
			if (Array.isArray(videos))
				video = typeof videos[0] === "string" ? videos[0] : videos[0]?.url || null;
			else if (typeof videos === "string")
				video = videos;
			const images = item.images || item.image;
			let image = null;
			if (Array.isArray(images))
				image = typeof images[0] === "string" ? images[0] : images[0]?.url || null;
			else if (typeof images === "string")
				image = images;
			return {
				title: item.title,
				thumbnail: item.cover || item.thumbnail || "",
				author: item.author?.nickname || "",
				video,
				audio: null,
				image: video ? null : image
			};
		}
	},
	{
		name: "Spotify",
		match: /open\.spotify\.com\/(?:track|album|playlist|episode)\/[A-Za-z0-9]+/i,
		run: url => btch.spotify(url),
		extract: data => {
			const item = data.result || data;
			const formats = item.formats || item.format || {};
			let link = null;
			for (const key of Object.keys(formats))
				if (formats[key]?.url) {
					link = formats[key].url;
					break;
				}
			return {
				title: item.title,
				thumbnail: item.thumbnail,
				author: item.artist || "",
				video: null,
				audio: link || item.url || item.download || item.mp3 || null
			};
		}
	},
	{
		name: "Google Drive",
		match: /drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+/i,
		run: url => btch.gdrive(url),
		extract: data => {
			const item = data.result || {};
			return {
				title: item.filename,
				thumbnail: "",
				author: "",
				video: /\.(mp4|mkv|mov|webm)/i.test(item.filename || "") ? item.downloadUrl : null,
				audio: null
			};
		}
	}
];

function detectPlatform(url) {
	return PLATFORMS.find(platform => platform.match.test(url)) || null;
}

function extractUrl(text) {
	const match = String(text || "").match(/https?:\/\/[^\s]+/i);
	return match ? match[0] : null;
}

const URL_KEYS = ["url", "source", "href", "target", "link", "playable_url", "playableUrl", "uri", "originalUrl", "deepLink", "deeplink", "fbclid_url"];
const TEXT_KEYS = ["description", "title", "caption", "text", "name", "body"];

function findUrlDeep(value, depth) {
	if (depth > 4 || value === null || value === undefined)
		return null;
	if (typeof value === "string")
		return extractUrl(value);
	if (Array.isArray(value)) {
		for (const item of value) {
			const found = findUrlDeep(item, depth + 1);
			if (found)
				return found;
		}
		return null;
	}
	if (typeof value === "object") {
		for (const key of URL_KEYS.concat(TEXT_KEYS)) {
			const found = findUrlDeep(value[key], depth + 1);
			if (found)
				return found;
		}
		return null;
	}
	return null;
}

function extractUrlFromEvent(event) {
	const fromBody = extractUrl(event?.body);
	if (fromBody)
		return fromBody;

	const attachments = Array.isArray(event?.attachments) ? event.attachments : [];
	for (const item of attachments) {
		if (!item || typeof item !== "object")
			continue;
		for (const key of URL_KEYS) {
			const value = item[key];
			if (typeof value === "string" && /^https?:\/\//i.test(value))
				return value;
		}
		const nested = extractUrl(item.ID);
		if (nested)
			return nested;
		// share posts hide the link in title/description/nested fields, so search the whole object
		const deep = findUrlDeep(item, 0);
		if (deep)
			return deep;
	}
	return null;
}

function isUnsupportedShare(event) {
	const attachments = Array.isArray(event?.attachments) ? event.attachments : [];
	return attachments.some(item => item && typeof item === "object"
		&& (item.type === "share" || item.type === "share_post" || item.type === "story_mention")
		&& !extractUrlFromEvent({ attachments: [item], body: "" }));
}

function extensionFor(url, type) {
	const clean = url.split("?")[0];
	const ext = clean.split(".").pop();
	if (ext && ext.length <= 5 && /^[a-z0-9]+$/i.test(ext))
		return ext;
	if (type === "audio") return "mp3";
	if (type === "image") return "jpg";
	return "mp4";
}

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

async function downloadAndSend({ api, message, event, url, wantAudio }) {
	const platform = detectPlatform(url);
	if (!platform)
		return;

	const messageID = event.messageID;
	const threadID = event.threadID;
	react(api, REACT_WORKING, messageID, threadID);

	try {
		const data = await platform.run(url);
		if (!data || data.status === false || data.error) {
			react(api, REACT_FAIL, messageID, threadID);
			return;
		}

		const info = platform.extract(data);

		let streamUrl = wantAudio ? info.audio : info.video;
		let type = wantAudio ? "audio" : "video";
		if (!streamUrl && wantAudio && info.video) {
			streamUrl = info.video;
			type = "video";
		}
		if (!streamUrl && !wantAudio && info.image) {
			streamUrl = info.image;
			type = "image";
		}
		if (!streamUrl && !wantAudio && info.audio) {
			streamUrl = info.audio;
			type = "audio";
		}
		if (!streamUrl) {
			react(api, REACT_FAIL, messageID, threadID);
			return;
		}

		const headers = { "User-Agent": UA, ...(platform.referer ? { Referer: platform.referer } : {}), ...(info.headers || {}) };
		const ext = extensionFor(streamUrl, type);
		const name = `${(info.title || platform.name).replace(/[^\w.-]+/g, "_").slice(0, 40) || "media"}.${ext}`;

		const stream = await getStreamFromURL(streamUrl, name, { headers });
		const title = String(info.title || "").trim();
		const body = title || `${platform.name} media`;
		await message.reply({ body, attachment: stream });
		react(api, REACT_DONE, messageID, threadID);
	}
	catch (e) {
		react(api, REACT_FAIL, messageID, threadID);
	}
}

module.exports = {
	config: {
		name: "alldl",
		aliases: ["dl", "download", "alldownload"],
		version: "1.2",
		author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",
		countDown: 5,
		role: 0,
		description: {
			en: "download media from almost any platform by link (auto-detects links in any message)"
		},
		category: "media",
		guide: {
			en: "{pn} <link>: download and send the video at the link"
				+ "\n   {pn} <link> -a: download and send the audio instead"
				+ "\n   send any supported link on its own and the bot will fetch it automatically"
				+ "\n   {pn} on / off: enable or disable auto-download in this chat"
		}
	},

	onStart: async function ({ api, args, message, event, threadsData }) {
		const flags = args.filter(arg => arg.startsWith("-")).map(arg => arg.toLowerCase());
		const audioFlag = flags.includes("-a") || flags.includes("--audio");

		const words = args.filter(arg => !arg.startsWith("-"));
		const first = (words[0] || "").toLowerCase();

		let threadEnabled = await threadsData.get(event.threadID, "data.alldl", true);
		if (threadEnabled === undefined || threadEnabled === null)
			threadEnabled = true;

		if (!audioFlag && (first === "on" || first === "off") && words.length === 1) {
			await threadsData.set(event.threadID, first === "on", "data.alldl");
			return;
		}

		if (threadEnabled === false)
			return;

		const url = extractUrlFromEvent(event) || extractUrl(words.join(" "));
		if (!url)
			return;

		return downloadAndSend({ api, message, event, url, wantAudio: audioFlag });
	},

	onChat: async function ({ api, message, event, threadsData }) {
		if (event.senderID === api.getCurrentUserID())
			return;

		const url = extractUrlFromEvent(event);
		if (!url) {
			if (isUnsupportedShare(event)) {
				const messageID = event.messageID;
				const threadID = event.threadID;
				react(api, REACT_FAIL, messageID, threadID);
			}
			return;
		}
		if (!detectPlatform(url))
			return;

		let threadEnabled = await threadsData.get(event.threadID, "data.alldl", true);
		if (threadEnabled === undefined || threadEnabled === null)
			threadEnabled = true;
		if (threadEnabled === false)
			return;

		return downloadAndSend({ api, message, event, url, wantAudio: false });
	}
};
