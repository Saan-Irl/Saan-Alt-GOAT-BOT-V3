const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const BASE_URL = "https://nkx-gen.neokex.xyz";
const API_KEY = "nkxgen";
const REQUEST_TIMEOUT = 300000;

const REACT_WAIT = "⏳";
const REACT_WORK = "⚙️";
const REACT_DONE = "✅";
const REACT_FAIL = "❌";

const RATIOS = {
  "1:1": "1:1",
  "16:9": "16:9",
  "9:16": "9:16",
  "4:3": "4:3",
  "3:4": "3:4",
  "3:2": "3:2",
  "2:3": "2:3",
  "21:9": "21:9",
  "4:5": "4:5",
  "5:4": "5:4"
};

const ALIASES = {
  nb2: "nano-banana-2",
  nanobanana: "nano-banana-2",
  nanobanana2: "nano-banana-2",
  nb2edit: "nano-banana-2-edit",
  gpt2: "gpt-image-2-low",
  gptimage2: "gpt-image-2-low",
  gpt2edit: "gpt-image-2-edit",
  flux2: "flux-2-dev",
  flux2dev: "flux-2-dev",
  flux2edit: "flux-2-dev-edit",
  flux2flex: "flux-2-flex",
  flux2pro: "flux-2-pro",
  flux2proedit: "flux-2-pro-edit",
  fluxkrea: "flux-krea",
  fluxkreaedit: "flux-krea-edit",
  kontext: "flux-kontext-dev",
  ideogram: "ideogram-v3-turbo",
  seedream4: "seedream-4",
  seedream4edit: "seedream-4-edit",
  seedream45: "seedream-4-5",
  seedream45edit: "seedream-4-5-edit",
  seedream5: "seedream-5",
  seedream5edit: "seedream-5-edit",
  qwen2: "qwen-image-2",
  qwen2pro: "qwen-image-2-pro",
  gemini25: "gemini-2-5-flash-image",
  gemini25edit: "gemini-2-5-flash-image-edit",
  flare: "gpt-image-2-5-flare-low",
  flareedit: "gpt-image-2-5-flare-low-edit",
  sunburst: "gpt-image-2-5-sunburst-low",
  sunbursted: "gpt-image-2-5-sunburst-low-edit",
  gpt25: "gpt-image-2-5-flare-low",
  gpt25flare: "gpt-image-2-5-flare-low",
  gpt25sunburst: "gpt-image-2-5-sunburst-low"
};

const normalize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

function tokensOf(str) {
  return str.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function matchesTokens(query, tokens) {
  let remaining = query;
  for (const token of tokens) {
    if (!remaining) break;
    if (remaining.startsWith(token)) remaining = remaining.slice(token.length);
  }
  return remaining.length === 0;
}

function pickModel(query) {
  const q = normalize(query);
  if (!q) return null;

  if (ALIASES[q]) return ALIASES[q];

  const keys = Object.keys(MODELS);
  const exact = keys.find((k) => normalize(k) === q);
  if (exact) return exact;

  const candidates = [
    ...Object.keys(ALIASES).map((k) => ({ id: ALIASES[k], tokens: tokensOf(ALIASES[k]) })),
    ...keys.map((k) => ({ id: k, tokens: tokensOf(k) }))
  ];
  const tokenMatches = candidates.filter((c) => matchesTokens(q, c.tokens));
  if (tokenMatches.length) {
    tokenMatches.sort((a, b) => a.tokens.length - b.tokens.length || a.id.length - b.id.length);
    return tokenMatches[0].id;
  }

  const starts = keys.filter((k) => normalize(k).startsWith(q));
  if (starts.length) return starts.sort((a, b) => a.length - b.length)[0];

  const contains = keys.filter((k) => normalize(k).includes(q));
  if (contains.length) return contains.sort((a, b) => a.length - b.length)[0];

  return null;
}

let MODELS = {};

async function getModels() {
  if (Object.keys(MODELS).length) return MODELS;
  const res = await client.get("/api/models");
  if (res.status >= 400 || !res.data || typeof res.data.models !== "object") {
    throw new Error("Could not load the model list from the NKX GEN API.");
  }
  MODELS = res.data.models;
  return MODELS;
}

const client = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT,
  validateStatus: () => true,
  headers: { "X-API-Key": API_KEY }
});

function formatError(res) {
  const d = res.data;
  if (d && typeof d === "object") {
    if (d.detail && typeof d.detail === "object" && !Array.isArray(d.detail)) {
      return d.detail.error || d.error || "Insufficient balance to run this generation.";
    }
    if (typeof d.detail === "string") return d.detail;
    if (Array.isArray(d.detail)) return d.detail.map((x) => x.msg || x).join("; ");
    if (d.error) return d.error;
    if (d.hint) return d.hint;
  }
  if (res.status === 401) return "The API rejected its key.";
  if (res.status === 402) return "Not enough credits right now. Try again shortly.";
  if (res.status === 504) return "The job did not finish in time. Try again.";
  if (res.status === 502 || res.status === 503) return "The generation server is waking up. Try again in a moment.";
  return `Request failed (status ${res.status}).`;
}

function findFlag(args, names) {
  for (let i = 0; i < args.length; i++) {
    if (names.includes(args[i].toLowerCase())) {
      const value = args[i + 1];
      if (value === undefined || value.startsWith("--")) return { found: true, value: null, index: i };
      return { found: true, value, index: i };
    }
  }
  return { found: false, value: null, index: -1 };
}

function react(api, id, threadID, emoji) {
  try {
    api.setMessageReaction(emoji, id, threadID);
  } catch (e) {}
}

function extractImageUrl(event) {
  const sources = [event.messageReply?.attachments, event.attachments];
  for (const attachments of sources) {
    if (!Array.isArray(attachments)) continue;
    const photo = attachments.find((a) => a.type === "photo" || a.type === "sticker");
    if (photo) {
      const url = photo.url || photo.largePreviewUrl || photo.previewUrl;
      if (url) return url;
    }
  }
  return null;
}

module.exports = {
  config: {
    name: "gen",
    aliases: ["nkxgen", "nkx"],
    version: "2.2",
    author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",
    countDown: 10,
    role: 0,
    shortDescription: { en: "Generate images and music with NKX GEN" },
    longDescription: { en: "Generate images or music with any NKX GEN model. Reply to an image to use it as the reference for image-to-image." },
    category: "ai",
    guide: {
      en: "{pn} --nb2 a cat --ar 16:9\n{pn} --gpt2 a robot --ar 1:1\n{pn} --seedream5 a city at night\n(reply to an image) {pn} --nb2 make it watercolor\n{pn} --music a lo-fi beat\n{pn} --models"
    }
  },

  onStart: async function ({ api, message, event, args }) {
    if (!args.length) {
      return message.reply(
        "Usage:\n" +
        "- gen --nb2 a cat --ar 16:9\n" +
        "- gen --gpt2 a robot\n" +
        "- gen --seedream5 a city at night\n" +
        "- (reply to an image) gen --nb2 make it watercolor\n" +
        "- gen --music a lo-fi beat\n" +
        "- gen --models"
      );
    }

    const flags = args.filter((a) => a.startsWith("--"));
    const first = args[0].toLowerCase();

    try {
      if (first === "--models") {
        react(api, event.messageID, event.threadID, REACT_WAIT);
        await getModels();
        const lines = Object.entries(MODELS)
          .map(([alias, id]) => `- ${alias} → ${id}`)
          .slice(0, 40);
        react(api, event.messageID, event.threadID, REACT_DONE);
        return message.reply(
          `NKX GEN models:\n${lines.join("\n")}\n\nUse: gen --<alias> <prompt>`
        );
      }
    } catch (e) {
      react(api, event.messageID, event.threadID, REACT_FAIL);
      return message.reply(e.message || "The generation server is unreachable.");
    }

    const isMusic = flags.includes("--music") || flags.includes("--audio");
    const modelFlag = flags.find((f) =>
      !["--ar", "--music", "--audio", "--image", "--img", "--url", "--version"].includes(f)
    );

    if (!modelFlag && !isMusic) {
      return message.reply("Pick a model, for example: gen --nb2 a cat --ar 16:9\nSee gen --models for the list.");
    }

    const arFlag = findFlag(args, ["--ar"]);
    const imageFlag = findFlag(args, ["--image", "--img", "--url"]);
    const versionFlag = findFlag(args, ["--version"]);

    const skip = new Set();
    if (modelFlag) skip.add(modelFlag);
    for (const f of [arFlag, imageFlag, versionFlag]) {
      if (f.found && f.index >= 0) {
        skip.add(args[f.index]);
        if (f.value !== null && args[f.index + 1] !== undefined) skip.add(args[f.index + 1]);
      }
    }

    const prompt = args.filter((a) => !skip.has(a) && !a.startsWith("--")).join(" ").trim();

    if (!prompt) {
      return message.reply("Add a prompt, for example: gen --nb2 a cat");
    }

    const reference = extractImageUrl(event) || imageFlag.value || null;

    react(api, event.messageID, event.threadID, REACT_WAIT);

    try {
      await getModels();
    } catch (e) {
      react(api, event.messageID, event.threadID, REACT_FAIL);
      return message.reply(e.message);
    }

    if (isMusic) {
      return generateMusic({ api, message, event, prompt, versionFlag });
    }

    const alias = pickModel(modelFlag);
    if (!alias) {
      react(api, event.messageID, event.threadID, REACT_FAIL);
      return message.reply(`Unknown model "${modelFlag.slice(2)}". Use gen --models to see the list.`);
    }

    const ratio = arFlag.value && RATIOS[arFlag.value] ? RATIOS[arFlag.value] : "1:1";

    const payload = {
      prompt,
      model: alias,
      ratio,
      resolution: "2k",
      wait: true
    };

    if (reference) {
      if (!/^https?:\/\//i.test(reference)) {
        react(api, event.messageID, event.threadID, REACT_FAIL);
        return message.reply("I could not read that image. Try replying to a photo instead.");
      }
      payload.image_urls = [reference];
    }

    try {
      react(api, event.messageID, event.threadID, REACT_WORK);
      const res = await client.post("/api/generate", payload);

      if (res.status >= 400) {
        react(api, event.messageID, event.threadID, REACT_FAIL);
        return message.reply(formatError(res));
      }

      const d = res.data;
      const url = d.url || d.thumbnail;
      if (!url) {
        react(api, event.messageID, event.threadID, REACT_FAIL);
        return message.reply("The job finished but returned no file.");
      }

      const filePath = await download(url);
      react(api, event.messageID, event.threadID, REACT_DONE);

      await message.reply({
        attachment: fs.createReadStream(filePath)
      });
      fs.remove(filePath).catch(() => {});
    } catch (e) {
      console.error("[GEN COMMAND ERROR]:", e?.response?.data || e.message || e);
      react(api, event.messageID, event.threadID, REACT_FAIL);
      message.reply("An error occurred while generating. Please try again.");
    }
  }
};

async function generateMusic({ api, message, event, prompt, versionFlag }) {
  const version = versionFlag.value || "v3.5";
  const allowed = ["v3.5", "v4.0"];

  if (!allowed.includes(version)) {
    react(api, event.messageID, event.threadID, REACT_FAIL);
    return message.reply(`Unknown music version "${version}". Available: ${allowed.join(", ")}`);
  }

  try {
    react(api, event.messageID, event.threadID, REACT_WORK);
    const res = await client.post("/api/music", {
      prompt,
      model: version,
      wait: true
    });

    if (res.status >= 400) {
      react(api, event.messageID, event.threadID, REACT_FAIL);
      return message.reply(formatError(res));
    }

    const d = res.data;
    const url = d.audio_url || d.cover;
    if (!url) {
      react(api, event.messageID, event.threadID, REACT_FAIL);
      return message.reply("The track finished but returned no file.");
    }

    const filePath = await download(url);
    react(api, event.messageID, event.threadID, REACT_DONE);

    await message.reply({
      body: d.title || prompt,
      attachment: fs.createReadStream(filePath)
    });
    fs.remove(filePath).catch(() => {});
  } catch (e) {
    console.error("[GEN MUSIC ERROR]:", e?.response?.data || e.message || e);
    react(api, event.messageID, event.threadID, REACT_FAIL);
    message.reply("An error occurred while generating music. Please try again.");
  }
}

async function download(url) {
  const cacheDir = path.join(__dirname, "cache");
  await fs.ensureDir(cacheDir);
  const ext = (url.split("?")[0].split(".").pop() || "jpg").slice(0, 4);
  const filePath = path.join(cacheDir, `gen_${Date.now()}.${ext}`);
  const file = await axios.get(url, { responseType: "arraybuffer", timeout: 120000 });
  await fs.writeFile(filePath, Buffer.from(file.data));
  return filePath;
}
