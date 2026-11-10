import { api, getMeta, qs } from "../api.js";
import { esc, fmt, pager, debounce, toast, openModal, STATUS_BADGE, LANGS } from "../ui.js";
import { showTerm } from "./termDetail.js";

const PAGE_SIZE = 20;
const LANG_FILTERS = [
  ["", "全部语种"],
  ["asean", "含东盟语译法"],
  ["vi", "含越南语"],
  ["th", "含泰语"],
  ["id", "含印尼语"],
  ["ms", "含马来语"],
  ["none", "仅中英"],
];

export async function render(root) {
  const meta = await getMeta();
  const state = { q: "", domain: "", lang: "", status: "", page: 1 };

  root.innerHTML = `
    <header class="page-head">
      <span class="sec-kicker">Module 03 · Terminology</span>
      <h1>应急术语库</h1>
      <p class="lead">每条术语都有中文、英文、领域、来源文件与审核状态；高频术语补充越南语、泰语、印尼语、马来语译法。翻译时按这里的指定译法约束输出。</p>
      <div class="page-meta">
        <span>术语总量 <b>${fmt(meta.stats.terms)}</b> 条</span>
        <span>覆盖 <b>${meta.stats.domains.length}</b> 个领域</span>
        <span>含东盟语译法 <b>${fmt(meta.stats.termsWithAsean)}</b> 条</span>
        <span><b>100%</b> 标注来源与审核状态</span>
      </div>
    </header>

    <div class="notice" style="margin-top:22px">
      <div><strong>抽检提示：</strong>点击任意一行查看详情与来源链接；也可以点击右侧“随机抽检 5 条”，系统会随机抽取术语供评委核对来源与审核状态。</div>
    </div>

    <div class="toolbar">
      <div class="search-box"><input class="input" id="termQ" type="search" placeholder="检索中文、英文或东盟语关键词" aria-label="检索术语" /></div>
      <select class="select" id="domainSel" aria-label="按领域筛选" style="width:auto;min-width:130px">
        <option value="">全部领域</option>
        ${meta.stats.domains.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join("")}
      </select>
      <select class="select" id="langSel" aria-label="按语种筛选" style="width:auto;min-width:140px">
        ${LANG_FILTERS.map(([v, label]) => `<option value="${v}">${label}</option>`).join("")}
      </select>
      <select class="select" id="statusSel" aria-label="按审核状态筛选" style="width:auto;min-width:120px">
        <option value="">全部状态</option>
        <option value="已审">已审</option>
        <option value="待审">待审</option>
      </select>
      <div class="spacer"></div>
      <button class="btn btn-sm btn-ghost" id="randomBtn" type="button">随机抽检 5 条</button>
    </div>

    <div id="termCount" class="count-line" style="margin-bottom:12px">正在加载…</div>
    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th style="width:20%">中文术语</th>
            <th style="width:22%">英文</th>
            <th style="width:20%">东盟语示例</th>
            <th style="width:10%">领域</th>
            <th style="width:16%">来源</th>
            <th style="width:8%">审核</th>
            <th style="width:4%"></th>
          </tr>
        </thead>
        <tbody id="termBody"></tbody>
      </table>
    </div>
    <div id="termPager"></div>
  `;

  const body = root.querySelector("#termBody");
  const countEl = root.querySelector("#termCount");
  const pagerEl = root.querySelector("#termPager");

  async function load() {
    body.innerHTML = `<tr><td colspan="7"><div class="loading"><span class="spinner"></span>正在检索术语…</div></td></tr>`;
    try {
      const data = await api(`/api/terms${qs({ ...state, pageSize: PAGE_SIZE })}`);
      countEl.innerHTML = `共 <b>${fmt(data.total)}</b> 条${state.q ? `，匹配“${esc(state.q)}”` : ""} · 第 ${data.page} 页`;
      if (!data.items.length) {
        body.innerHTML = `<tr><td colspan="7"><div class="empty"><h3>没有找到匹配的术语</h3><p>试试更短的关键词，或切换领域与语种筛选。</p></div></td></tr>`;
        pagerEl.innerHTML = "";
        return;
      }
      body.innerHTML = data.items
        .map((t) => {
          const asean = Object.entries(t.langs || {});
          const sample = asean.length
            ? `<div class="cell-asean">${esc(asean[0][1])}</div><div class="tiny muted">${esc(LANGS[asean[0][0]] || asean[0][0])}</div>`
            : `<span class="muted tiny">— 暂无东盟语审定译法</span>`;
          return `<tr data-id="${esc(t.id)}" tabindex="0" role="button" aria-label="查看术语 ${esc(t.zh)}">
            <td><div class="cell-zh">${esc(t.zh)}</div><div class="tiny muted mono">${esc(t.id)}</div></td>
            <td><div class="cell-en" lang="en">${esc(t.en)}</div></td>
            <td>${sample}</td>
            <td><span class="badge">${esc(t.domain)}</span></td>
            <td><div class="tiny" style="max-width:190px">${esc(t.source)}</div></td>
            <td>${STATUS_BADGE(t.status)}</td>
            <td class="muted">›</td>
          </tr>`;
        })
        .join("");
      pagerEl.innerHTML = pager(data.page, PAGE_SIZE, data.total, "termPage");
      body.querySelectorAll("tr[data-id]").forEach((tr) => {
        tr.addEventListener("click", () => showTerm(tr.dataset.id));
        tr.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            showTerm(tr.dataset.id);
          }
        });
      });
    } catch (e) {
      body.innerHTML = `<tr><td colspan="7"><div class="empty"><h3>加载失败</h3><p>${esc(e.message)}</p></div></td></tr>`;
      toast(e.message, "err");
    }
  }

  root.querySelector("#termQ").addEventListener(
    "input",
    debounce((e) => {
      state.q = e.target.value.trim();
      state.page = 1;
      load();
    }, 320)
  );
  root.querySelector("#domainSel").addEventListener("change", (e) => {
    state.domain = e.target.value;
    state.page = 1;
    load();
  });
  root.querySelector("#langSel").addEventListener("change", (e) => {
    state.lang = e.target.value;
    state.page = 1;
    load();
  });
  root.querySelector("#statusSel").addEventListener("change", (e) => {
    state.status = e.target.value;
    state.page = 1;
    load();
  });
  pagerEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-term-page]");
    if (!btn || btn.disabled) return;
    state.page = Number(btn.dataset.termPage);
    load().then(() => pagerEl.scrollIntoView({ behavior: "smooth", block: "center" }));
  });

  root.querySelector("#randomBtn").addEventListener("click", async () => {
    try {
      const totalPages = Math.max(1, Math.ceil(meta.stats.terms / 50));
      const page = 1 + Math.floor(Math.random() * totalPages);
      const data = await api(`/api/terms?pageSize=50&page=${page}`);
      const picks = [...data.items].sort(() => Math.random() - 0.5).slice(0, 5);
      openModal({
        title: "随机抽检 5 条术语",
        sub: "核对译法、来源与审核状态；点击来源可直接打开原始文件",
        wide: true,
        body: `<div style="display:grid;gap:10px">${picks
          .map(
            (t) => `<div class="context-item">
              <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
                <div><b>${esc(t.zh)}</b> <span class="muted">/ ${esc(t.en)}</span></div>
                <div>${STATUS_BADGE(t.status)}</div>
              </div>
              <div class="tiny muted" style="margin-top:6px">${esc(t.domain)} · 编号 ${esc(t.id)} · 覆盖语种：${esc(t.reviewScope || "中、英")}</div>
              <div class="tiny" style="margin-top:4px">来源：<a href="${esc(t.sourceUrl)}" target="_blank" rel="noopener" style="color:var(--accent-dark)">${esc(t.source)}</a></div>
            </div>`
          )
          .join("")}</div>`,
        foot: `<button class="btn btn-sm btn-accent" data-close="1">已核对</button>`,
      });
    } catch (e) {
      toast(e.message, "err");
    }
  });

  await load();
}
