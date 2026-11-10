import { api } from "../api.js";
import { esc, openModal, toast, STATUS_BADGE, LANGS } from "../ui.js";

export async function showTerm(id) {
  try {
    const t = await api(`/api/terms/${id}`);
    const langs = Object.entries(t.langs || {});
    const langHtml = langs.length
      ? `<div class="lang-grid">${langs
          .map(
            ([code, val]) =>
              `<div class="lang-cell"><span>${esc(LANGS[code] || code)}</span>${esc(val)}</div>`
          )
          .join("")}</div>`
      : `<p class="notice" style="margin-top:12px">该术语暂无东盟语种审定译法；翻译时由引擎结合上下文处理，遇到关键场景请向术语组确认。</p>`;
    const examples = (t.examples || []).length
      ? `<h4 style="margin-top:22px;font-size:.95rem">语料中的用例</h4>
         <div style="display:grid;gap:8px;margin-top:10px">${t.examples
           .map(
             (e) =>
               `<div class="context-item"><div class="ci-src">${esc(e.src)}</div><div class="ci-tgt">${esc(e.tgt)}</div></div>`
           )
           .join("")}</div>`
      : "";
    openModal({
      title: t.zh,
      sub: `${esc(t.en)} · ${esc(t.domain)}`,
      body: `
        <dl class="kv-grid">
          <dt>审核状态</dt><dd>${STATUS_BADGE(t.status)} <span class="tiny muted">覆盖语种：${esc(t.reviewScope || "中、英")}</span></dd>
          <dt>术语编号</dt><dd class="mono">${esc(t.id)}</dd>
          <dt>来源</dt><dd><a href="${esc(t.sourceUrl)}" target="_blank" rel="noopener">${esc(t.source)} ↗</a></dd>
          <dt>更新时间</dt><dd class="mono">${esc(t.updated)}</dd>
        </dl>
        <h4 style="margin-top:22px;font-size:.95rem">多语种译法</h4>
        ${langHtml}
        ${examples}
        <p class="tiny muted" style="margin-top:20px">术语译法用于“术语约束翻译”：译文必须原样采用上述指定译法，并在原文与译文中同时高亮。</p>
      `,
      foot: `<a class="btn btn-sm btn-ghost" href="#/translate" data-close="1">用它试译一句</a>
             <a class="btn btn-sm btn-accent" href="#/terms" data-close="1">返回术语库</a>`,
    });
  } catch (e) {
    toast(e.message, "err");
  }
}
