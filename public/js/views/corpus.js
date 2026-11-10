import { api, getMeta, qs } from "../api.js";
import { esc, fmt, pager, debounce, toast, LANGS } from "../ui.js";

const PAGE_SIZE = 15;

export async function render(root) {
  const meta = await getMeta();
  const state = { q: "", pair: "", domain: "", page: 1 };
  const pairs = meta.stats.corpusPairs || [];

  root.innerHTML = `
    <header class="page-head">
      <span class="sec-kicker">Module 04 · Parallel corpus</span>
      <h1>平行语料库</h1>
      <p class="lead">句对一一对齐，来源可追溯。服务启动时对原文建立向量索引，翻译时检索相似句，为机器翻译提供双语上下文参考。</p>
      <div class="page-meta">
        <span>句对总量 <b>${fmt(meta.stats.corpus)}</b></span>
        <span>语种对 <b>${pairs.length}</b> 组</span>
        <span><b>100%</b> 标注来源与审核状态</span>
        <span class="badge badge-ok">已建立向量索引</span>
      </div>
    </header>

    <div class="notice" style="margin-top:22px">
      <div><strong>语料怎么用：</strong>在“多语种翻译”里输入中文时，系统会检索最相近的 3 句语料显示在译文下方；评委可在这里用原文或译文关键词反向核对，确认上下文真实存在。</div>
    </div>

    <div class="toolbar">
      <div class="search-box"><input class="input" id="corpusQ" type="search" placeholder="检索原文或译文，如“检伤分类 / triage”" aria-label="检索语料" /></div>
      <select class="select" id="pairSel" aria-label="按语种对筛选" style="width:auto;min-width:150px">
        <option value="">全部语种对</option>
        ${pairs.map((p) => {
          const [a, b] = p.split("-");
          return `<option value="${esc(p)}">${esc(LANGS[a] || a)} → ${esc(LANGS[b] || b)}</option>`;
        }).join("")}
      </select>
      <select class="select" id="corpusDomain" aria-label="按场景筛选" style="width:auto;min-width:130px">
        <option value="">全部场景</option>
        ${(meta.stats.corpusDomains || []).map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join("")}
      </select>
      <div class="spacer"></div>
      <span class="tiny muted">向量化：TF-IDF 本地索引 / 可切换 BigModel</span>
    </div>

    <div id="corpusCount" class="count-line" style="margin-bottom:12px">正在加载…</div>
    <div id="corpusList" class="corpus-list"></div>
    <div id="corpusPager"></div>
  `;

  const listEl = root.querySelector("#corpusList");
  const countEl = root.querySelector("#corpusCount");
  const pagerEl = root.querySelector("#corpusPager");

  async function load() {
    listEl.innerHTML = `<div class="loading"><span class="spinner"></span>正在检索语料…</div>`;
    try {
      const data = await api(`/api/corpus${qs({ ...state, pageSize: PAGE_SIZE })}`);
      countEl.innerHTML = `共 <b>${fmt(data.total)}</b> 句${state.q ? `，匹配“${esc(state.q)}”` : ""} · 第 ${data.page} 页`;
      if (!data.items.length) {
        listEl.innerHTML = `<div class="empty"><h3>没有找到匹配的语料</h3><p>试试更短的关键词，或切换语种对与场景。</p></div>`;
        pagerEl.innerHTML = "";
        return;
      }
      listEl.innerHTML = data.items
        .map(
          (c) => `<article class="card corpus-item">
            <div class="ci-head">
              <span class="badge badge-dark">${esc(LANGS[c.srcLang] || c.srcLang)} → ${esc(LANGS[c.tgtLang] || c.tgtLang)}</span>
              <span class="mono">${esc(c.id)}</span>
              <span class="badge">${esc(c.domain)}</span>
              <span class="badge badge-ok">已向量化</span>
              <span class="badge ${c.status === "已审" ? "" : "badge-warn"}">${esc(c.status)}</span>
            </div>
            <div class="ci-src" lang="${c.srcLang === "zh" ? "zh-CN" : c.srcLang}">${esc(c.src)}</div>
            <div class="ci-tgt" lang="${c.tgtLang}">${esc(c.tgt)}</div>
            <div class="ci-foot">
              <span>来源：${esc(c.source)}</span>
              <span>·</span>
              <span>用于翻译上下文检索</span>
            </div>
          </article>`
        )
        .join("");
      pagerEl.innerHTML = pager(data.page, PAGE_SIZE, data.total, "corpusPage");
    } catch (e) {
      listEl.innerHTML = `<div class="empty"><h3>加载失败</h3><p>${esc(e.message)}</p></div>`;
      toast(e.message, "err");
    }
  }

  root.querySelector("#corpusQ").addEventListener(
    "input",
    debounce((e) => {
      state.q = e.target.value.trim();
      state.page = 1;
      load();
    }, 320)
  );
  root.querySelector("#pairSel").addEventListener("change", (e) => {
    state.pair = e.target.value;
    state.page = 1;
    load();
  });
  root.querySelector("#corpusDomain").addEventListener("change", (e) => {
    state.domain = e.target.value;
    state.page = 1;
    load();
  });
  pagerEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-corpus-page]");
    if (!btn || btn.disabled) return;
    state.page = Number(btn.dataset.corpusPage);
    load().then(() => pagerEl.scrollIntoView({ behavior: "smooth", block: "center" }));
  });

  await load();
}
