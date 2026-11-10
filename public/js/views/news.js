import { api, getMeta, qs } from "../api.js";
import { esc, fmt, pager, debounce, sourceClass, toast } from "../ui.js";

const PAGE_SIZE = 12;

export async function render(root) {
  const meta = await getMeta();
  const state = { q: "", source: "", topic: "", page: 1 };
  const sources = meta.stats.newsSources || [];

  root.innerHTML = `
    <header class="page-head">
      <span class="sec-kicker">Module 01 · Aggregation</span>
      <h1>外语资讯聚合</h1>
      <p class="lead">把 UN News、USGS 与 IFRC 的公开信息抓取下来、翻译成中文，保留原文标题、发布时间与原文链接。评委可以逐条点开核对来源。</p>
      <div class="page-meta">
        <span>共 <b id="newsTotal">—</b> 条</span>
        <span><b>${sources.length}</b> 个权威外文来源</span>
        <span>快照更新：<b id="newsTime" class="mono">—</b></span>
        <span class="badge badge-accent">全部内容可中文浏览</span>
      </div>
    </header>

    <div class="notice" style="margin-top:22px">
      <div>
        <strong>数据说明：</strong>中文标题由机器翻译并人工校订，摘要由机译或结构化模板生成；所有条目均保留英文原标题与来源链接。本页仅用于课程教学演示，<span class="nowrap">不构成灾情通报</span>。
      </div>
    </div>

    <div class="toolbar">
      <div class="search-box"><input class="input" id="newsQ" type="search" placeholder="搜索中文标题、摘要或英文原文" aria-label="搜索资讯" /></div>
      <div class="chip-row" id="sourceChips">
        <button class="chip" data-source="" aria-pressed="true">全部<span class="cnt">${meta.stats.news}</span></button>
        ${sources
          .map(
            (s) =>
              `<button class="chip" data-source="${esc(s.short)}" aria-pressed="false">${esc(s.short)}<span class="cnt">${s.count}</span></button>`
          )
          .join("")}
      </div>
      <div class="spacer"></div>
      <select class="select" id="topicSel" aria-label="按主题筛选" style="width:auto;min-width:150px">
        <option value="">全部主题</option>
      </select>
    </div>

    <div id="newsCount" class="count-line" style="margin-bottom:14px">正在加载…</div>
    <div id="newsList" class="news-grid"></div>
    <div id="newsPager"></div>
  `;

  const listEl = root.querySelector("#newsList");
  const countEl = root.querySelector("#newsCount");
  const pagerEl = root.querySelector("#newsPager");
  const totalEl = root.querySelector("#newsTotal");
  const timeEl = root.querySelector("#newsTime");
  const topicSel = root.querySelector("#topicSel");

  let topicsFilled = false;

  async function load() {
    listEl.innerHTML = `<div class="loading" style="grid-column:1/-1"><span class="spinner"></span>正在加载资讯…</div>`;
    try {
      const data = await api(`/api/news${qs({ ...state, pageSize: PAGE_SIZE })}`);
      totalEl.textContent = fmt(data.total);
      timeEl.textContent = new Date(data.generatedAt).toLocaleString("zh-CN", { hour12: false });
      if (!topicsFilled) {
        topicSel.insertAdjacentHTML(
          "beforeend",
          (data.topics || []).map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")
        );
        topicsFilled = true;
      }
      countEl.innerHTML = `共 <b>${fmt(data.total)}</b> 条${state.q ? `，匹配“${esc(state.q)}”` : ""} · 每页 ${PAGE_SIZE} 条`;
      if (!data.items.length) {
        listEl.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>没有找到相关资讯</h3><p>试试更换来源，或搜索“地震”“霍乱”“安置”等关键词。</p></div>`;
        pagerEl.innerHTML = "";
        return;
      }
      listEl.innerHTML = data.items.map(card).join("");
      pagerEl.innerHTML = pager(data.page, PAGE_SIZE, data.total, "newsPage");
    } catch (e) {
      listEl.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>加载失败</h3><p>${esc(e.message)}</p></div>`;
      toast(e.message, "err");
    }
  }

  function card(n) {
    const summary = n.summaryZh ? `<p>${esc(n.summaryZh)}</p>` : "";
    const en = n.titleEn && n.titleEn !== n.titleZh ? `<div class="news-en" lang="en">${esc(n.titleEn)}</div>` : "";
    return `
      <article class="card card-hover news-card">
        <div class="news-top">
          <span><i class="source-dot ${sourceClass(n.sourceShort)}"></i>${esc(n.sourceShort)} · ${esc(n.region)}</span>
          <time class="mono">${esc(n.published)}</time>
        </div>
        <h3>${esc(n.titleZh)}</h3>
        ${summary}
        ${en}
        <div class="news-foot">
          <span class="badge">已中文化 · ${esc(n.topic)}</span>
          <a href="${esc(n.url)}" target="_blank" rel="noopener">原文链接 ↗</a>
        </div>
      </article>`;
  }

  root.querySelector("#newsQ").addEventListener(
    "input",
    debounce((e) => {
      state.q = e.target.value.trim();
      state.page = 1;
      load();
    }, 350)
  );

  root.querySelector("#sourceChips").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-source]");
    if (!btn) return;
    state.source = btn.dataset.source;
    state.page = 1;
    root.querySelectorAll("#sourceChips .chip").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    load();
  });

  topicSel.addEventListener("change", () => {
    state.topic = topicSel.value;
    state.page = 1;
    load();
  });

  pagerEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-news-page]");
    if (!btn || btn.disabled) return;
    state.page = Number(btn.dataset.newsPage);
    load().then(() => pagerEl.scrollIntoView({ behavior: "smooth", block: "center" }));
  });

  await load();
}
