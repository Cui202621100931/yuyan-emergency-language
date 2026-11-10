// 多语翻译编排：术语约束 + 平行语料上下文 + 引擎降级。
import { config, hasDeepSeek } from "./config.js";
import { chat, translatePublic, engineStatus } from "./llm.js";
import { matchTerms, targetSurfaceFor, searchCorpusContext, store } from "./store.js";

export const LANGS = {
  zh: { name: "中文", mm: "zh-CN" },
  en: { name: "英语", mm: "en" },
  vi: { name: "越南语", mm: "vi" },
  th: { name: "泰语", mm: "th" },
  my: { name: "缅甸语", mm: "my" },
  km: { name: "高棉语", mm: "km" },
  lo: { name: "老挝语", mm: "lo" },
  ms: { name: "马来语", mm: "ms" },
  id: { name: "印尼语", mm: "id" },
};

const corpusPairs = () => new Set(store.corpus.map((c) => `${c.srcLang}-${c.tgtLang}`));

function termListForPrompt(matches, to, limit = 24) {
  const rows = [];
  const seen = new Set();
  for (const m of matches) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    const tgt = targetSurfaceFor(m.term, to);
    if (!tgt) continue;
    rows.push(`${m.zh}（${m.en}）= ${tgt}`);
    if (rows.length >= limit) break;
  }
  return rows;
}

const SYS_PROMPT =
  "你是应急语言服务专业翻译引擎，服务对象是灾区一线的语言服务志愿者。要求：1. 准确、简洁、口语化，符合应急处置场景；" +
  "2. 必须原样使用给定术语表中的译法，不得改写、不得省略；3. 不加解释、不添加原文没有的信息；4. 只输出译文本身。";

export async function translate({ text, from, to }) {
  const t0 = Date.now();
  if (!LANGS[from] || !LANGS[to]) throw new Error("不支持的语言");
  if (from === to) return { translation: text, from, to, engine: "none", terms: [], context: [], hits: 0, total: 0, elapsedMs: 0 };

  const matches = matchTerms(text, from);
  const direction = `${from}-${to}`;
  const hasPair = corpusPairs().has(direction);
  const context = hasPair ? searchCorpusContext(text, 3, direction) : [];
  let translation = "";
  let engine = "";
  let warning = "";

  if (hasDeepSeek()) {
    const glossary = termListForPrompt(matches, to);
    const ctx = context
      .map((c, i) => `[${i + 1}] ${from === "zh" ? c.item.src : c.item.tgt} => ${from === "zh" ? c.item.tgt : c.item.src}`)
      .join("\n");
    const user =
      `源语言：${LANGS[from].name}\n目标语言：${LANGS[to].name}\n` +
      (glossary.length ? `\n必须采用的术语（原文 = 指定译法）：\n${glossary.join("\n")}\n` : "") +
      (ctx ? `\n参考平行语料（仅供风格参考，不要照抄）：\n${ctx}\n` : "") +
      `\n原文：\n${text}\n\n请直接输出${LANGS[to].name}译文。`;
    try {
      translation = await chat(
        [
          { role: "system", content: SYS_PROMPT },
          { role: "user", content: user },
        ],
        { temperature: 0.1, maxTokens: 800, timeout: 45000 }
      );
      engine = "deepseek";
      // 术语未命中时重写一次
      const misses = matches.filter((m) => {
        const tgt = targetSurfaceFor(m.term, to);
        return tgt && !translation.toLowerCase().includes(tgt.toLowerCase());
      });
      if (misses.length) {
        const again = await chat(
          [
            { role: "system", content: SYS_PROMPT },
            {
              role: "user",
              content:
                `上一版译文遗漏了以下指定术语，请重写译文并确保原样包含：\n` +
                misses.map((m) => `${m.zh} = ${targetSurfaceFor(m.term, to)}`).join("\n") +
                `\n\n原文：\n${text}\n\n只输出重写后的${LANGS[to].name}译文。`,
            },
          ],
          { temperature: 0, maxTokens: 800, timeout: 45000 }
        );
        if (again) translation = again;
      }
    } catch (e) {
      warning = `DeepSeek 调用失败，已降级：${e.message}`;
    }
  }

  if (!translation && config.enablePublicMT) {
    try {
      translation = await translatePublic(text, from, to);
      engine = "mymemory";
      if (!translation) throw new Error("空译文");
    } catch (e) {
      warning = warning || `公有翻译接口不可用：${e.message}`;
    }
  }

  if (!translation) {
    const exact = store.corpus.find(
      (c) => c.srcLang === from && c.tgtLang === to && c.src.trim() === text.trim()
    );
    if (exact) {
      translation = exact.tgt;
      engine = "corpus";
    }
  }

  const terms = matches.map((m) => {
    const tgt = targetSurfaceFor(m.term, to);
    return {
      id: m.id,
      zh: m.zh,
      en: m.en,
      domain: m.domain,
      source: m.source,
      sourceUrl: m.sourceUrl,
      status: m.status,
      surface: m.surface,
      target: tgt,
      hit: Boolean(tgt && translation.toLowerCase().includes(tgt.toLowerCase())),
    };
  });

  return {
    translation,
    from,
    to,
    engine,
    engineLabel:
      engine === "deepseek"
        ? "DeepSeek（术语约束）"
        : engine === "mymemory"
        ? "公有机器翻译（未配置 DeepSeek）"
        : engine === "corpus"
        ? "平行语料匹配"
        : "未获得译文",
    terms,
    context: context.map((c) => ({ src: c.item.src, tgt: c.item.tgt, source: c.item.source, score: Number(c.score.toFixed(3)) })),
    hits: terms.filter((t) => t.hit).length,
    total: terms.length,
    warning: warning || undefined,
    elapsedMs: Date.now() - t0,
    engineStatus: engineStatus(),
  };
}

export function languageOptions() {
  return Object.entries(LANGS).map(([code, v]) => ({ code, name: v.name }));
}
