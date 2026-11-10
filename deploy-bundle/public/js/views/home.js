import { getMeta } from "../api.js";
import { esc, fmt, speak } from "../ui.js";

const arrow = `<span class="core-arrow" aria-hidden="true">→</span>`;

const QUICK_ROWS = [
  ["您哪里不舒服？", "Bạn thấy khó chịu ở đâu?", "vi"],
  ["请指一下疼痛的位置。", "Hãy chỉ vào chỗ đau.", "vi"],
  ["我们现在为您做快速检查。", "Chúng tôi sẽ kiểm tra nhanh cho bạn.", "vi"],
];

export async function render(root) {
  const meta = await getMeta();
  const s = meta.stats;
  root.innerHTML = `
  <section class="hero">
    <div class="hero-copy">
      <span class="hero-eyebrow">应急语言服务 · 岗前培训与现场查询</span>
      <h1>让救援现场，<br />不再卡在<em>一句话</em>上</h1>
      <p class="lead">面向应急语言服务志愿者与基层培训教师：3 小时补齐术语、话术与规范；现场卡壳时，一句话即可查到译法、发音与依据。</p>
      <div class="hero-cta">
        <a class="btn btn-accent" href="#/training">开始 3 小时岗前微课</a>
        <a class="btn btn-ghost" style="border-color:rgba(247,244,238,.32);color:#f7f4ee" href="#/translate">现场速查一句话</a>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><b>${fmt(s.terms)}</b><span>条术语 · 附来源</span></div>
        <div class="hero-stat"><b>${fmt(s.corpus)}</b><span>句语料 · 已向量化</span></div>
        <div class="hero-stat"><b>${fmt(s.kb)}</b><span>个知识切片</span></div>
        <div class="hero-stat"><b>${fmt(s.news)}</b><span>条资讯 · ${s.newsSources.length} 个来源</span></div>
      </div>
    </div>
    <div class="quick-stack">
      <div class="quick-card">
        <div class="quick-card-head"><span>现场速查 · 分诊问询</span><span class="mono">ZH → VI</span></div>
        ${QUICK_ROWS.map(
          ([zh, vi]) => `
          <div class="quick-row">
            <div><div class="zh">${esc(zh)}</div><div class="vi">${esc(vi)}</div></div>
            <button class="quick-play" type="button" data-speak="${esc(vi)}" data-lang="vi" aria-label="朗读越南语">▶</button>
          </div>`
        ).join("")}
        <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center">
          <span class="tiny muted">术语已按库内指定译法</span>
          <a class="tiny" style="color:var(--accent-dark);font-weight:600" href="#/translate">打开完整翻译台 →</a>
        </div>
      </div>
      <div class="quick-ghost"></div>
      <div class="quick-tag">中文 · 英语 · 越 · 泰 · 缅 · 高棉 · 老 · 马来 · 印尼</div>
    </div>
  </section>

  <section class="section">
    <div class="sec-head">
      <div>
        <span class="sec-kicker">Serving the front line</span>
        <h2>三种人，三种用法</h2>
        <p class="sec-desc">平台把“岗前培训”和“现场查询”压进同一条路径：先在微课里补齐规范，再在现场用翻译与术语速查兜底。</p>
      </div>
    </div>
    <div class="role-grid">
      <article class="card card-hover role-card">
        <span class="role-kicker">01 · 新到岗志愿者</span>
        <h3>3 小时，补齐上岗前的最后一块短板</h3>
        <p>五个模块、十二份材料、一次简易测评。学完能说清分诊四问、知情告知四要素与物资登记流程。</p>
        <a class="role-link" href="#/training">进入岗前微课</a>
      </article>
      <article class="card card-hover role-card">
        <span class="role-kicker">02 · 一线志愿者</span>
        <h3>卡壳的 10 秒里，查到一句话</h3>
        <p>输入中文即可得到译文、命中术语与参考语料；不确定的表达可以点开术语卡看来源与审核状态。</p>
        <a class="role-link" href="#/translate">打开现场翻译</a>
      </article>
      <article class="card card-hover role-card">
        <span class="role-kicker">03 · 基层培训教师</span>
        <h3>把 120 个知识切片直接变成课件</h3>
        <p>问答结果带文档页码与原文链接，可追溯到具体段落；术语与语料都能按领域、语种筛选后导出讲解。</p>
        <a class="role-link" href="#/qa">试用可溯源问答</a>
      </article>
    </div>
  </section>

  <section class="section">
    <div class="sec-head">
      <div>
        <span class="sec-kicker">Core capabilities · 五项核心功能</span>
        <h2>从“看得懂”到“查得到、说得准”</h2>
        <p class="sec-desc">五项能力串成一条闭环：资讯告诉你外面发生了什么，翻译与术语解决怎么说，语料与问答告诉你为什么这么说。</p>
      </div>
      <a class="btn btn-sm btn-ghost" href="#/about">查看验收对照</a>
    </div>
    <div class="core-grid">
      <a class="card card-hover core-card" href="#/news">
        <span class="core-num">01 / AGGREGATION</span>
        <h3>外语信息聚合</h3>
        <p>UN News、USGS、IFRC 三个权威外文来源，爬取后中文化，保留原文与发布时间。</p>
        <div class="core-meta"><span>${fmt(s.news)} 条 · ${s.newsSources.length} 个来源</span>${arrow}</div>
      </a>
      <a class="card card-hover core-card" href="#/translate">
        <span class="core-num">02 / TRANSLATION</span>
        <h3>多语种翻译</h3>
        <p>中文、英语与东盟七语双向互译，翻译时调用术语库指定译法，并给出语料参考。</p>
        <div class="core-meta"><span>9 种语言 · 术语约束</span>${arrow}</div>
      </a>
      <a class="card card-hover core-card" href="#/terms">
        <span class="core-num">03 / TERMINOLOGY</span>
        <h3>术语管理</h3>
        <p>按中外文关键词检索，按语种与领域筛选；每条术语都有来源、审核状态与多语种译法。</p>
        <div class="core-meta"><span>${fmt(s.terms)} 条 · ${s.domains.length} 个领域</span>${arrow}</div>
      </a>
      <a class="card card-hover core-card" href="#/corpus">
        <span class="core-num">04 / CORPUS</span>
        <h3>平行语料库</h3>
        <p>句对一一对齐，来源可追溯；向量化后在翻译时检索相似句，为机器翻译提供双语上下文。</p>
        <div class="core-meta"><span>${fmt(s.corpus)} 句 · 已向量化</span>${arrow}</div>
      </a>
      <a class="card card-hover core-card" href="#/qa">
        <span class="core-num">05 / RAG</span>
        <h3>可追溯来源问答</h3>
        <p>BigModel 向量索引 + DeepSeek 生成，每条回答标注文档页码或网页 URL；知识库外问题明确拒答。</p>
        <div class="core-meta"><span>${fmt(s.kb)} 切片 · ${s.docs} 份文档</span>${arrow}</div>
      </a>
    </div>
  </section>

  <section class="feature-band">
    <div>
      <span class="sec-kicker">Field features · 特色功能</span>
      <h2>在手套、噪音和黑暗里也能用</h2>
      <p>应急现场不给你慢慢打字的机会。我们把“听、说、带走”三件事做进了页面：语音播报、可打印的多语话术卡、以及一键放大的无障碍阅读。</p>
      <div style="margin-top:22px"><a class="btn btn-light" href="#/training">去生成一张话术卡</a></div>
    </div>
    <div class="feature-list">
      <div class="feature-item">
        <div class="fi-icon" aria-hidden="true">◍</div>
        <div><h4>语音播报 / 语音输入</h4><p>点击即朗读译文，支持中、英、越、泰、缅、高棉、老、马来、印尼九种语言口音；也可用系统语音输入代替打字。</p></div>
      </div>
      <div class="feature-item">
        <div class="fi-icon" aria-hidden="true">▤</div>
        <div><h4>一键生成多语话术卡</h4><p>选场景与语种，生成 6 句可打印的分诊 / 安置 / 物资 / 心理支持话术，志愿者可直接带走。</p></div>
      </div>
      <div class="feature-item">
        <div class="fi-icon" aria-hidden="true">A</div>
        <div><h4>大字与键盘可达</h4><p>顶栏一键放大字号，弹层与表单支持键盘操作，手机端无横向滚动、无遮挡。</p></div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="data-band">
      <div class="card card-pad">
        <span class="sec-kicker">Sources</span>
        <h2 style="font-size:1.3rem">数据从哪里来</h2>
        <p class="small muted" style="margin-top:8px">资讯来自公开 RSS 与开放 API，页面保留原始英文标题、发布时间与原文链接；术语与语料逐条标注来源文件与审核状态。</p>
        <div class="source-list">
          ${s.newsSources.map((x) => `<span class="source-pill">${esc(x.name)} · ${x.count}</span>`).join("")}
          <span class="source-pill">WHO 紧急医疗队指南</span>
          <span class="source-pill">Sphere 手册</span>
          <span class="source-pill">IASC 心理急救</span>
          <span class="source-pill">UNHCR 应急手册</span>
        </div>
      </div>
      <div class="card card-pad">
        <span class="sec-kicker">Compliance</span>
        <h2 style="font-size:1.3rem">合规与安全</h2>
        <ul class="small muted" style="margin-top:10px;display:grid;gap:8px">
          <li>API Key 只在服务端读取，前端代码、截图与公开仓库中不出现任何密钥。</li>
          <li>演示数据中的人名、电话、证件号均为虚构，不使用真实个人信息。</li>
          <li>所有资讯标注来源与抓取时间，仅用于课程教学演示，不构成灾情通报。</li>
        </ul>
        <p style="margin-top:14px"><a class="small" style="color:var(--accent-dark);font-weight:600" href="#/about">阅读完整的数据与合规说明 →</a></p>
      </div>
    </div>
  </section>
  `;

  root.querySelectorAll("[data-speak]").forEach((btn) => {
    btn.addEventListener("click", () => speak(btn.dataset.speak, btn.dataset.lang));
  });
}
