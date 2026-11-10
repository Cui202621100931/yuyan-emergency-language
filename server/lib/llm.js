// 大模型与翻译接口封装：DeepSeek / BigModel / MyMemory。
// 所有密钥仅在此模块读取，不会出现在前端。
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config, hasDeepSeek, hasBigModel } from "./config.js";

const cacheDir = path.join(config.root, "data", "cache");
await mkdir(cacheDir, { recursive: true });

const ttl = (ms = 120000) => AbortSignal.timeout(ms);

async function postJson(url, body, headers = {}, timeout = 60000) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: ttl(timeout),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

// ---------- DeepSeek ----------
export async function chat(messages, { temperature = 0.2, maxTokens = 900, timeout = 60000 } = {}) {
  if (!hasDeepSeek()) throw new Error("DEEPSEEK_API_KEY 未配置");
  const json = await postJson(
    `${config.deepseek.base}/chat/completions`,
    {
      model: config.deepseek.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    },
    { authorization: `Bearer ${config.deepseek.key}` },
    timeout
  );
  return json?.choices?.[0]?.message?.content?.trim() || "";
}

// ---------- BigModel Embedding ----------
const EMBED_CACHE = path.join(cacheDir, "embeddings.json");
let embedCache = {};
try {
  if (existsSync(EMBED_CACHE)) embedCache = JSON.parse(await readFile(EMBED_CACHE, "utf8"));
} catch {
  embedCache = {};
}
const hash = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 16);
let embedDirty = false;

export async function embed(texts) {
  if (!hasBigModel()) throw new Error("BIGMODEL_API_KEY 未配置");
  const out = new Array(texts.length);
  const missing = [];
  texts.forEach((t, i) => {
    const k = hash(t);
    if (embedCache[k]) out[i] = embedCache[k];
    else missing.push(i);
  });
  for (let i = 0; i < missing.length; i += 16) {
    const batchIdx = missing.slice(i, i + 16);
    const json = await postJson(
      `${config.bigmodel.base}/embeddings`,
      { model: config.bigmodel.model, input: batchIdx.map((idx) => texts[idx]) },
      { authorization: `Bearer ${config.bigmodel.key}` },
      90000
    );
    const data = json?.data || [];
    batchIdx.forEach((idx, j) => {
      const vec = data[j]?.embedding;
      out[idx] = vec;
      if (vec) {
        embedCache[hash(texts[idx])] = vec;
        embedDirty = true;
      }
    });
  }
  if (embedDirty) {
    writeFile(EMBED_CACHE, JSON.stringify(embedCache)).catch(() => {});
    embedDirty = false;
  }
  return out;
}

// ---------- MyMemory 公有翻译（无 Key 时的降级方案） ----------
const MT_CACHE = path.join(cacheDir, "translate-cache.json");
let mtCache = {};
try {
  if (existsSync(MT_CACHE)) mtCache = JSON.parse(await readFile(MT_CACHE, "utf8"));
} catch {
  mtCache = {};
}
let mtDirty = false;

const MM_LANG = { zh: "zh-CN", en: "en", vi: "vi", th: "th", id: "id", ms: "ms", my: "my", km: "km", lo: "lo" };

export async function translatePublic(text, from, to) {
  if (!config.enablePublicMT) throw new Error("公有翻译已关闭");
  const clean = String(text).trim();
  if (!clean) return "";
  const key = `${from}>${to}:${hash(clean)}`;
  if (mtCache[key]) return mtCache[key];
  const pair = `${MM_LANG[from] || from}|${MM_LANG[to] || to}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean.slice(0, 480))}&langpair=${pair}`;
  const res = await fetch(url, { headers: { "user-agent": "YuyanEmergencyService/1.0" }, signal: ttl(20000) });
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
  const json = await res.json();
  const out = String(json?.responseData?.translatedText || "").trim();
  if (!out || /MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID LANGUAGE PAIR/i.test(out)) {
    throw new Error("MyMemory 未返回有效译文");
  }
  mtCache[key] = out;
  mtDirty = true;
  writeFile(MT_CACHE, JSON.stringify(mtCache)).catch(() => {});
  return out;
}

export function engineStatus() {
  return {
    translation: hasDeepSeek() ? "deepseek" : config.enablePublicMT ? "mymemory" : "corpus",
    translationLabel: hasDeepSeek() ? "DeepSeek 术语约束翻译" : config.enablePublicMT ? "公有机器翻译（未配置 DeepSeek）" : "语料/术语拼装（演示）",
    rag: hasBigModel() && hasDeepSeek() ? "bigmodel+deepseek" : "local",
    ragLabel: hasBigModel() && hasDeepSeek() ? "BigModel 向量检索 + DeepSeek 生成" : "本地向量检索 + 抽取式回答（未配置 Key）",
    embedding: hasBigModel() ? config.bigmodel.model : "tfidf-local",
    chatModel: hasDeepSeek() ? config.deepseek.model : "",
  };
}
