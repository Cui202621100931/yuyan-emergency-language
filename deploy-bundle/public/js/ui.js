// 通用 UI 工具：转义、高亮、弹层、吐司、朗读、分页
export const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const fmt = (n) => Number(n || 0).toLocaleString("zh-CN");

export function debounce(fn, ms = 320) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function toast(message, type = "ok") {
  const wrap = document.getElementById("toastWrap");
  if (!wrap) return;
  const el = document.createElement("div");
  el.className = `toast ${type === "err" ? "err" : ""}`;
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity .3s";
    setTimeout(() => el.remove(), 320);
  }, 2400);
}

let onCloseModal = null;
export function openModal({ title, sub = "", body = "", foot = "", wide = false, onMount }) {
  const root = document.getElementById("modalRoot");
  root.hidden = false;
  root.innerHTML = `
    <div class="modal-backdrop" data-close="1"></div>
    <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}" ${wide ? 'style="width:min(860px,100%)"' : ""}>
      <div class="modal-head">
        <div><h3>${esc(title)}</h3>${sub ? `<div class="sub">${sub}</div>` : ""}</div>
        <button class="btn-icon" data-close="1" aria-label="关闭">✕</button>
      </div>
      <div class="modal-body">${body}</div>
      ${foot ? `<div class="modal-foot">${foot}</div>` : ""}
    </div>`;
  root.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeModal));
  const modal = root.querySelector(".modal");
  modal.querySelectorAll("a[href^='#/']").forEach((a) => a.addEventListener("click", () => setTimeout(closeModal, 30)));
  document.body.style.overflow = "hidden";
  const focusable = modal.querySelector("button, a, input, select, textarea");
  focusable?.focus();
  onCloseModal = onMount ? onMount(modal) : null;
}

export function closeModal() {
  const root = document.getElementById("modalRoot");
  if (!root || root.hidden) return;
  root.hidden = true;
  root.innerHTML = "";
  document.body.style.overflow = "";
  if (typeof onCloseModal === "function") onCloseModal();
  onCloseModal = null;
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

export function highlight(text = "", terms = [], side = "src") {
  const source = String(text);
  const marks = [];
  for (const t of terms || []) {
    const surface = side === "src" ? t.surface : t.target;
    if (!surface || !surface.trim()) continue;
    marks.push({ surface, t });
  }
  if (!marks.length) return esc(source);
  marks.sort((a, b) => b.surface.length - a.surface.length);
  const lower = source.toLowerCase();
  const used = new Array(source.length).fill(false);
  const found = [];
  for (const m of marks) {
    const needle = m.surface.toLowerCase();
    let from = 0;
    while (from <= lower.length - needle.length) {
      const i = lower.indexOf(needle, from);
      if (i < 0) break;
      let ok = true;
      for (let k = i; k < i + needle.length; k++) if (used[k]) { ok = false; break; }
      if (ok) {
        for (let k = i; k < i + needle.length; k++) used[k] = true;
        found.push({ start: i, end: i + needle.length, t: m.t, surface: m.surface });
      }
      from = i + needle.length;
    }
  }
  found.sort((a, b) => a.start - b.start);
  let html = "";
  let pos = 0;
  for (const f of found) {
    html += esc(source.slice(pos, f.start));
    const title = `${f.t.zh} / ${f.t.en}${f.t.status ? " · " + f.t.status : ""}`;
    html += `<mark class="term ${side === "tgt" ? "tgt" : ""}" data-term-id="${esc(f.t.id)}" title="${esc(title)}">${esc(source.slice(f.start, f.end))}</mark>`;
    pos = f.end;
  }
  html += esc(source.slice(pos));
  return html;
}

const SPEECH_LANG = { zh: "zh-CN", en: "en-US", vi: "vi-VN", th: "th-TH", id: "id-ID", ms: "ms-MY", my: "my-MM", km: "km-KH", lo: "lo-LA" };

export function speak(text, lang = "zh") {
  if (!("speechSynthesis" in window)) {
    toast("当前浏览器不支持语音播报，建议使用 Chrome / Edge", "err");
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text).slice(0, 500));
  u.lang = SPEECH_LANG[lang] || "zh-CN";
  u.rate = 0.92;
  u.onerror = () => toast("该语言暂无可用语音包，已尝试默认语音", "err");
  window.speechSynthesis.speak(u);
  toast("正在播报");
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("已复制到剪贴板");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      toast("已复制到剪贴板");
    } catch {
      toast("复制失败，请手动选择文本", "err");
    }
    ta.remove();
  }
}

export function pager(page, pageSize, total, dataPage = "page") {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return "";
  const nums = [];
  const push = (p) => {
    if (!nums.includes(p) && p >= 1 && p <= pages) nums.push(p);
  };
  push(1);
  for (let p = page - 1; p <= page + 1; p++) push(p);
  push(pages);
  nums.sort((a, b) => a - b);
  let html = `<div class="pager">`;
  html += `<button data-${dataPage}="${page - 1}" ${page <= 1 ? "disabled" : ""} aria-label="上一页">上一页</button>`;
  let last = 0;
  for (const n of nums) {
    if (n - last > 1) html += `<span class="muted tiny">…</span>`;
    html += `<button data-${dataPage}="${n}" ${n === page ? 'aria-current="true"' : ""}>${n}</button>`;
    last = n;
  }
  html += `<button data-${dataPage}="${page + 1}" ${page >= pages ? "disabled" : ""} aria-label="下一页">下一页</button>`;
  html += `</div>`;
  return html;
}

export const STATUS_BADGE = (status) =>
  status === "已审" ? `<span class="badge badge-ok">已审</span>` : `<span class="badge badge-warn">${esc(status || "待审")}</span>`;

export const sourceClass = (short = "") => (short.includes("UN") ? "un" : short.includes("IFRC") ? "ifrc" : short.includes("USGS") ? "usgs" : "");

export const LANGS = {
  zh: "中文",
  en: "英语",
  vi: "越南语",
  th: "泰语",
  my: "缅甸语",
  km: "高棉语",
  lo: "老挝语",
  ms: "马来语",
  id: "印尼语",
};
