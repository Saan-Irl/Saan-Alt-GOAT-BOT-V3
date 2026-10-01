const { getStreamFromURL } = global.utils;

function norm(text) {
	return String(text || "")
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function scoreTrack(track, query) {
	const q = norm(query);
	if (!q)
		return 0;
	const title = norm(track.title);
	const artist = norm(track.artist);
	const album = norm(track.album);
	const combined = `${title} ${artist}`.trim();

	let score = 0;
	if (title === q) score += 120;
	else if (combined === q) score += 110;
	else if (title.startsWith(q)) score += 80;
	else if (combined.startsWith(q)) score += 70;
	else if (title.includes(q)) score += 50;
	else if (combined.includes(q)) score += 45;
	else if (album.includes(q)) score += 20;

	const words = q.split(" ").filter(Boolean);
	if (words.length) {
		let hit = 0;
		for (const word of words) {
			if (title.includes(word)) hit += 2;
			else if (artist.includes(word)) hit += 2;
			else if (combined.includes(word)) hit += 1;
		}
		score += hit;
	}

	if (artist && q.includes(artist)) score += 25;
	if (title && track.durationMs) score += 1;
	return score;
}

function rankTracks(tracks, query) {
	return tracks
		.map((track, index) => ({ track, index, score: scoreTrack(track, query) }))
		.sort((a, b) => b.score - a.score || a.index - b.index)
		.map(entry => entry.track);
}

function safeName(title) {
	return (title || "song").replace(/[^\w.-]+/g, "_").slice(0, 40) || "song";
}

function extFromMime(mime) {
	if (!mime)
		return null;
	if (mime.includes("mpeg") || mime.includes("mp3"))
		return "mp3";
	if (mime.includes("mp4") || mime.includes("m4a"))
		return "m4a";
	if (mime.includes("ogg"))
		return "ogg";
	if (mime.includes("wav"))
		return "wav";
	if (mime.includes("jpeg") || mime.includes("jpg"))
		return "jpg";
	if (mime.includes("png"))
		return "png";
	return null;
}

async function sendTrack({ api, message, track, caption, editId, editText }) {
	let attachment = null;
	const name = safeName(track.title);

	if (editId && editText && typeof api.editMessage == "function") {
		try {
			await api.editMessage(editText, editId);
		}
		catch (e) { /* edit is best-effort */ }
	}

	if (track.audioUrl) {
		try {
			attachment = await getStreamFromURL(track.audioUrl, `${name}.mp3`);
		}
		catch (e) {
			attachment = null;
		}
	}

	if (attachment)
		return message.send({ body: caption, attachment });

	if (track.coverArtwork) {
		try {
			attachment = await getStreamFromURL(track.coverArtwork, `${name}.jpg`);
			return message.send({ body: caption, attachment });
		}
		catch (e) { /* fall through to text */ }
	}

	return message.send({ body: caption });
}

module.exports = {
	config: {
		name: "sing",
		aliases: ["music", "song", "searchmusic"],
		version: "1.2",
		author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",
		countDown: 5,
		role: 0,
		description: {
			en: "search for a song and send it into the chat"
		},
		category: "media",
		guide: {
			en: "{pn} <song name or artist>"
				+ "\n   {pn} <song> -c <number> (show that many results, then reply with a number to send one)"
				+ "\n   {pn} <song> -n <number> (send a ranked result directly)"
		}
	},

	langs: {
		en: {
			noQuery: "Please enter a song name or artist to search for.",
			searching: "Searching...",
			sending: "Sending the song...",
			notFound: "No song found for \"%1\". Try a different keyword.",
			error: "Could not search for music:\n%1",
			resultsHeader: "Top %1 result(s) for \"%2\"",
			resultsItem: "%1. %2 — %3",
			resultsFooter: "Reply to this message with a number (1-%1) to send that song.",
			invalidChoice: "Please reply with a number between 1 and %1.",
			title: "%1 — %2",
			caption: "%1 — %2"
		}
	},

	onStart: async function ({ api, args, message, event, prefix, commandName, getLang }) {
		let listCount = 0;
		let pick = 1;
		const filtered = [];

		for (let i = 0; i < args.length; i++) {
			const arg = args[i];
			if (arg === "-c" || arg === "--count") {
				const value = parseInt(args[i + 1]);
				if (!isNaN(value) && value > 0)
					listCount = Math.min(value, 20);
				i++;
				continue;
			}
			if (arg === "-n" || arg === "--number") {
				const value = parseInt(args[i + 1]);
				if (!isNaN(value) && value > 0)
					pick = value;
				i++;
				continue;
			}
			filtered.push(arg);
		}

		const query = filtered.join(" ").trim();
		if (!query)
			return message.SyntaxError ? message.SyntaxError() : message.reply(getLang("noQuery"));

		const msg = await message.reply(getLang("searching"));

		const edit = async (body) => {
			if (msg?.messageID && typeof api.editMessage == "function")
				return api.editMessage(body, msg.messageID);
			return message.reply(body);
		};

		let result;
		try {
			result = await api.searchMusic(query, { count: 30 });
		}
		catch (err) {
			const detail = err.response?.error || err.error || err.message || String(err);
			return edit(getLang("error", detail));
		}

		if (!result || !result.tracks || result.tracks.length === 0)
			return edit(getLang("notFound", query));

		const ranked = rankTracks(result.tracks, query);

		if (listCount > 0) {
			const shown = ranked.slice(0, listCount);
			const items = shown
				.map((track, index) => getLang("resultsItem", index + 1, track.title, track.artist))
				.join("\n");
			const body = `${getLang("resultsHeader", shown.length, query)}\n${items}\n${getLang("resultsFooter", shown.length)}`;

			if (msg?.messageID && typeof api.editMessage == "function") {
				await edit(body);
				global.GoatBot.onReply.set(msg.messageID, {
					commandName,
					messageID: msg.messageID,
					author: event.senderID,
					tracks: shown
				});
			}
			else {
				const info = await message.reply(body);
				if (info?.messageID) {
					global.GoatBot.onReply.set(info.messageID, {
						commandName,
						messageID: info.messageID,
						author: event.senderID,
						tracks: shown
					});
				}
			}
			return;
		}

		const track = ranked[Math.min(pick - 1, ranked.length - 1)];
		const caption = getLang("caption", track.title, track.artist);

		try {
			return await sendTrack({
				api, message, track, caption,
				editId: msg?.messageID,
				editText: getLang("title", track.title, track.artist)
			});
		}
		catch (err) {
			return edit(getLang("error", err.message || err.error || String(err)));
		}
	},

	onReply: async function ({ api, event, message, Reply, getLang }) {
		global.GoatBot.onReply.delete(Reply.messageID);
		const { tracks, author } = Reply;
		if (event.senderID !== author)
			return;
		const choice = parseInt((event.body || "").trim());
		if (isNaN(choice) || choice < 1 || choice > tracks.length)
			return message.reply(getLang("invalidChoice", tracks.length));

		const track = tracks[choice - 1];
		const caption = getLang("caption", track.title, track.artist);
		const msg = await message.reply(getLang("sending"));
		try {
			return await sendTrack({
				api, message, track, caption,
				editId: msg?.messageID,
				editText: getLang("title", track.title, track.artist)
			});
		}
		catch (err) {
			const detail = err.message || err.error || String(err);
			if (msg?.messageID && typeof api.editMessage == "function")
				return api.editMessage(getLang("error", detail), msg.messageID);
			return message.reply(getLang("error", detail));
		}
	}
};
