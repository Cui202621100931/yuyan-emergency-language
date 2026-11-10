import { api, getMeta } from "../api.js";
import { esc, toast, openModal, copyText } from "../ui.js";

const SUGGESTIONS = [
  "志愿者到岗前需要完成哪几步？",
  "分诊问询的初筛四问是什么？",
  "采集个人信息时要遵守哪些隐私规范？",
  "物资发放如何防止重复领取？",
  "遇到语言不通的受灾群众怎么办？",
  "灾后心理急救的五项原则是什么？",
  "营地发现发热病人应该怎么报告？",
];

export async function render(root) {
  const meta = await getMeta();
  const kb = await api("/api/kb/status").catch(() => null);

  root.innerHTML = `
    <header class="page-head">
      <span class="sec-kicker">Module 05 · Retrieval augmented generation</span>
      <h1>可追溯来源问答</h1>
      <p class="lead">基于站内知识库回答问题，每条结论标注文档与页码；知识库覆盖不到的问题会明确拒答，而不是编一个听起来合理的答案。</p>
      <div class="page-meta">
        <span>知识切片 <b>${kb ? kb.chunks : meta.stats.kb}</b> 个</span>
        <span>文档 <b>${kb ? kb.documents : meta.stats.docs}</b> 份</span>
        <span>检索：<b>${esc(meta.engine.embedding)}</b></span>
        <span class="badge ${meta.config.deepseek && meta.config.bigmodel ? "badge-ok" : "badge-warn"}">${esc(meta.engine.ragLabel)}</span>
      </div>
    </header>

    <div class="notice" style="margin-top:22px">
      <div><strong>回答边界：</strong>只使用知识库中的 120 个切片；涉及伤情判断、用药与法律决定时，助手会建议咨询现场专业人员。回答末尾的来源卡片可点开查看原文段落。</div>
    </div>

    <div class="qa-layout">
      <section class="card chat-card">
        <div class="chat-log" id="chatLog" aria-live="polite">
          <div class="msg assistant">
            <div class="msg-avatar">语</div>
            <div class="msg-body">
              <p>我是语安知识助手。你可以问我岗前培训流程、分诊话术、知情告知与隐私、物资发放与安置登记、安置点沟通、谣言核查、跨境语言支持、心理急救、卫生防疫和术语规范。</p>
              <p class="small muted">我会在回答里用 [1][2] 标注依据，并在下面列出可点开的来源。知识库以外的内容我会直接说明。</p>
            </div>
          </div>
        </div>
        <div class="chat-input">
          <textarea id="qaInput" rows="1" placeholder="输入问题，例如：物资发放如何防止重复领取？（Enter 发送，Shift + Enter 换行）" aria-label="输入问题"></textarea>
          <button class="btn btn-accent" id="qaSend" type="button">发送</button>
        </div>
      </section>

      <aside class="qa-side">
        <div class="card side-card">
          <h3>知识库状态</h3>
          <div class="kv"><span>切片总数</span><span>${kb ? kb.chunks : "—"}</span></div>
          <div class="kv"><span>文档份数</span><span>${kb ? kb.documents : "—"}</span></div>
          <div class="kv"><span>最近更新</span><span class="mono" style="font-size:.78rem">${kb ? esc(kb.lastUpdated) : "—"}</span></div>
          <div class="kv"><span>向量模式</span><span>${kb && kb.mode === "bigmodel" ? "BigModel" : "本地 TF-IDF"}</span></div>
          <div class="kv"><span>已建索引</span><span>${kb && kb.embedded ? "是" : "启动后按需建立"}</span></div>
          <details class="admin-box">
            <summary>增量更新知识库</summary>
            <div class="field"><label for="kbTitle">文档标题</label><input class="input" id="kbTitle" placeholder="例如：现场指挥部第 3 号通告" /></div>
            <div class="field"><label for="kbPage">页码</label><input class="input" id="kbPage" type="number" min="1" value="1" /></div>
            <div class="field"><label for="kbText">切片内容（≥10 字）</label><textarea class="input" id="kbText" rows="3" placeholder="粘贴新增的规范或口径…"></textarea></div>
            <div class="field"><label for="kbToken">更新令牌</label><input class="input" id="kbToken" type="password" placeholder="演示令牌见 .env 的 ADMIN_TOKEN" /></div>
            <button class="btn btn-sm btn-ghost btn-block" id="kbAdd" type="button" style="margin-top:10px">写入知识库</button>
          </details>
        </div>

        <div class="card side-card">
          <h3>可以这样问</h3>
          <div class="q-suggest" id="qSuggest">
            ${SUGGESTIONS.map((q) => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join("")}
          </div>
        </div>

        <div class="card side-card">
          <h3>引擎说明</h3>
          <p class="small muted">${esc(meta.engine.ragLabel)}。配置 <span class="mono">DEEPSEEK_API_KEY</span> 与 <span class="mono">BIGMODEL_API_KEY</span> 后自动切换为“BigModel 向量检索 + DeepSeek 生成”，无需改代码。</p>
          <p class="tiny muted" style="margin-top:8px">密钥仅在服务端读取，前端不可见。</p>
        </div>
      </aside>
    </div>
  `;

  const log = root.querySelector("#chatLog");
  const input = root.querySelector("#qaInput");
  const sendBtn = root.querySelector("#qaSend");

  function scrollBottom() {
    log.scrollTop = log.scrollHeight;
  }

  function addUser(text) {
    const el = document.createElement("div");
    el.className = "msg user";
    el.innerHTML = `<div class="msg-avatar">我</div><div class="msg-body"><p>${esc(text)}</p></div>`;
    log.appendChild(el);
    scrollBottom();
  }

  function addTyping() {
    const el = document.createElement("div");
    el.className = "msg assistant";
    el.id = "typingMsg";
    el.innerHTML = `<div class="msg-avatar">语</div><div class="msg-body"><span class="spinner" style="display:inline-block;vertical-align:-3px"></span> <span class="small muted">正在检索知识库…</span></div>`;
    log.appendChild(el);
    scrollBottom();
    return el;
  }

  function renderAnswer(data) {
    const body = document.createElement("div");
    body.className = "msg assistant";
    const paras = String(data.answer || "")
      .split(/\n{2,}/)
      .map((p) => `<p>${esc(p).replace(/\[(\d+)\]/g, '<span class="mono" style="color:var(--accent-dark)">[$1]</span>')}</p>`)
      .join("");
    const citations = (data.citations || [])
      .map(
        (c) => `<div class="citation" id="cite-${c.n}">
          <div class="c-top"><span>[${c.n}] 《${esc(c.doc)}》· 第 ${c.page} 页</span>
            <a href="javascript:void(0)" data-doc="${esc(c.id)}" data-docid="${esc((c.url || "").split("/").pop())}" data-page="${c.page}">查看原文 ↗</a></div>
          <div class="c-title">${esc(c.docTitle)}</div>
          <div class="c-snippet">${esc(c.text)}</div>
        </div>`
      )
      .join("");
    const metaLine = `<div class="msg-meta">
        <span>${data.refused ? "已拒答" : "依据 " + (data.citations || []).length + " 个切片"}</span>
        <span>· ${esc(data.engine)}</span>
        <span>· 最高相似度 ${data.retrieval?.topScore ?? "—"}</span>
        <span>· ${data.elapsedMs} ms</span>
        <button class="btn-icon" style="width:auto;height:auto;padding:2px 6px;font-size:.72rem" data-copy="${esc(data.answer || "")}" type="button">复制</button>
      </div>`;
    body.innerHTML = `<div class="msg-avatar">语</div><div class="msg-body ${data.refused ? "refusal" : ""}">${paras}${citations ? `<div class="citations">${citations}</div>` : ""}${metaLine}</div>`;
    body.querySelectorAll("[data-copy]").forEach((b) =>
      b.addEventListener("click", () => copyText(b.dataset.copy))
    );
    body.querySelectorAll("[data-docid]").forEach((a) =>
      a.addEventListener("click", () => openDoc(a.dataset.docid, Number(a.dataset.page)))
    );
    return body;
  }

  async function ask(question) {
    const q = question.trim();
    if (!q) return;
    addUser(q);
    input.value = "";
    input.style.height = "auto";
    sendBtn.disabled = true;
    const typing = addTyping();
    try {
      const data = await api("/api/qa", { method: "POST", body: { question: q } });
      typing.remove();
      const answerEl = renderAnswer(data);
      log.appendChild(answerEl);
      log.scrollTop += answerEl.getBoundingClientRect().top - log.getBoundingClientRect().top - 12;
    } catch (e) {
      typing.remove();
      const err = document.createElement("div");
      err.className = "msg assistant";
      err.innerHTML = `<div class="msg-avatar">语</div><div class="msg-body refusal"><p>请求失败：${esc(e.message)}</p></div>`;
      log.appendChild(err);
      toast(e.message, "err");
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  sendBtn.addEventListener("click", () => ask(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(input.value);
    }
  });
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(120, input.scrollHeight) + "px";
  });
  root.querySelector("#qSuggest").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-q]");
    if (b) ask(b.dataset.q);
  });

  root.querySelector("#kbAdd").addEventListener("click", async () => {    const docTitle = root.querySelector("#kbTitle").value.trim();
    const page = Number(root.querySelector("#kbPage").value) || 1;
    const text = root.querySelector("#kbText").value.trim();
    const token = root.querySelector("#kbToken").value;
    if (text.length < 10) return toast("切片内容至少 10 个字", "err");
    if (!token) return toast("请填写更新令牌", "err");
    try {
      const res = await api("/api/kb/chunks", { method: "POST", body: { docTitle, page, text, token } });
      toast(`已写入，知识库现有 ${res.total} 个切片`);
      root.querySelector("#kbText").value = "";
    } catch (e) {
      toast(e.message, "err");
    }
  });

  // 演示参数：用于汇报截图 / 现场演示自动提问
  if (new URLSearchParams(location.search).get("demo") === "qa") {
    setTimeout(() => ask("物资发放如何防止重复领取？"), 450);
  }
}

async function openDoc(docId, page) {
  try {
    const doc = await api(`/api/docs/${encodeURIComponent(docId)}`);
    const chunks = (doc.chunks || [])
      .map(
        (c) => `<div class="doc-chunk ${c.page === page ? "target" : ""}">
          <div class="dc-meta">第 ${c.page} 页 · ${c.id}${c.page === page ? " · 本次引用" : ""}</div>
          <div>${esc(c.text)}</div>
        </div>`
      )
      .join("");
    openModal({
      title: doc.title,
      sub: `${esc(doc.source)} · 共 ${doc.chunks.length} 个切片`,
      wide: true,
      body: `${doc.note ? `<p class="small muted" style="margin-bottom:10px">${esc(doc.note)}</p>` : ""}${chunks}`,
      foot: `<button class="btn btn-sm btn-accent" data-close="1">关闭</button>`,
    });
  } catch (e) {
    toast(e.message, "err");
  }
}
