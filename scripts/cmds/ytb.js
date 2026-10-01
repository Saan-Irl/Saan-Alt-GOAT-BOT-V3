const fs = require("fs-extra");
const axios = require("axios");
const yts = require("yt-search");
const { youtube } = require("btch-downloader");
const { getStreamFromURL, formatNumber } = global.utils;

const MAX_VIDEO_SIZE = 83 * 1024 * 1024;
const MAX_AUDIO_SIZE = 26 * 1024 * 1024;

async function searchVideo(keyWord) {
	const result = await yts(keyWord);
	return (result.videos || []).slice(0, 6);
}

function videoUrlFromId(id) {
	return `https://www.youtube.com/watch?v=${id}`;
}

function extractVideoId(text) {
	if (!text)
		return null;
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
		/^([a-zA-Z0-9_-]{11})$/
	];
	for (const pattern of patterns) {
		const match = text.match(pattern);
		if (match)
			return match[1];
	}
	return null;
}

async function getDownloadInfo(videoId) {
	const data = await youtube(videoUrlFromId(videoId));
	if (!data || data.status === false)
		throw new Error(data?.message || "Cannot get download links");
	return data;
}

async function getContentLength(url) {
	try {
		const response = await axios({
			method: "HEAD",
			url,
			headers: { Range: "bytes=0-" },
			timeout: 15000,
			validateStatus: () => true
		});
		const size = Number(response.headers["content-length"]);
		return isNaN(size) ? null : size;
	}
	catch (err) {
		return null;
	}
}

async function downloadToFile(url, path) {
	const response = await axios({
		method: "GET",
		url,
		responseType: "stream",
		headers: { Range: "bytes=0-" }
	});
	await new Promise((resolve, reject) => {
		const writeStream = fs.createWriteStream(path);
		response.data.pipe(writeStream);
		response.data.on("error", reject);
		writeStream.on("error", reject);
		writeStream.on("finish", resolve);
	});
	return fs.statSync(path).size;
}

module.exports = {
	config: {
		name: "ytb",
		version: "1.2",
		author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",
		countDown: 5,
		role: 0,
		description: {
			en: "download video, audio or view info of a YouTube video"
		},
		category: "media",
		guide: {
			en: "{pn} [video|-v] [<video name>|<video link>]: download a video from YouTube"
				+ "\n   {pn} [audio|-a] [<video name>|<video link>]: download audio from YouTube"
				+ "\n   {pn} [info|-i] [<video name>|<video link>]: view video information"
				+ "\n   Example:"
				+ "\n    {pn} -v Fallen Kingdom"
				+ "\n    {pn} -a Fallen Kingdom"
				+ "\n    {pn} -i Fallen Kingdom"
		}
	},

	langs: {
		en: {
			error: "An error occurred: %1",
			noResult: "No search results match the keyword \"%1\"",
			choose: "Results for \"%1\"\n%2\nReply with a number (1-%3) to choose.",
			video: "video",
			audio: "audio",
			loading: "Fetching download link...",
			downloading: "Downloading %1 \"%2\"",
			tooLarge: "The %1 exceeds the size limit (%2MB) and cannot be sent.",
			linkError: "Could not get a download link for \"%1\". Try another video.",
			info: "Title: %1\nChannel: %2\nSubscribers: %3\nDuration: %4\nViews: %5\nUploaded: %6\nID: %7\nLink: %8",
			infoItem: "%1. %2\n    %3 | %4 | %5"
		}
	},

	onStart: async function ({ args, message, event, commandName, getLang, api }) {
		let type;
		switch (args[0]) {
			case "-v":
			case "video":
				type = "video";
				break;
			case "-a":
			case "-s":
			case "audio":
			case "sing":
				type = "audio";
				break;
			case "-i":
			case "info":
				type = "info";
				break;
			default:
				return message.SyntaxError();
		}

		const query = args.slice(1).join(" ").trim();
		if (!query)
			return message.SyntaxError();

		const directId = extractVideoId(query);
		if (directId) {
			const loading = await message.reply(getLang("loading"));
			try {
				const info = await getDownloadInfo(directId);
				await handle({ type, info, videoId: directId, message, getLang, api, loading });
			}
			catch (err) {
				const body = getLang("error", err.message || String(err));
				if (loading?.messageID && typeof api.editMessage == "function")
					return api.editMessage(body, loading.messageID);
				return message.reply(body);
			}
			return;
		}

		let results;
		try {
			results = await searchVideo(query);
		}
		catch (err) {
			return message.reply(getLang("error", err.message || String(err)));
		}
		if (!results.length)
			return message.reply(getLang("noResult", query));

		const items = results
			.map((video, index) => getLang("infoItem", index + 1, video.title, video.timestamp || "0:00", video.author?.name || "Unknown", video.views ? formatNumber(video.views) : "-"))
			.join("\n");
		const body = getLang("choose", query, items, results.length);

		const thumbnails = [];
		for (const video of results) {
			if (!video.thumbnail)
				continue;
			try {
				thumbnails.push(await getStreamFromURL(video.thumbnail, `${video.videoId || "thumb"}.jpg`));
			}
			catch (err) {
				// skip a thumbnail that fails to load
			}
		}

		const info = thumbnails.length
			? await message.reply({ body, attachment: thumbnails })
			: await message.reply(body);
		global.GoatBot.onReply.set(info.messageID, {
			commandName,
			messageID: info.messageID,
			author: event.senderID,
			type,
			results
		});
	},

	onReply: async function ({ event, api, Reply, message, getLang }) {
		const { results, type, author } = Reply;
		global.GoatBot.onReply.delete(Reply.messageID);
		if (event.senderID !== author)
			return;
		const choice = parseInt((event.body || "").trim());
		if (isNaN(choice) || choice < 1 || choice > results.length)
			return;
		const videoId = results[choice - 1].videoId;
		api.unsendMessage(Reply.messageID, event.threadID);
		const loading = await message.reply(getLang("loading"));
		try {
			const info = await getDownloadInfo(videoId);
			await handle({ type, info, videoId, message, getLang, api, loading });
		}
		catch (err) {
			const body = getLang("error", err.message || String(err));
			if (loading?.messageID && typeof api.editMessage == "function")
				return api.editMessage(body, loading.messageID);
			return message.reply(body);
		}
	}
};

async function handle({ type, info, videoId, message, getLang, api, loading }) {
	const title = info.title || "video";

	if (type === "info") {
		const body = getLang(
			"info",
			title,
			info.author || "Unknown",
			"-",
			"-",
			"-",
			"-",
			videoId,
			videoUrlFromId(videoId)
		);
		const attachments = [];
		if (info.thumbnail)
			attachments.push(await getStreamFromURL(info.thumbnail, `${videoId}.jpg`));
		if (loading?.messageID && typeof api.editMessage == "function") {
			await api.editMessage(body, loading.messageID);
			if (attachments.length)
				return message.send({ attachment: attachments });
			return;
		}
		return message.reply(attachments.length ? { body, attachment: attachments } : { body });
	}

	const url = type === "video" ? info.mp4 : info.mp3;
	if (!url) {
		const body = getLang("linkError", title);
		if (loading?.messageID && typeof api.editMessage == "function")
			return api.editMessage(body, loading.messageID);
		return message.reply(body);
	}

	const limit = type === "video" ? MAX_VIDEO_SIZE : MAX_AUDIO_SIZE;
	const limitMb = Math.floor(limit / 1024 / 1024);
	const size = await getContentLength(url);
	if (size && size > limit) {
		const body = getLang("tooLarge", getLang(type), limitMb);
		if (loading?.messageID && typeof api.editMessage == "function")
			return api.editMessage(body, loading.messageID);
		return message.reply(body);
	}

	const ext = type === "video" ? "mp4" : "mp3";
	const savePath = `${__dirname}/tmp/${videoId}_${Date.now()}.${ext}`;
	fs.ensureDirSync(`${__dirname}/tmp`);

	const downloading = getLang("downloading", getLang(type), title);
	if (loading?.messageID && typeof api.editMessage == "function")
		await api.editMessage(downloading, loading.messageID);

	try {
		const downloaded = await downloadToFile(url, savePath);
		if (downloaded > limit) {
			fs.removeSync(savePath);
			return message.reply(getLang("tooLarge", getLang(type), limitMb));
		}
		await message.send({ attachment: fs.createReadStream(savePath) });
		fs.removeSync(savePath);
		if (loading?.messageID)
			message.unsend(loading.messageID);
	}
	catch (err) {
		fs.removeSync(savePath);
		const body = getLang("error", err.message || String(err));
		if (loading?.messageID && typeof api.editMessage == "function")
			return api.editMessage(body, loading.messageID);
		return message.reply(body);
	}
}
