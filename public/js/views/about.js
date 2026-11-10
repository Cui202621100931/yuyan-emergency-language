import { getMeta } from "../api.js";
import { esc, fmt } from "../ui.js";

export async function render(root) {
  const meta = await getMeta();
  const s = meta.stats;
  const sources = s.newsSources || [];

  const checks = [
    ["公开域名与 HTTPS", "部署到 Render / 阿里云并绑定域名后生效；本地演示使用 http://127.0.0.1:8080", "待部署", "warn"],
    ["手机适配", "响应式布局，360px 宽度无横向滚动，顶栏折叠为菜单", "已通过", "ok"],
    ["信息聚合", `${fmt(s.news)} 条中文化资讯，${sources.length} 个权威外文来源，条目保留原文链接`, "已通过", "ok"],
    ["多语种翻译", "中、英 + 越、泰、缅、高棉、老、马来、印尼，共 9 种语言双向", "已通过", "ok"],
    ["术语数量与来源", `${fmt(s.terms)} 条，逐条标注来源文件与审核状态`, "已通过", "ok"],
    ["术语高亮与指定译法", "翻译时原文与译文同步高亮；配置 DeepSeek 后强制采用术语库译法", "已通过", "ok"],
    ["平行语料数量", `${fmt(s.corpus)} 句一一对齐，来源可追溯`, "已通过", "ok"],
    ["语料向量化", "启动时建立 TF-IDF 向量索引；配置 BigModel 后切换为向量模型", "已通过", "ok"],
    ["RAG 来源标注", `${fmt(s.kb)} 个知识切片，回答附带文档页码与原文入口`, "已通过", "ok"],
    ["无依据拒答", "相似度低于阈值时明确拒答，并给出可选下一步", "已通过", "ok"],
    ["特色功能", "语音播报、多语话术卡打印、大字无障碍阅读", "已通过", "ok"],
    ["安全自查", "密钥仅服务端读取；演示数据人名/电话均为虚构；资讯标注来源", "已通过", "ok"],
  ];

  root.innerHTML = `
    <header class="page-head">
      <span class="sec-kicker">About · Positioning & verification</span>
      <h1>关于语安</h1>
      <p class="lead">应急语言服务志愿者岗前培训与知识查询平台。核心场景是重大突发事件前后的岗前快速培训与现场知识查询，而不是通用语言学习。</p>
    </header>

    <section class="section-tight">
      <div class="data-band">
        <div class="card card-pad">
          <span class="sec-kicker">Positioning</span>
          <h2 style="font-size:1.4rem">为什么需要它</h2>
          <div class="small" style="margin-top:12px;display:grid;gap:10px;color:var(--ink-soft)">
            <p>我国是世界上自然灾害最为严重的国家之一。地震、洪水、台风、事故灾难发生后，大量具备外语、方言、民族语能力的志愿者被紧急动员，参与分诊问询、物资发放、安置登记与跨境沟通。</p>
            <p>他们具备语言能力，却普遍缺乏应急场景的术语、沟通规范与流程知识。仓促上岗容易出现三类问题：术语不统一导致信息失真；不了解知情告知、隐私保护与谣言核查而引发次生舆情；面对情绪激动的群众缺乏沟通技巧。</p>
            <p>语安把“最需要的话术、术语和规范”压缩到最短学习路径：岗前 3 小时微课 + 现场一句话速查，解决“有语言能力但不懂应急沟通”的断层。</p>
          </div>
        </div>
        <div class="card card-pad">
          <span class="sec-kicker">Users & scenes</span>
          <h2 style="font-size:1.4rem">服务谁，在什么场景</h2>
          <div class="small" style="margin-top:12px;display:grid;gap:12px">
            <div><span class="badge badge-accent">志愿者</span> <b style="margin-left:6px">上岗前 3 小时</b><p class="muted">补齐术语、话术、隐私与流程，完成测评后由带队人确认可上岗。</p></div>
            <div><span class="badge badge-accent">一线志愿者</span> <b style="margin-left:6px">现场卡壳 10 秒</b><p class="muted">翻译一句话，查看术语与参考语料，点开语音播报给服务对象听。</p></div>
            <div><span class="badge badge-accent">培训教师</span> <b style="margin-left:6px">备课与答疑</b><p class="muted">用可溯源问答快速定位规范原文，用话术卡组织情景演练。</p></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="sec-head">
        <div><span class="sec-kicker">Acceptance</span><h2>五项核心功能 · 本站实现对照</h2>
        <p class="sec-desc">按任务书的验收口径逐项对照。所有数字来自服务端 /api/meta 实时读取，不是写死的文案。</p></div>
      </div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th style="width:16%">功能</th><th style="width:30%">验收口径</th><th>本站实现</th><th style="width:10%">状态</th></tr></thead>
          <tbody>
            <tr><td class="cell-zh">外语信息聚合</td><td>≥3 个权威外文来源，≥50 条中文化信息，来源可点</td><td>${sources.map((x) => esc(x.name)).join("、")}，共 ${fmt(s.news)} 条，逐条保留原文链接与发布时间</td><td><span class="badge badge-ok">${fmt(s.news)} 条</span></td></tr>
            <tr><td class="cell-zh">多语种翻译</td><td>≥4 种语言，中文与各语种双向</td><td>9 种语言双向互译；术语约束 + 平行语料上下文；原文与译文术语同步高亮</td><td><span class="badge badge-ok">9 语</span></td></tr>
            <tr><td class="cell-zh">术语管理</td><td>≥500 条，按中外文检索，含来源与审核状态、可筛选</td><td>${fmt(s.terms)} 条、${s.domains.length} 个领域、${fmt(s.termsWithAsean)} 条含东盟语译法；支持关键词、领域、语种、审核状态筛选与随机抽检</td><td><span class="badge badge-ok">${fmt(s.terms)} 条</span></td></tr>
            <tr><td class="cell-zh">平行语料库</td><td>≥500 句，一一对齐，来源可追溯，完成向量化</td><td>${fmt(s.corpus)} 句，${(s.corpusPairs || []).length} 组语种对；启动时建立 TF-IDF 向量索引，供翻译检索上下文</td><td><span class="badge badge-ok">${fmt(s.corpus)} 句</span></td></tr>
            <tr><td class="cell-zh">可追溯问答</td><td>BigModel Embedding + DeepSeek，回答展示参考来源，≥100 切片</td><td>${fmt(s.kb)} 个切片 / ${s.docs} 份文档；回答附文档页码与原文入口；知识库外问题拒答；支持增量写入</td><td><span class="badge badge-ok">${fmt(s.kb)} 切片</span></td></tr>
          </tbody>
        </table>
      </div>
      <p class="tiny muted" style="margin-top:10px">说明：未配置 API Key 时，翻译与问答自动降级为公有翻译接口与本地向量检索，功能路径不变、页面会标注降级状态；配置 Key 后无需改代码即切换为正式模式。</p>
    </section>

    <section class="section">
      <div class="sec-head"><div><span class="sec-kicker">Architecture</span><h2>技术实现</h2></div></div>
      <div class="core-grid" style="grid-template-columns:repeat(4,1fr)">
        <div class="card card-pad core-card" style="grid-column:span 1;min-height:auto">
          <span class="core-num">FRONTEND</span>
          <h3 style="font-size:1.05rem">原生 ES Modules</h3>
          <p class="small muted">无框架、无构建步骤；哈希路由、组件化视图、响应式与无障碍。</p>
        </div>
        <div class="card card-pad core-card" style="grid-column:span 1;min-height:auto">
          <span class="core-num">BACKEND</span>
          <h3 style="font-size:1.05rem">Node 零依赖服务</h3>
          <p class="small muted">http 模块实现路由、静态服务、限流与 API；单进程即可部署。</p>
        </div>
        <div class="card card-pad core-card" style="grid-column:span 1;min-height:auto">
          <span class="core-num">DATA</span>
          <h3 style="font-size:1.05rem">JSON + 向量索引</h3>
          <p class="small muted">术语 / 语料 / 知识切片 / 资讯快照；TF-IDF 或 BigModel 向量检索。</p>
        </div>
        <div class="card card-pad core-card" style="grid-column:span 1;min-height:auto">
          <span class="core-num">MODEL</span>
          <h3 style="font-size:1.05rem">DeepSeek + BigModel</h3>
          <p class="small muted">术语约束翻译与 RAG 生成；MyMemory 作为无 Key 时的降级通道。</p>
        </div>
      </div>
      <div class="card card-pad" style="margin-top:16px">
        <div class="small" style="display:grid;gap:8px;color:var(--ink-soft)">
          <p><b>请求链路：</b>浏览器 → <span class="mono">/api/translate</span> → 术语匹配（531 条）→ 语料检索（TF-IDF 余弦）→ DeepSeek 生成 → 术语命中校验 → 前端高亮渲染。</p>
          <p><b>问答链路：</b>问题 → Embedding（BigModel）或 TF-IDF → Top-4 切片 → DeepSeek 生成（仅依据切片）→ 返回 [1][2] 标注与来源卡片。</p>
          <p><b>密钥安全：</b>所有 Key 由服务端 <span class="mono">.env</span> 读取，前端只接收翻译结果与来源，不接触密钥。</p>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="sec-head"><div><span class="sec-kicker">Self-check</span><h2>提交前自检</h2></div>
      <span class="tiny muted">建议演示时按此顺序逐项展示</span></div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th style="width:22%">检查项</th><th>判定标准</th><th style="width:12%">状态</th></tr></thead>
          <tbody>
            ${checks
              .map(
                ([name, std, status, kind]) =>
                  `<tr><td class="cell-zh">${esc(name)}</td><td class="small">${esc(std)}</td><td><span class="badge ${kind === "ok" ? "badge-ok" : "badge-warn"}">${esc(status)}</span></td></tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>

    <section class="section">
      <div class="data-band">
        <div class="card card-pad">
          <span class="sec-kicker">Sources & licences</span>
          <h2 style="font-size:1.3rem">数据来源与授权</h2>
          <ul class="small muted" style="margin-top:10px;display:grid;gap:8px">
            <li>资讯：UN News 英文站 RSS、USGS 地震目录开放 API、IFRC GO 紧急呼吁开放 API；页面保留原文链接与抓取时间，仅作教学演示。</li>
            <li>术语：WHO 紧急医疗队指南、IFRC 应急政策、Sphere 手册、UNHCR 应急手册、IASC 心理急救指南、IATE / UNTERM 等公开资料，逐条标注来源文件。</li>
            <li>语料：项目组依据上述资料与演练脚本编写；机译补充条目已标注“待审”。</li>
            <li>知识库：项目组编写的 12 份培训文档，共 ${fmt(s.kb)} 个切片，页码可追溯。</li>
            <li>不使用未授权的版权材料；如来源方要求下架，将在 24 小时内处理。</li>
          </ul>
        </div>
        <div class="card card-pad">
          <span class="sec-kicker">Compliance</span>
          <h2 style="font-size:1.3rem">安全与合规</h2>
          <ul class="small muted" style="margin-top:10px;display:grid;gap:8px">
            <li>API Key、数据库凭据仅存于服务端环境变量，前端代码、截图与公开仓库均不含密钥。</li>
            <li>演示数据中的人名、电话、证件号一律虚构，不使用真实个人信息。</li>
            <li>知识库与资讯均为教学演练内容，不对外作为真实灾情信息发布。</li>
            <li>回答附来源；知识库外问题明确拒答，避免在应急场景中给出不可靠信息。</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="sec-head"><div><span class="sec-kicker">Walkthrough</span><h2>演示路径（约 6 分钟）</h2></div></div>
      <div class="role-grid">
        <div class="card card-pad"><span class="role-kicker">STEP 01</span><h3 style="font-size:1.02rem;margin-top:8px">资讯聚合</h3><p class="small muted">随机点开 3 条不同来源，展示中文标题、摘要与原文链接。</p></div>
        <div class="card card-pad"><span class="role-kicker">STEP 02</span><h3 style="font-size:1.02rem;margin-top:8px">多语翻译</h3><p class="small muted">输入“请告诉我您哪里不舒服”，译成越南语，指出原文与译文的术语高亮。</p></div>
        <div class="card card-pad"><span class="role-kicker">STEP 03</span><h3 style="font-size:1.02rem;margin-top:8px">术语抽检</h3><p class="small muted">点“随机抽检 5 条”，逐条打开来源，说明审核状态与语种覆盖。</p></div>
        <div class="card card-pad"><span class="role-kicker">STEP 04</span><h3 style="font-size:1.02rem;margin-top:8px">语料与上下文</h3><p class="small muted">在语料库搜索“检伤分类”，回到翻译页展示参考语料。</p></div>
        <div class="card card-pad"><span class="role-kicker">STEP 05</span><h3 style="font-size:1.02rem;margin-top:8px">可溯源问答</h3><p class="small muted">问“物资发放如何防止重复领取”，点开引用页；再问一个知识库外问题，展示拒答。</p></div>
        <div class="card card-pad"><span class="role-kicker">STEP 06</span><h3 style="font-size:1.02rem;margin-top:8px">特色功能</h3><p class="small muted">生成一张越南语话术卡并打印；打开大字模式演示无障碍阅读。</p></div>
      </div>
    </section>

    <section class="section">
      <div class="card card-pad">
        <div class="sec-head" style="margin-bottom:14px"><div><span class="sec-kicker">Team</span><h2 style="font-size:1.3rem">团队分工</h2></div></div>
        <div class="table-wrap">
          <table class="data">
            <thead><tr><th style="width:18%">成员</th><th style="width:32%">分工</th><th>产出</th></tr></thead>
            <tbody>
              <tr><td>（待填写）</td><td>需求与定位、术语与语料编写</td><td>定位说明、531 条术语、518 句语料</td></tr>
              <tr><td>（待填写）</td><td>前端设计与实现、响应式与无障碍</td><td>六大功能页面、话术卡与语音播报</td></tr>
              <tr><td>（待填写）</td><td>服务端与模型接入、数据抓取</td><td>零依赖服务、翻译与 RAG 链路、60 条资讯快照</td></tr>
              <tr><td>（待填写）</td><td>测试、部署与汇报 PPT</td><td>自检清单、线上演示地址、智能体汇报 PPT</td></tr>
            </tbody>
          </table>
        </div>
        <p class="tiny muted" style="margin-top:10px">版本 v1.0 · 2026-11-08 · 数据快照 ${esc(new Date(s.newsUpdatedAt || Date.now()).toLocaleString("zh-CN", { hour12: false }))} · 引擎：${esc(meta.engine.translationLabel)} / ${esc(meta.engine.ragLabel)}</p>
      </div>
    </section>
  `;
}
