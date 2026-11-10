// 应用入口：路由、顶栏交互、全局术语卡
import { getMeta } from "./api.js";
import { esc, toast, closeModal } from "./ui.js";
import { showTerm } from "./views/termDetail.js";
import * as home from "./views/home.js";
import * as news from "./views/news.js";
import * as translate from "./views/translate.js";
import * as terms from "./views/terms.js";
import * as corpus from "./views/corpus.js";
import * as qa from "./views/qa.js";
import * as training from "./views/training.js";
import * as about from "./views/about.js";

const routes = { "": home, home, news, translate, terms, corpus, qa, training, about };
const main = document.getElementById("main");
const nav = document.getElementById("nav");
const menuBtn = document.getElementById("menuBtn");

function setNav(name) {
  nav.querySelectorAll("a").forEach((a) => {
    if (a.dataset.nav === name) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

function closeMenu() {
  nav.classList.remove("open");
  menuBtn?.setAttribute("aria-expanded", "false");
}

menuBtn?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", String(open));
});
nav.addEventListener("click", (e) => {
  if (e.target.closest("a")) closeMenu();
});

// 大字号无障碍模式
const sizeBtn = document.getElementById("textSizeBtn");
function applySize(large) {
  document.documentElement.classList.toggle("large", large);
  sizeBtn?.setAttribute("aria-pressed", String(large));
  sizeBtn.textContent = large ? "标准字" : "大字";
  localStorage.setItem("yuyan.large", large ? "1" : "0");
}
applySize(localStorage.getItem("yuyan.large") === "1");
sizeBtn?.addEventListener("click", () => applySize(!document.documentElement.classList.contains("large")));

async function router() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [name, ...params] = raw.split("/");
  const view = routes[name] || routes[""];
  setNav(name || "home");
  closeMenu();
  closeModal();
  main.innerHTML = `<div class="loading"><span class="spinner"></span>正在加载…</div>`;
  try {
    await view.render(main, params);
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="section"><div class="card card-pad center">
      <h2>页面加载失败</h2>
      <p class="muted" style="margin-top:8px">${esc(e.message || "未知错误")}</p>
      <p style="margin-top:16px"><button class="btn btn-accent" onclick="location.reload()">重新加载</button></p>
    </div></div>`;
  }
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  if (name && name !== "home") document.title = `${nav.querySelector(`[data-nav="${name}"]`)?.textContent || "语安"}｜语安 · 应急语言服务`;
  else document.title = "语安 · 应急语言服务｜志愿者岗前培训与现场知识查询";
}

window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", router);
if (document.readyState !== "loading") router();

// 全局：点击术语高亮 → 术语详情
document.addEventListener("click", (e) => {
  const mark = e.target.closest("mark.term");
  if (!mark) return;
  const id = mark.dataset.termId;
  if (id) showTerm(id);
});

// 页脚信息
getMeta()
  .then((meta) => {
    const stamp = document.getElementById("footStamp");
    if (stamp) stamp.textContent = `数据快照：${new Date(meta.stats.newsUpdatedAt || Date.now()).toLocaleString("zh-CN", { hour12: false })}`;
    const url = document.getElementById("footUrl");
    if (url) url.textContent = location.origin;
    const chip = document.getElementById("modeChip");
    if (chip) {
      chip.title = meta.config.deepseek
        ? "已配置 DeepSeek，翻译与问答为正式模式"
        : "未配置 DeepSeek，翻译与问答处于降级演示模式";
    }
  })
  .catch(() => toast("无法连接服务端", "err"));
