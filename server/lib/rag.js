// 可追溯来源的检索增强问答：BigModel 向量 + DeepSeek 生成；无 Key 时本地 TF-IDF 抽取。
import { hasBigModel, hasDeepSeek } from "./config.js";
import { embed, chat } from "./llm.js";
import { searchKB, store } from "./store.js";
import { cosine, topSentences } from "./nlp.js";

const LOCAL_THRESHOLD = 0.14;
const EMBED_THRESHOLD = 0.3;
let kbVectors = null;
let kbVectorsSize = 0;

// 领域词表：术语 + 现场高频词，用于判断问题是否落在知识库范围内
const SCOPE_EXTRA = [
  "志愿者", "岗前", "培训", "微课", "测评", "话术", "营地", "报告", "通知", "公告", "广播",
  "救助", "求助", "捐赠", "募捐", "名单", "记录", "交接", "值班", "热线", "电话", "表格",
  "签字", "指纹", "证件", "护照", "签证", "入境", "通关", "口岸", "翻译", "口译", "语言",
  "应急", "灾情", "救灾", "救援", "伤员", "伤情", "急救", "医疗", "物资", "安置", "登记",
  "隐私", "个人信息", "谣言", "舆情", "心理", "情绪", "儿童", "老人", "孕妇", "残障",
  "分诊", "问询", "初筛", "咨询", "排查", "走访", "值班", "夜间", "冲突", "投诉", "申诉",
];
const ragState = { scopeWords: null };
const scopeWords = () => {
  if (!ragState.scopeWords) {
    ragState.scopeWords = [...new Set([...SCOPE_EXTRA, ...store.terms.map((t) => t.zh)])].filter((w) => w.length >= 2);
  }
  return ragState.scopeWords;
};

function inScope(question) {
  const q = String(question).toLowerCase();
  return scopeWords().some((w) => q.includes(w.toLowerCase()));
}

async function ensureKbVectors() {
  if (!hasBigModel()) return false;
  if (kbVectors && kbVectors.length === store.kb.length) return true;
  const texts = store.kb.map((k) => `${k.docTitle} 第${k.page}页 ${k.text}`);
  kbVectors = await embed(texts);
  kbVectorsSize = store.kb.length;
  return Boolean(kbVectors?.length);
}

async function retrieve(question, k = 4) {
  if (hasBigModel()) {
    try {
      const ok = await ensureKbVectors();
      if (ok) {
        const [qv] = await embed([question]);
        if (qv) {
          const scored = store.kb.map((chunk, i) => ({ chunk, score: cosine(qv, kbVectors[i]) }));
          scored.sort((a, b) => b.score - a.score);
          return { mode: "bigmodel", topScore: scored[0]?.score || 0, hits: scored.slice(0, k), threshold: EMBED_THRESHOLD };
        }
      }
    } catch (e) {
      // 记录真实原因，便于在 CloudBase 日志中排查；对外仍降级为本地检索
      console.error("[BigModel] 向量检索失败，已降级本地 TF-IDF：", e.message);
    }
  }
  const hits = searchKB(question, k).map((r) => ({ chunk: r.item, score: r.score }));
  return { mode: "local", topScore: hits[0]?.score || 0, hits, threshold: LOCAL_THRESHOLD };
}

const REFUSAL =
  "现有知识库中没有找到足够依据来回答这个问题。为避免在应急场景中给出不可靠信息，我先不猜测。" +
  "本知识库覆盖：岗前培训、分诊问询、知情告知与隐私、物资发放与安置登记、特殊人群沟通、谣言核查、跨境语言支持、心理急救、卫生防疫、术语与口译伦理。" +
  "您可以换一种问法，或联系现场带队人核实；涉及伤情与用药的问题，请直接咨询医疗点。";

const OUT_OF_SCOPE =
  "这个问题不在应急语言服务知识库的范围内，我不做回答，以免给出与现场无关的信息。" +
  "我擅长的是：岗前培训流程、分诊问询话术、知情告知与隐私保护、物资发放与安置登记、特殊人群沟通、谣言核查、跨境语言支持、心理急救、卫生防疫和术语规范。";

function citationOf(chunk, n, score) {
  return {
    n,
    id: chunk.id,
    doc: chunk.docShort || chunk.docTitle,
    docTitle: chunk.docTitle,
    page: chunk.page,
    url: store.docs[chunk.docId]?.url || chunk.sourceUrl || "#/qa",
    source: chunk.source,
    text: chunk.text,
    score: Number(score.toFixed(3)),
  };
}

const SYS =
  "你是“语安”应急语言服务知识助手，面向应急语言服务志愿者与基层培训教师。" +
  "只能依据提供的知识库片段回答，不得使用片段之外的事实，不得编造数字、机构与规定。" +
  "每个要点后用 [1][2] 标注依据编号；如果片段不足以回答，直接说明“知识库中没有足够依据”，并给出可执行的下一步建议。" +
  "回答使用简体中文，先给结论，再给要点，控制在 200 字以内。";

export async function ask(question, { k = 4 } = {}) {
  const t0 = Date.now();
  const q = String(question || "").trim();
  if (q.length < 2) throw new Error("问题太短");
  if (!inScope(q)) {
    return {
      refused: true,
      answer: OUT_OF_SCOPE,
      citations: [],
      retrieval: { mode: "scope-guard", topScore: 0, threshold: 0, chunks: 0 },
      elapsedMs: Date.now() - t0,
      engine: "scope-guard",
    };
  }
  const ret = await retrieve(q, k);
  const above = ret.hits
    .filter((h) => h.score >= (ret.mode === "bigmodel" ? EMBED_THRESHOLD : 0.1))
    .slice(0, k);
  // 相对阈值：去掉与第一名差距过大的弱相关片段，避免来源堆砌
  const usable = above.filter((h, i) => i === 0 || h.score >= (above[0]?.score || 0) * 0.6).slice(0, 4);

  if (!usable.length) {
    return {
      refused: true,
      answer: REFUSAL,
      citations: [],
      retrieval: { mode: ret.mode, topScore: Number(ret.topScore.toFixed(3)), threshold: ret.threshold, chunks: 0 },
      elapsedMs: Date.now() - t0,
      engine: ret.mode,
    };
  }

  const citations = usable.map((h, i) => citationOf(h.chunk, i + 1, h.score));
  let answer = "";
  let engine = ret.mode === "bigmodel" ? "bigmodel+deepseek" : "local";

  if (ret.mode === "bigmodel" && hasDeepSeek()) {
    const materials = citations.map((c) => `[${c.n}]《${c.docTitle}》第${c.page}页：${c.text}`).join("\n");
    try {
      answer = await chat(
        [
          { role: "system", content: SYS },
          { role: "user", content: `知识库片段：\n${materials}\n\n志愿者的问题：${q}\n\n请依据上述片段回答，并标注 [编号]。` },
        ],
        { temperature: 0.1, maxTokens: 600, timeout: 45000 }
      );
    } catch (e) {
      answer = "";
    }
  }

  if (!answer) {
    engine = "local";
    const parts = [];
    const top = citations[0];
    const sents = topSentences(top.text, q, 2);
    parts.push(`根据《${top.docTitle}》第${top.page}页：${sents.join("")} [1]`);
    const second = citations.find((c, i) => i > 0 && c.score >= top.score * 0.75);
    if (second) {
      const s2 = topSentences(second.text, q, 1);
      if (s2.length) parts.push(`另见《${second.docTitle}》第${second.page}页：${s2.join("")} [${second.n}]`);
    }
    answer = parts.join("\n\n");
  }

  return {
    refused: false,
    answer,
    citations,
    retrieval: {
      mode: ret.mode,
      topScore: Number(ret.topScore.toFixed(3)),
      threshold: ret.threshold,
      chunks: citations.length,
    },
    elapsedMs: Date.now() - t0,
    engine,
  };
}

export function kbStatus() {
  const docs = [...new Set(store.kb.map((k) => k.docId))];
  return {
    chunks: store.kb.length,
    documents: docs.length,
    lastUpdated: store.kb.reduce((a, k) => (k.updated > a ? k.updated : a), ""),
    mode: hasBigModel() ? "bigmodel" : "local",
    vectorDimension: kbVectors?.[0]?.length || null,
    embedded: hasBigModel() ? Boolean(kbVectors?.length) : Boolean(store.indexes.kb),
  };
}
