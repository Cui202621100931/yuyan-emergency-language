// 数据装载与查询：术语、平行语料、知识库、资讯。
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { buildVectors, search, normalize } from "./nlp.js";

const dataDir = path.join(config.root, "data");

async function readJson(name) {
  return JSON.parse(await readFile(path.join(dataDir, name), "utf8"));
}

export const store = {
  terms: [],
  corpus: [],
  kb: [],
  news: null,
  docs: {},
  meta: {},
  indexes: { kb: null, corpus: null },
  termIndex: {},
};

export async function loadAll() {
  store.terms = await readJson("terms.json");
  store.corpus = await readJson("corpus.json");
  store.kb = await readJson("kb.json");
  store.news = await readJson("news.json");
  store.docs = await readJson("kb-docs.json");
  store.meta = await readJson("meta.json");
  buildIndexes();
  return store;
}

export function buildIndexes() {
  store.indexes.kb = buildVectors(store.kb, (k) => `${k.docTitle} 第${k.page}页 ${k.text}`);
  store.indexes.corpus = buildVectors(store.corpus, (c) => c.src);
  store.termIndex = buildTermIndex(store.terms);
}

function buildTermIndex(terms) {
  const idx = { zh: [], en: [], vi: [], th: [], id: [], ms: [], my: [], km: [], lo: [] };
  for (const t of terms) {
    idx.zh.push({ id: t.id, surface: t.zh, target: t.en, term: t });
    idx.en.push({ id: t.id, surface: t.en, target: t.zh, term: t });
    for (const [lang, val] of Object.entries(t.langs || {})) {
      if (!idx[lang]) idx[lang] = [];
      idx[lang].push({ id: t.id, surface: val, target: t.zh, term: t });
    }
  }
  for (const lang of Object.keys(idx)) {
    idx[lang].sort((a, b) => b.surface.length - a.surface.length);
  }
  return idx;
}

const LATIN = /^[a-z0-9\s().,'’\/+-]+$/i;

export function matchTerms(text, lang) {
  const entries = store.termIndex[lang];
  if (!entries || !text) return [];
  const hay = text.toLowerCase();
  const used = new Array(hay.length).fill(false);
  const found = [];
  for (const e of entries) {
    const needle = e.surface.toLowerCase().trim();
    if (!needle) continue;
    let from = 0;
    while (from <= hay.length - needle.length) {
      const i = hay.indexOf(needle, from);
      if (i < 0) break;
      let ok = true;
      // 英文词边界
      if (LATIN.test(needle)) {
        const before = hay[i - 1];
        const after = hay[i + needle.length];
        if ((before && /[a-z0-9]/.test(before)) || (after && /[a-z0-9]/.test(after))) ok = false;
      }
      if (ok) {
        let overlap = false;
        for (let k = i; k < i + needle.length; k++) if (used[k]) { overlap = true; break; }
        if (!overlap) {
          for (let k = i; k < i + needle.length; k++) used[k] = true;
          found.push({
            id: e.id,
            zh: e.term.zh,
            en: e.term.en,
            domain: e.term.domain,
            source: e.term.source,
            sourceUrl: e.term.sourceUrl,
            status: e.term.status,
            surface: e.surface,
            target: e.target,
            targetSurface: lang === "zh" ? e.term.en : e.term.zh,
            term: e.term,
            start: i,
            end: i + needle.length,
          });
        }
      }
      from = i + needle.length;
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

export function targetSurfaceFor(term, to) {
  if (to === "zh") return term.zh;
  if (to === "en") return term.en;
  return (term.langs || {})[to] || "";
}

// ---------- 查询 ----------
export function listTerms({ q = "", domain = "", lang = "all", status = "", page = 1, pageSize = 20 } = {}) {
  const kw = normalize(q);
  let rows = store.terms;
  if (domain) rows = rows.filter((t) => t.domain === domain);
  if (status) rows = rows.filter((t) => t.status === status);
  if (lang && lang !== "all") {
    if (lang === "asean") rows = rows.filter((t) => Object.keys(t.langs || {}).length > 0);
    else if (lang === "none") rows = rows.filter((t) => Object.keys(t.langs || {}).length === 0);
    else if (lang === "zh" || lang === "en") rows = rows;
    else rows = rows.filter((t) => Boolean(t.langs?.[lang]));
  }
  if (kw) {
    rows = rows.filter((t) => {
      const hay = [t.zh, t.en, ...Object.values(t.langs || {})].join(" ").toLowerCase();
      return hay.includes(kw);
    });
  }
  const total = rows.length;
  const start = (page - 1) * pageSize;
  return { total, page, pageSize, items: rows.slice(start, start + pageSize) };
}

export function getTerm(id) {
  return store.terms.find((t) => t.id === id) || null;
}

export function listCorpus({ q = "", pair = "", domain = "", page = 1, pageSize = 15 } = {}) {
  const kw = normalize(q);
  let rows = store.corpus;
  if (pair) rows = rows.filter((c) => `${c.srcLang}-${c.tgtLang}` === pair);
  if (domain) rows = rows.filter((c) => c.domain === domain);
  if (kw) {
    rows = rows.filter((c) => normalize(c.src).includes(kw) || normalize(c.tgt).includes(kw));
  }
  const total = rows.length;
  const start = (page - 1) * pageSize;
  return { total, page, pageSize, items: rows.slice(start, start + pageSize) };
}

export function listNews({ q = "", source = "", topic = "", page = 1, pageSize = 12 } = {}) {
  const kw = normalize(q);
  let rows = store.news.items;
  if (source) rows = rows.filter((n) => n.sourceShort === source || n.source === source);
  if (topic) rows = rows.filter((n) => n.topic === topic);
  if (kw) {
    rows = rows.filter((n) =>
      normalize([n.titleZh, n.titleEn, n.summaryZh, n.summaryEn].filter(Boolean).join(" ")).includes(kw)
    );
  }
  const total = rows.length;
  const start = (page - 1) * pageSize;
  return {
    total,
    page,
    pageSize,
    items: rows.slice(start, start + pageSize),
    sources: store.news.sources,
    topics: [...new Set(store.news.items.map((n) => n.topic))],
    generatedAt: store.news.generatedAt,
  };
}

export function searchKB(query, topK = 4) {
  return search(store.indexes.kb, query, topK, 0);
}

export function searchCorpusContext(query, topK = 3, direction = "") {
  return search(store.indexes.corpus, query, topK * 4, 0.12)
    .filter((r) => !direction || `${r.item.srcLang}-${r.item.tgtLang}` === direction)
    .slice(0, topK);
}

export async function addChunk({ docTitle, page, text, url, source = "项目组编写（增量更新）" }) {
  const id = "K" + String(store.kb.length + 1).padStart(4, "0");
  const chunk = {
    id,
    docId: "KBNEW",
    docTitle: docTitle || "增量更新知识条目",
    docShort: docTitle || "增量条目",
    page: Number(page) || 1,
    text,
    source,
    sourceUrl: url || "#/qa",
    updated: new Date().toISOString().slice(0, 10),
  };
  store.kb.push(chunk);
  store.indexes.kb = buildVectors(store.kb, (k) => `${k.docTitle} 第${k.page}页 ${k.text}`);
  await writeFile(path.join(dataDir, "kb.json"), JSON.stringify(store.kb, null, 0));
  return chunk;
}

export function stats() {
  const n = store.news;
  return {
    terms: store.terms.length,
    termsWithAsean: store.terms.filter((t) => Object.keys(t.langs || {}).length > 0).length,
    corpus: store.corpus.length,
    corpusPairs: [...new Set(store.corpus.map((c) => `${c.srcLang}-${c.tgtLang}`))],
    kb: store.kb.length,
    docs: Object.keys(store.docs).length,
    news: n?.total || 0,
    newsSources: n?.sources || [],
    newsUpdatedAt: n?.generatedAt || "",
    domains: store.meta.domains || [],
    termLangs: ["zh", "en", "vi", "th", "id", "ms", "my", "km", "lo"],
    aseanLangs: ["vi", "th", "id", "ms", "my", "km", "lo"],
  };
}
