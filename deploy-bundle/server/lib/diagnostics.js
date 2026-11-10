// 诊断接口：只在服务端运行，返回 Key 形态与模型连通性，不返回 Key 本身。
import { config } from "./config.js";
import { embed, chat } from "./llm.js";

function keyShape(key = "") {
  const segments = key.split(".").map((s) => s.length);
  return {
    length: key.length,
    hasDot: key.includes("."),
    segmentLengths: segments,
    asciiOnly: /^[\x20-\x7E]*$/.test(key),
    trimmed: key === key.trim(),
    looksLikePlaceholder: /你的|xxx|placeholder|示例|example|sk-你/i.test(key),
  };
}

function sanitize(message = "", key = "") {
  let s = String(message);
  if (key) s = s.split(key).join("***");
  return s.slice(0, 500);
}

export async function diagnose() {
  const out = {
    time: new Date().toISOString(),
    bigmodel: {
      base: config.bigmodel.base,
      model: config.bigmodel.model,
      configured: Boolean(config.bigmodel.key),
      keyShape: keyShape(config.bigmodel.key),
      ok: false,
    },
    deepseek: {
      base: config.deepseek.base,
      model: config.deepseek.model,
      configured: Boolean(config.deepseek.key),
      keyShape: keyShape(config.deepseek.key),
      ok: false,
    },
  };

  if (config.bigmodel.key) {
    const t = Date.now();
    try {
      const vec = await embed(["向量诊断"]);
      out.bigmodel.ok = Boolean(vec?.[0]?.length);
      out.bigmodel.dimension = vec?.[0]?.length || 0;
      out.bigmodel.ms = Date.now() - t;
    } catch (e) {
      out.bigmodel.error = sanitize(e.message, config.bigmodel.key);
      out.bigmodel.ms = Date.now() - t;
    }
  }

  if (config.deepseek.key) {
    const t = Date.now();
    try {
      const text = await chat([{ role: "user", content: "只回复两个字：正常" }], { maxTokens: 16, timeout: 30000 });
      out.deepseek.ok = Boolean(text);
      out.deepseek.reply = text.slice(0, 20);
      out.deepseek.ms = Date.now() - t;
    } catch (e) {
      out.deepseek.error = sanitize(e.message, config.deepseek.key);
      out.deepseek.ms = Date.now() - t;
    }
  }

  return out;
}
