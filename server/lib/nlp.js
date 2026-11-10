// 中文/英文混合文本的轻量检索：字符 n-gram + 词元，TF-IDF 余弦相似度。
// 纯 JS 实现，无需向量数据库，保证离线可运行。

const STOP_EN = new Set(["the", "a", "an", "of", "to", "and", "in", "on", "for", "is", "are", "be", "with", "at", "by", "from", "as", "or", "that", "this", "it", "we", "you", "your", "our"]);
const PUNCT = /[\s\u3000-\u303f\uff00-\uffef!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+/;

export function normalize(text = "") {
  return String(text).toLowerCase().replace(/[’‘“”]/g, "'").replace(/\s+/g, " ").trim();
}

export function tokenize(text = "") {
  const s = normalize(text);
  const tokens = [];
  // 拉丁词
  for (const w of s.split(PUNCT)) {
    if (!w) continue;
    if (/^[a-z0-9]+$/.test(w)) {
      if (w.length > 1 && !STOP_EN.has(w)) tokens.push(w);
    }
  }
  // 中日韩字符：unigram + bigram
  for (const run of s.match(/[\u4e00-\u9fff\u3400-\u4dbf]+/g) || []) {
    for (let i = 0; i < run.length; i++) {
      tokens.push(run[i]);
      if (i + 1 < run.length) tokens.push(run.slice(i, i + 2));
    }
  }
  return tokens;
}

export function buildVectors(docs, textOf = (d) => d.text) {
  const n = docs.length;
  const df = new Map();
  const tokenized = docs.map((d) => {
    const toks = tokenize(textOf(d));
    const tf = new Map();
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    return tf;
  });
  const idf = new Map();
  for (const [t, c] of df) idf.set(t, Math.log(1 + (n - c + 0.5) / (c + 0.5)));
  const vectors = tokenized.map((tf) => {
    let norm = 0;
    const v = new Map();
    for (const [t, f] of tf) {
      const w = (1 + Math.log(f)) * (idf.get(t) || 0);
      if (w > 0) {
        v.set(t, w);
        norm += w * w;
      }
    }
    norm = Math.sqrt(norm) || 1;
    for (const [t, w] of v) v.set(t, w / norm);
    return v;
  });
  return { docs, vectors, idf, avgLen: tokenized.reduce((a, b) => a + b.size, 0) / (n || 1) };
}

export function vectorizeQuery(index, text) {
  const tf = new Map();
  for (const t of tokenize(text)) tf.set(t, (tf.get(t) || 0) + 1);
  let norm = 0;
  const v = new Map();
  for (const [t, f] of tf) {
    const w = (1 + Math.log(f)) * (index.idf.get(t) || 0);
    if (w > 0) {
      v.set(t, w);
      norm += w * w;
    }
  }
  norm = Math.sqrt(norm) || 1;
  for (const [t, w] of v) v.set(t, w / norm);
  return v;
}

export function cosine(a, b) {
  if (a.size > b.size) [a, b] = [b, a];
  let s = 0;
  for (const [t, w] of a) {
    const w2 = b.get(t);
    if (w2) s += w * w2;
  }
  return s;
}

export function search(index, query, topK = 5, minScore = 0) {
  const qv = vectorizeQuery(index, query);
  const scored = [];
  for (let i = 0; i < index.docs.length; i++) {
    const s = cosine(qv, index.vectors[i]);
    if (s > minScore) scored.push({ item: index.docs[i], score: s, i });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export function topSentences(text, query, limit = 2) {
  const sents = String(text)
    .split(/(?<=[。！？!?；;])/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sents.length <= limit) return sents;
  const idx = buildVectors(sents, (s) => s);
  return search(idx, query, limit).map((r) => r.item);
}
