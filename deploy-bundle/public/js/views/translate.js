import { api, getMeta } from "../api.js";
import { esc, highlight, speak, copyText, toast, LANGS, STATUS_BADGE } from "../ui.js";

const EXAMPLES = [
  { text: "请告诉我您哪里不舒服？", from: "zh", to: "vi" },
  { text: "我们需要立即把伤员转移到医疗点。", from: "zh", to: "th" },
  { text: "请出示您的身份证件，我们为您登记。", from: "zh", to: "en" },
  { text: "所有物资都是免费发放的，遇到收费请举报。", from: "zh", to: "id" },
  { text: "您现在安全了，我们会一直陪着您。", from: "zh", to: "ms" },
];

export async function render(root) {
  const meta = await getMeta();
  const langs = meta.languages;
  let last = null;

  root.innerHTML = `
    <header class="page-head">
      <span class="sec-kicker">Module 02 · Translation</span>
      <h1>多语种翻译台</h1>
      <p class="lead">中文、英语与东盟七语双向互译。翻译时自动套用术语库指定译法，原文与译文同步高亮；下方给出命中的术语和可参考的平行语料。</p>
      <div class="page-meta">
        <span><b>9</b> 种语言双向互译</span>
        <span>术语约束：<b>${meta.stats.terms}</b> 条</span>
        <span>语料上下文：<b>${meta.stats.corpus}</b> 句</span>
        <span class="badge ${meta.engine.translation === "deepseek" ? "badge-ok" : "badge-warn"}">${esc(meta.engine.translationLabel)}</span>
      </div>
    </header>

    <div class="notice" style="margin-top:22px">
      <div><strong>怎么用：</strong>选好源语言与目标语言，输入一句话（不超过 800 字），按“翻译”或 <span class="mono">Ctrl/⌘ + Enter</span>。译文中的<span style="border-bottom:1px dotted var(--accent)">下划线词</span>是术语库命中项，悬停可看中英对照，点击可查看来源与审核状态。</div>
    </div>

    <div class="translate-wrap">
      <div class="translate-shell">
        <section class="card trans-panel">
          <div class="trans-head">
            <label class="tiny muted" for="fromSel">源语言</label>
            <select id="fromSel" class="select" aria-label="源语言">
              ${langs.map((l) => `<option value="${l.code}" ${l.code === "zh" ? "selected" : ""}>${l.name}</option>`).join("")}
            </select>
            <span class="spacer" style="flex:1"></span>
            <span class="badge">原文</span>
          </div>
          <div class="trans-body">
            <textarea id="srcText" class="textarea" maxlength="800" placeholder="输入需要翻译的应急场景用语…" aria-label="原文输入">伤员右大腿骨折，出现失血性休克，需要立即止血并转运。</textarea>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span class="trans-count" id="srcCount">0 / 800</span>
              <span class="tiny muted">Ctrl / ⌘ + Enter 快速翻译</span>
            </div>
            <div id="srcPreview" class="hidden" style="border-top:1px dashed var(--line);padding-top:12px;font-size:.94rem;line-height:1.9">
              <div class="tiny muted" style="margin-bottom:4px">原文（术语高亮）</div>
              <div id="srcPreviewBody"></div>
            </div>
          </div>
          <div class="trans-tools">
            <div class="left">
              <button class="btn-icon" id="speakSrc" type="button" title="朗读原文" aria-label="朗读原文">◍</button>
              <button class="btn-icon" id="clearSrc" type="button" title="清空" aria-label="清空">✕</button>
            </div>
            <button class="btn btn-accent" id="doTranslate" type="button">翻译</button>
          </div>
        </section>

        <section class="card trans-panel">
          <div class="trans-head">
            <label class="tiny muted" for="toSel">目标语言</label>
            <select id="toSel" class="select" aria-label="目标语言">
              ${langs.map((l) => `<option value="${l.code}" ${l.code === "vi" ? "selected" : ""}>${l.name}</option>`).join("")}
            </select>
            <span class="spacer" style="flex:1"></span>
            <span class="badge badge-accent">译文</span>
          </div>
          <div class="trans-body">
            <div class="output" id="outText"><span class="placeholder">译文会显示在这里，命中术语将在两侧同时高亮。</span></div>
          </div>
          <div class="trans-tools">
            <div class="left">
              <button class="btn-icon" id="speakOut" type="button" title="朗读译文" aria-label="朗读译文">◍</button>
              <button class="btn-icon" id="copyOut" type="button" title="复制译文" aria-label="复制译文">⧉</button>
            </div>
            <span class="tiny muted" id="outMeta"></span>
          </div>
        </section>
      </div>
      <button class="swap-btn" id="swapBtn" type="button" title="交换源语言与目标语言" aria-label="交换语言">⇄</button>
    </div>

    <div class="examples">
      <span class="tiny muted">示例：</span>
      ${EXAMPLES.map(
        (ex, i) =>
          `<button class="example-chip" type="button" data-ex="${i}">${esc(ex.text.length > 20 ? ex.text.slice(0, 20) + "…" : ex.text)}</button>`
      ).join("")}
    </div>

    <div id="resultExtra"></div>

    <p class="engine-note">
      <span>翻译引擎：<b>${esc(meta.engine.translationLabel)}</b></span>
      <span>问答引擎：<b>${esc(meta.engine.ragLabel)}</b></span>
      <span>术语与语料均来自站内数据库，可在“术语库 / 平行语料”核对来源。</span>
    </p>
  `;

  const src = root.querySelector("#srcText");
  const out = root.querySelector("#outText");
  const fromSel = root.querySelector("#fromSel");
  const toSel = root.querySelector("#toSel");
  const count = root.querySelector("#srcCount");
  const btn = root.querySelector("#doTranslate");
  const srcPreview = root.querySelector("#srcPreview");
  const srcPreviewBody = root.querySelector("#srcPreviewBody");
  const extra = root.querySelector("#resultExtra");
  const outMeta = root.querySelector("#outMeta");

  const updateCount = () => (count.textContent = `${src.value.length} / 800`);
  updateCount();
  src.addEventListener("input", updateCount);

  function setLoading(on) {
    btn.disabled = on;
    btn.textContent = on ? "翻译中…" : "翻译";
    if (on) out.innerHTML = `<div class="loading" style="padding:20px 0"><span class="spinner"></span>正在翻译…</div>`;
  }

  async function run() {
    const text = src.value.trim();
    if (!text) {
      toast("请输入需要翻译的内容", "err");
      src.focus();
      return;
    }
    const from = fromSel.value;
    const to = toSel.value;
    if (from === to) {
      toast("源语言与目标语言相同", "err");
      return;
    }
    setLoading(true);
    try {
      const data = await api("/api/translate", { method: "POST", body: { text, from, to } });
      last = data;
      if (data.translation) {
        out.innerHTML = highlight(data.translation, data.terms, "tgt");
        srcPreviewBody.innerHTML = highlight(text, data.terms, "src");
        srcPreview.classList.remove("hidden");
      } else {
        out.innerHTML = `<span class="placeholder">暂时没有获得译文。${data.warning ? esc(data.warning) : "请检查网络，或在服务端配置 DeepSeek Key。"}</span>`;
      }
      outMeta.textContent = `${data.engineLabel} · ${data.elapsedMs} ms · 术语 ${data.hits}/${data.total}`;
      renderExtra(data);
      if (data.warning) toast("翻译已降级，详见下方说明", "err");
    } catch (e) {
      out.innerHTML = `<span class="placeholder">翻译失败：${esc(e.message)}</span>`;
      toast(e.message, "err");
    } finally {
      setLoading(false);
    }
  }

  function renderExtra(data) {
    const warn = data.warning
      ? `<div class="notice" style="margin-top:16px"><div><strong>降级提示：</strong>${esc(data.warning)}。当前展示的是降级引擎结果，正式验收请配置 DeepSeek Key。</div></div>`
      : "";
    const termCards = data.terms.length
      ? `<div class="term-hit-grid">${data.terms
          .map(
            (t) => `<div class="term-hit">
              <div class="th-top"><b>${esc(t.zh)} <span class="muted" style="font-weight:400">/ ${esc(t.en)}</span></b>
              <span class="badge ${t.hit ? "badge-ok" : "badge-warn"}">${t.hit ? "已采用" : t.target ? "未命中" : "无译法"}</span></div>
              <div class="th-tgt">${esc(t.target || "—")}</div>
              <div class="th-src">${esc(t.domain)} · ${esc(t.status)} · <a href="${esc(t.sourceUrl)}" target="_blank" rel="noopener" style="color:var(--accent-dark)">${esc(t.source)}</a></div>
            </div>`
          )
          .join("")}</div>`
      : `<p class="small muted">未命中术语库。可以尝试更贴近应急场景的表达，或到 <a href="#/terms" style="color:var(--accent-dark)">术语库</a> 检索关键词。</p>`;

    const context = data.context.length
      ? `<div class="context-list">${data.context
          .map(
            (c) => `<div class="context-item">
              <div class="ci-src">${esc(c.src)}</div>
              <div class="ci-tgt">${esc(c.tgt)}</div>
              <div class="ci-meta"><span>${esc(c.source)}</span><span>相似度 ${c.score}</span></div>
            </div>`
          )
          .join("")}</div>`
      : `<p class="small muted">当前语种方向暂无平行语料，翻译由术语与引擎兜底。中文↔英语方向可检索 ${meta.stats.corpus} 句语料上下文。</p>`;

    extra.innerHTML = `
      ${warn}
      <section class="term-hits">
        <div class="sec-head" style="margin-bottom:12px">
          <div><span class="sec-kicker">Terminology</span><h2 style="font-size:1.25rem">命中术语 ${data.hits} / ${data.total}</h2></div>
          <span class="tiny muted">译文必须原样采用指定译法</span>
        </div>
        ${termCards}
      </section>
      <section class="term-hits">
        <div class="sec-head" style="margin-bottom:12px">
          <div><span class="sec-kicker">Corpus context</span><h2 style="font-size:1.25rem">参考平行语料</h2></div>
          <span class="tiny muted">向量检索 · 为译文提供双语上下文</span>
        </div>
        ${context}
      </section>
    `;
  }

  root.querySelector("#doTranslate").addEventListener("click", run);
  src.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      run();
    }
  });

  root.querySelector("#swapBtn").addEventListener("click", () => {
    const f = fromSel.value;
    fromSel.value = toSel.value;
    toSel.value = f;
    if (last?.translation) {
      src.value = last.translation;
      updateCount();
    }
    out.innerHTML = `<span class="placeholder">已交换语言方向，点击“翻译”继续。</span>`;
    outMeta.textContent = "";
    srcPreview.classList.add("hidden");
    extra.innerHTML = "";
  });

  root.querySelector("#clearSrc").addEventListener("click", () => {
    src.value = "";
    updateCount();
    out.innerHTML = `<span class="placeholder">译文会显示在这里，命中术语将在两侧同时高亮。</span>`;
    srcPreview.classList.add("hidden");
    extra.innerHTML = "";
    outMeta.textContent = "";
    src.focus();
  });

  root.querySelector("#speakSrc").addEventListener("click", () => speak(src.value, fromSel.value));
  root.querySelector("#speakOut").addEventListener("click", () => {
    if (!last?.translation) return toast("还没有译文", "err");
    speak(last.translation, toSel.value);
  });
  root.querySelector("#copyOut").addEventListener("click", () => {
    if (!last?.translation) return toast("还没有译文", "err");
    copyText(last.translation);
  });

  root.querySelectorAll("[data-ex]").forEach((b) => {
    b.addEventListener("click", () => {
      const ex = EXAMPLES[Number(b.dataset.ex)];
      src.value = ex.text;
      fromSel.value = ex.from;
      toSel.value = ex.to;
      updateCount();
      run();
    });
  });

  // 演示参数：用于汇报截图 / 现场演示自动出结果
  if (new URLSearchParams(location.search).get("demo") === "translate") {
    setTimeout(run, 350);
  }
}
