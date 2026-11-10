// 语安 · 应急语言服务 —— 零依赖 Node 服务
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { config, hasDeepSeek, hasBigModel } from "./lib/config.js";
import { loadAll, store, listTerms, getTerm, listCorpus, listNews, addChunk, stats, matchTerms } from "./lib/store.js";
import { translate, languageOptions } from "./lib/translate.js";
import { ask, kbStatus } from "./lib/rag.js";
import { engineStatus } from "./lib/llm.js";
import { diagnose } from "./lib/diagnostics.js";

const publicDir = path.join(config.root, "public");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

const rate = new Map();
function limited(ip, key, max = 40, windowMs = 60000) {
  const k = `${ip}:${key}`;
  const now = Date.now();
  const arr = (rate.get(k) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  rate.set(k, arr);
  return arr.length > max;
}

function send(res, status, body, headers = {}) {
  const isJson = typeof body !== "string";
  const payload = isJson ? JSON.stringify(body) : body;
  res.writeHead(status, {
    "content-type": isJson ? "application/json; charset=utf-8" : "text/plain; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  res.end(payload);
}

async function readBody(req, limit = 250 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new Error("请求体过大");
    chunks.push(c);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("JSON 解析失败");
  }
}

function qs(url) {
  return Object.fromEntries(url.searchParams.entries());
}

async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === "/") rel = "/index.html";
  const file = path.normalize(path.join(publicDir, rel));
  if (!file.startsWith(publicDir)) return send(res, 403, "Forbidden");
  try {
    const s = await stat(file);
    if (s.isDirectory()) return send(res, 404, "Not found");
    const buf = await readFile(file);
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME[ext] || "application/octet-stream",
      "cache-control": ext === ".html" ? "no-cache" : "public, max-age=3600",
    });
    res.end(buf);
    return true;
  } catch {
    return false;
  }
}

async function handleApi(req, res, url) {
  const p = url.pathname;
  const method = req.method;
  const ip = req.socket.remoteAddress || "local";

  if (p === "/api/health") {
    return send(res, 200, { ok: true, uptime: process.uptime(), now: new Date().toISOString() });
  }

  if (p === "/api/meta") {
    return send(res, 200, {
      brand: "语安",
      subtitle: "应急语言服务志愿者岗前培训与知识查询平台",
      stats: stats(),
      engine: engineStatus(),
      languages: languageOptions(),
      config: {
        deepseek: hasDeepSeek(),
        bigmodel: hasBigModel(),
        publicMT: config.enablePublicMT,
      },
      snapshotLabel: config.snapshotLabel || store.news?.generatedAt || "",
    });
  }

  if (p === "/api/news" && method === "GET") {
    const q = qs(url);
    return send(
      res,
      200,
      listNews({
        q: q.q || "",
        source: q.source || "",
        topic: q.topic || "",
        page: Math.max(1, Number(q.page || 1)),
        pageSize: Math.min(30, Math.max(1, Number(q.pageSize || 12))),
      })
    );
  }

  if (p === "/api/terms" && method === "GET") {
    const q = qs(url);
    return send(
      res,
      200,
      listTerms({
        q: q.q || "",
        domain: q.domain || "",
        lang: q.lang || "all",
        status: q.status || "",
        page: Math.max(1, Number(q.page || 1)),
        pageSize: Math.min(50, Math.max(1, Number(q.pageSize || 20))),
      })
    );
  }

  if (p.startsWith("/api/terms/") && method === "GET") {
    const id = p.split("/")[3];
    const term = getTerm(id);
    if (!term) return send(res, 404, { error: "术语不存在" });
    const examples = store.corpus.filter((c) => c.src.includes(term.zh)).slice(0, 3);
    return send(res, 200, { ...term, examples });
  }

  if (p === "/api/corpus" && method === "GET") {
    const q = qs(url);
    return send(
      res,
      200,
      listCorpus({
        q: q.q || "",
        pair: q.pair || "",
        domain: q.domain || "",
        page: Math.max(1, Number(q.page || 1)),
        pageSize: Math.min(30, Math.max(1, Number(q.pageSize || 15))),
      })
    );
  }

  if (p === "/api/translate" && method === "POST") {
    if (limited(ip, "translate", 30)) return send(res, 429, { error: "请求过于频繁，请稍候再试" });
    const body = await readBody(req);
    const text = String(body.text || "").trim();
    if (!text) return send(res, 400, { error: "请输入原文" });
    if (text.length > 800) return send(res, 400, { error: "单次翻译不超过 800 字" });
    const result = await translate({ text, from: body.from || "zh", to: body.to || "en" });
    return send(res, 200, result);
  }

  if (p === "/api/qa" && method === "POST") {
    if (limited(ip, "qa", 30)) return send(res, 429, { error: "请求过于频繁，请稍候再试" });
    const body = await readBody(req);
    const question = String(body.question || "").trim();
    if (!question) return send(res, 400, { error: "请输入问题" });
    if (question.length > 300) return send(res, 400, { error: "问题不超过 300 字" });
    const result = await ask(question);
    return send(res, 200, result);
  }

  if (p === "/api/kb/status" && method === "GET") {
    return send(res, 200, { ...kbStatus(), engine: engineStatus() });
  }

  if (p === "/api/kb/chunks" && method === "POST") {
    const body = await readBody(req);
    if (!body.token || body.token !== config.adminToken) return send(res, 401, { error: "更新令牌无效" });
    const text = String(body.text || "").trim();
    if (text.length < 10) return send(res, 400, { error: "切片内容过短" });
    const chunk = await addChunk({
      docTitle: body.docTitle,
      page: body.page,
      text,
      url: body.url,
    });
    if (body.token === config.adminToken) {
      // 令牌仅在服务端校验，不回显
    }
    return send(res, 200, { ok: true, chunk, total: store.kb.length });
  }

  if (p === "/api/docs" && method === "GET") {
    return send(res, 200, Object.entries(store.docs).map(([id, d]) => ({ id, ...d, chunks: store.kb.filter((k) => k.docId === id).length })));
  }

  if (p.startsWith("/api/docs/") && method === "GET") {
    const id = p.split("/")[3];
    const doc = store.docs[id];
    if (!doc) return send(res, 404, { error: "文档不存在" });
    return send(res, 200, { id, ...doc, chunks: store.kb.filter((k) => k.docId === id) });
  }

  if (p === "/api/diagnostics" && method === "GET") {
    if (limited(ip, "diag", 6)) return send(res, 429, { error: "请求过于频繁，请稍候再试" });
    return send(res, 200, await diagnose());
  }

  if (p === "/api/term-match" && method === "POST") {
    const body = await readBody(req);
    return send(res, 200, { terms: matchTerms(String(body.text || ""), body.lang || "zh") });
  }

  return send(res, 404, { error: "接口不存在" });
}

const server = http.createServer(async (req, res) => {
  const t0 = Date.now();
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
    } else {
      const ok = await serveStatic(req, res, url.pathname);
      if (!ok) {
        // SPA 回退
        const html = await readFile(path.join(publicDir, "index.html"));
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
      }
    }
  } catch (e) {
    console.error("请求失败:", req.method, url.pathname, e);
    if (!res.headersSent) send(res, 500, { error: e.message || "服务器内部错误" });
  } finally {
    if (url.pathname.startsWith("/api/")) {
      console.log(`${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - t0}ms`);
    }
  }
});

await loadAll();
server.listen(config.port, () => {
  const st = stats();
  console.log(`语安 · 应急语言服务已启动：http://127.0.0.1:${config.port}`);
  console.log(`数据：术语 ${st.terms} / 语料 ${st.corpus} / 知识切片 ${st.kb} / 资讯 ${st.news}`);
  console.log(`引擎：${engineStatus().translationLabel} | ${engineStatus().ragLabel}`);
});
