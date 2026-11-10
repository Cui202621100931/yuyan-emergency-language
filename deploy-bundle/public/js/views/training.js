import { api, getMeta } from "../api.js";
import { esc, toast, speak, LANGS } from "../ui.js";

const MODULES = [
  {
    id: "m1",
    title: "术语、短句与角色边界",
    dur: "20 分钟",
    objective: "知道自己在现场“做什么、不做什么”，能用 2—3 句短句完成一次问询。",
    points: [
      "一次口译控制在两到三句，长段落拆开说，数字与剂量必须复述确认。",
      "志愿者不替代医疗、搜救、心理专业人员做判断，只做准确转述。",
      "不使用“灾民”等标签化称谓，统一用“受灾群众”。",
      "遇到听不懂的方言或口音，主动请人替换，不猜测、不硬撑。",
    ],
    phrases: [
      ["我是应急语言服务志愿者，我来帮您沟通。", "I am an emergency language volunteer. I am here to help you communicate."],
      ["请慢慢说，不要着急。", "Please speak slowly. There is no rush."],
      ["您刚才说的我没有听清，请再说一次。", "I did not catch that. Could you say it again?"],
    ],
    quiz: { q: "在应急现场，一次口译最好控制在几句？", opts: ["1 句以内", "2—3 句", "越长越完整"], a: 1 },
  },
  {
    id: "m2",
    title: "分诊问询：四问与红旗征",
    dur: "30 分钟",
    objective: "30 秒内完成初筛，识别需要立即处理的危险信号。",
    points: [
      "初筛四问：哪里不舒服 / 持续多久 / 能否走路 / 有没有呼吸困难。",
      "红旗征：意识改变、呼吸困难、大出血、持续胸痛、抽搐、严重过敏。",
      "儿童注意“不爱动、不哭、不喝水”等非典型表现，老人注意跌倒与用药史。",
      "交接时用“颜色标签 + 一句话”：红色，男性约 40 岁，右大腿开放性骨折，已止血，需立即转运。",
    ],
    phrases: [
      ["请告诉我您哪里不舒服。", "Please tell me where you feel unwell."],
      ["请指一下疼痛的位置。", "Please point to where it hurts."],
      ["我们现在为您做快速检查。", "We will give you a quick check now."],
    ],
    quiz: { q: "以下哪项属于分诊“红旗征”？", opts: ["轻微擦伤", "持续胸痛", "轻度咳嗽"], a: 1 },
  },
  {
    id: "m3",
    title: "知情告知与隐私保护",
    dur: "25 分钟",
    objective: "在采集任何信息之前，能说清目的、范围与保存期限。",
    points: [
      "知情告知四要素：做什么、为什么做、有什么风险、对方可以拒绝。",
      "最小必要：能记“某区某户四人”就不记门牌，能记化名就不记全名。",
      "拍摄前说明用途并取得同意，不拍面部与伤口特写，发布前模糊处理。",
      "保密有边界：涉及自伤伤人计划、儿童虐待、性暴力时按流程上报并告知对方。",
    ],
    phrases: [
      ["我们会保护您的个人信息。", "We will protect your personal information."],
      ["您可以拒绝回答不想回答的问题。", "You may refuse to answer any question you do not wish to answer."],
      ["请只提供必要的信息。", "Please provide only the information that is necessary."],
    ],
    quiz: { q: "以下哪项不属于知情告知四要素？", opts: ["做什么", "为什么做", "对方的收入情况"], a: 2 },
  },
  {
    id: "m4",
    title: "物资发放与安置登记",
    dur: "30 分钟",
    objective: "按统一字段完成登记，做到公平、透明、可追溯。",
    points: [
      "登记字段：户主姓名或化名、人数、儿童老人孕妇残障情况、原住址、电话、最急需物资。",
      "无证件者先登记自述信息并注明待核验，由两名工作人员见证，不得拒绝登记。",
      "系统按证件号、手机号、姓名加住址校验，发现重复先核实再处理。",
      "孕妇、婴幼儿、残障人士、独居老人、慢性病患者优先，可安排送上门。",
    ],
    phrases: [
      ["请出示您的领取凭证。", "Please show your collection voucher."],
      ["每户可以领取一份物资。", "Each household may collect one set of relief items."],
      ["行动不便的老人可以申请送上门。", "Older people with limited mobility can request home delivery."],
    ],
    quiz: { q: "防止重复领取最有效的做法是？", opts: ["口头询问一遍", "系统按证件号或手机号校验", "不再登记"], a: 1 },
  },
  {
    id: "m5",
    title: "心理急救与自我照顾",
    dur: "25 分钟",
    objective: "能做 PFA 的稳定化与转介，不越界做心理治疗。",
    points: [
      "心理急救不是心理咨询：不分析创伤、不追问细节、不贴标签。",
      "五项原则：安全、尊严、连接、赋能、希望。",
      "不做什么：不评判、不比较、不承诺“一切都会好”、不替对方做决定。",
      "转介信号：持续失眠、无法进食、惊恐发作、自伤念头、幻觉、无法照顾孩子。",
    ],
    phrases: [
      ["您现在安全了。", "You are safe now."],
      ["慢慢说，我在听。", "Take your time. I am listening."],
      ["我们会一直陪着您。", "We will stay with you."],
    ],
    quiz: { q: "以下哪种情况应立即转介专业人员？", opts: ["入睡稍晚", "持续失眠且无法进食", "想念家人"], a: 1 },
  },
];

const SCENES = {
  triage: { name: "分诊问询", phrases: [
    ["请告诉我您哪里不舒服。", "Please tell me where you feel unwell."],
    ["请指一下疼痛的位置。", "Please point to where it hurts."],
    ["这种疼痛持续多久了？", "How long have you had this pain?"],
    ["您有没有药物过敏？", "Are you allergic to any medication?"],
    ["我们现在为您做快速检查。", "We will give you a quick check now."],
    ["请在这里等候，医生马上过来。", "Please wait here. The doctor will be with you shortly."],
  ]},
  shelter: { name: "安置登记", phrases: [
    ["请在这里登记您的姓名和人数。", "Please register your name and the number of people here."],
    ["您的床位在 A 区 12 号。", "Your bed is number 12 in Zone A."],
    ["厕所和淋浴间在营地北侧。", "Toilets and showers are on the north side of the camp."],
    ["医疗点在营地南门附近。", "The medical point is near the south gate."],
    ["请不要在帐篷里使用明火。", "Please do not use open flames inside the tent."],
    ["如果离开营地，请告知管理员。", "If you leave the camp, tell the administrator."],
  ]},
  supplies: { name: "物资发放", phrases: [
    ["每户可以领取一份物资。", "Each household may collect one set of relief items."],
    ["请出示您的领取凭证。", "Please show your collection voucher."],
    ["食品包里有大米、食用油和罐头。", "The food parcel contains rice, cooking oil and canned food."],
    ["每人可以领两条毛毯。", "Each person may collect two blankets."],
    ["请排队取餐，不要拥挤。", "Please queue for meals and do not push."],
    ["所有物资都是免费发放的。", "All relief items are distributed free of charge."],
  ]},
  pfa: { name: "心理支持", phrases: [
    ["您现在安全了。", "You are safe now."],
    ["慢慢说，我在听。", "Take your time. I am listening."],
    ["害怕是正常的反应。", "Feeling afraid is a normal reaction."],
    ["这不是您的错。", "This is not your fault."],
    ["我可以帮您预约心理咨询。", "I can help you book a counselling session."],
    ["我们会一直陪着您。", "We will stay with you."],
  ]},
};

const PROGRESS_KEY = "yuyan.progress";

export async function render(root) {
  const meta = await getMeta().catch(() => null);
  const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
  const done = MODULES.filter((m) => progress[m.id]).length;

  root.innerHTML = `
    <header class="page-head">
      <span class="sec-kicker">Field training</span>
      <h1>岗前微课与话术卡</h1>
      <p class="lead">五个模块、约两小时。每个模块末尾有一道自测题，答对即可标记完成；右侧可以按场景与语种生成可打印的六句话术卡。</p>
      <div class="page-meta">
        <span>5 个模块 · 约 130 分钟</span>
        <span>已完成 <b id="doneCount">${done}</b> / 5</span>
        <span>进度保存在本机浏览器</span>
      </div>
    </header>

    <div class="toolbar" style="margin-top:20px">
      <div style="flex:1;min-width:220px;background:var(--line);height:6px;border-radius:999px;overflow:hidden">
        <div id="progressBar" style="height:100%;width:${(done / MODULES.length) * 100}%;background:var(--teal);transition:width .3s"></div>
      </div>
      <span class="tiny muted">测评通过后由带队人确认“可上岗”</span>
    </div>

    <div class="training-layout">
      <div id="moduleList">
        ${MODULES.map(
          (m, i) => `<details class="module" data-module="${m.id}" ${i === 0 ? "open" : ""}>
            <summary>
              <span class="m-num">0${i + 1}</span>
              <span class="m-title">${esc(m.title)}</span>
              <span class="m-dur">${esc(m.dur)}</span>
              <span class="m-done" data-done="${m.id}" style="display:${progress[m.id] ? "inline-flex" : "none"}">✓ 已完成</span>
            </summary>
            <div class="module-body">
              <p class="small"><strong>学完能做到：</strong>${esc(m.objective)}</p>
              <ul>${m.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
              <div class="phrase-mini">
                ${m.phrases
                  .map(
                    ([zh, en], idx) => `<div><b>${esc(zh)}</b><br /><span class="muted" lang="en">${esc(en)}</span>
                      <button class="btn-icon" style="width:auto;height:auto;padding:2px 6px;margin-left:6px" data-speak="${esc(zh)}" data-lang="zh" type="button" aria-label="朗读">◍</button></div>`
                  )
                  .join("")}
              </div>
              <div class="module-quiz" data-quiz="${m.id}">
                <h4>自测：${esc(m.quiz.q)}</h4>
                <div class="quiz-opts">
                  ${m.quiz.opts
                    .map((o, idx) => `<button type="button" data-opt="${idx}">${String.fromCharCode(65 + idx)}. ${esc(o)}</button>`)
                    .join("")}
                </div>
                <div class="quiz-feedback tiny muted" style="margin-top:8px"></div>
                <button class="btn btn-sm btn-ghost" type="button" data-finish="${m.id}" style="margin-top:10px">标记本模块完成</button>
              </div>
            </div>
          </details>`
        ).join("")}
      </div>

      <aside class="card phrase-builder" id="phraseCard">
        <span class="sec-kicker">Print card</span>
        <h3>生成多语话术卡</h3>
        <p class="small muted" style="margin-top:6px">选场景与语种，生成六句话术，打印后可直接带到现场。</p>
        <div class="field">
          <label for="sceneSel">场景</label>
          <select class="select" id="sceneSel">
            ${Object.entries(SCENES).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="langSel2">目标语言</label>
          <select class="select" id="langSel2">
            <option value="en">英语</option>
            <option value="vi" selected>越南语</option>
            <option value="th">泰语</option>
            <option value="id">印尼语</option>
            <option value="ms">马来语</option>
            <option value="my">缅甸语</option>
            <option value="km">高棉语</option>
            <option value="lo">老挝语</option>
          </select>
        </div>
        <div class="phrase-actions">
          <button class="btn btn-sm btn-accent" id="genCard" type="button">生成</button>
          <button class="btn btn-sm btn-ghost" id="printCard" type="button">打印</button>
        </div>
        <div id="cardPreview" class="phrase-list">
          <p class="tiny muted">尚未生成。点击“生成”后，将按术语库与翻译引擎输出六句话术。</p>
        </div>
        <p class="tiny muted" style="margin-top:12px">仅用于教学演练；正式使用前请由术语组复核。</p>
      </aside>
    </div>
  `;

  root.querySelectorAll("[data-speak]").forEach((b) =>
    b.addEventListener("click", () => speak(b.dataset.speak, b.dataset.lang))
  );

  // 自测
  root.querySelectorAll("[data-quiz]").forEach((box) => {
    const id = box.dataset.quiz;
    const mod = MODULES.find((m) => m.id === id);
    box.querySelectorAll("[data-opt]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.opt);
        box.querySelectorAll("[data-opt]").forEach((b, i) => {
          b.disabled = true;
          if (i === mod.quiz.a) b.classList.add("correct");
        });
        const fb = box.querySelector(".quiz-feedback");
        if (idx === mod.quiz.a) {
          fb.textContent = "答对了。可以点击下方按钮标记本模块完成。";
        } else {
          btn.classList.add("wrong");
          fb.textContent = "再想一想：正确答案已标绿。可返回上方要点复习。";
        }
      });
    });
  });

  root.querySelectorAll("[data-finish]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.finish;
      const p = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      p[id] = true;
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
      root.querySelector(`[data-done="${id}"]`).style.display = "inline-flex";
      const n = MODULES.filter((m) => p[m.id]).length;
      root.querySelector("#doneCount").textContent = n;
      root.querySelector("#progressBar").style.width = `${(n / MODULES.length) * 100}%`;
      toast("已记录进度");
    });
  });

  // 话术卡
  const preview = root.querySelector("#cardPreview");
  let cardData = null;

  async function generate() {
    const scene = SCENES[root.querySelector("#sceneSel").value];
    const lang = root.querySelector("#langSel2").value;
    preview.innerHTML = `<div class="loading" style="padding:20px 0"><span class="spinner"></span>正在生成…</div>`;
    try {
      const rows = await Promise.all(
        scene.phrases.map(async ([zh, en]) => {
          if (lang === "en") return { zh, tgt: en };
          const r = await api("/api/translate", { method: "POST", body: { text: zh, from: "zh", to: lang } });
          return { zh, tgt: r.translation || en, fallback: !r.translation };
        })
      );
      cardData = { scene: scene.name, lang, rows };
      renderCard();
    } catch (e) {
      preview.innerHTML = `<p class="tiny" style="color:var(--danger)">生成失败：${esc(e.message)}</p>`;
      toast(e.message, "err");
    }
  }

  function renderCard() {
    if (!cardData) return;
    const { scene, lang, rows } = cardData;
    preview.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <b>${esc(scene)} · ${esc(LANGS[lang] || lang)}</b>
        <span class="badge badge-ok">6 句</span>
      </div>
      ${rows
        .map(
          (r, i) => `<div class="p-item"><b>${i + 1}. ${esc(r.zh)}</b><span>${esc(r.tgt)}</span></div>`
        )
        .join("")}
      ${rows.some((r) => r.fallback) ? `<p class="tiny" style="color:var(--accent-dark)">部分句子未取到译文，已回退英语，请人工复核。</p>` : ""}
    `;
  }

  root.querySelector("#genCard").addEventListener("click", generate);
  root.querySelector("#printCard").addEventListener("click", () => {
    if (!cardData) return toast("请先生成话术卡", "err");
    const { scene, lang, rows } = cardData;
    const holder = document.getElementById("printHolder");
    holder.innerHTML = `
      <div class="print-sheet">
        <div class="ps-head"><strong>语安 · 应急语言服务</strong><span>演练用语 · ${new Date().toLocaleDateString("zh-CN")}</span></div>
        <h2>${esc(scene)} · ${esc(LANGS[lang] || lang)}话术卡</h2>
        <ol>${rows.map((r) => `<li><div class="ps-zh">${esc(r.zh)}</div><div class="ps-tgt">${esc(r.tgt)}</div></li>`).join("")}</ol>
        <div class="ps-foot">仅用于教学演练｜译文由语安翻译台生成，正式使用前请术语组复核｜${location.host}</div>
      </div>`;
    window.print();
  });

  // 演示参数：自动生成一张话术卡，便于截图与现场演示
  if (new URLSearchParams(location.search).get("demo") === "training") {
    setTimeout(generate, 400);
  }
}
