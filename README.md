# 语安 · 应急语言服务

> 面向应急语言服务志愿者与基层培训教师的**岗前培训 + 现场知识查询**平台。  
> 《人工智能辅助翻译》课程实训作品 ｜ 2026 年 11 月

**一句话定位**：不追求系统语言能力提升，而是把真实救援场景中最需要的话术、术语和规范压缩到最短学习路径——岗前 3 小时补齐，现场 10 秒查到。

---

## 一、五项核心功能与验收数据

| 核心功能 | 任务书要求 | 本站实现 |
| --- | --- | --- |
| 外语信息聚合 | ≥3 个权威外文来源，≥50 条中文化信息 | **60 条**，来自 UN News（22）、IFRC GO（24）、USGS（14），逐条保留原文链接与时间 |
| 多语种翻译 | ≥4 种语言，中外双向 | **9 种**：中、英、越、泰、缅、高棉、老、马来、印尼，双向互译；术语约束 + 原文/译文双高亮 |
| 术语管理 | ≥500 条，来源与审核状态，可筛选 | **531 条**，11 个领域，119 条含东盟语译法；关键词/领域/语种/状态筛选，随机抽检 5 条 |
| 平行语料库 | ≥500 句一一对齐，向量化 | **542 句**（中英 518 + 中越 24），来源可追溯，启动即建 TF-IDF 向量索引 |
| 可追溯问答 | BigModel Embedding + DeepSeek，≥100 切片 | **120 个切片 / 12 份文档**，回答附文档页码与原文入口；知识库外问题明确拒答；支持增量写入 |

特色功能（加分项）：**语音播报（9 语）**、**多语话术卡一键生成与打印**、**大字无障碍阅读**、**岗前微课 + 自测**。

---

## 二、快速开始

要求：Node.js ≥ 20（无需 `npm install`，零第三方依赖）。

```bash
# 1. 进入项目
cd emergency-lang-service

# 2. 启动
node server/index.js
# 打开 http://127.0.0.1:8080
```

可选配置（不配置也能跑，会自动降级）：

```bash
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY / BIGMODEL_API_KEY
```

| 变量 | 作用 | 未配置时 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | 术语约束翻译、RAG 生成 | 翻译降级为 MyMemory 公有接口；问答降级为本地抽取式回答 |
| `BIGMODEL_API_KEY` | `embedding-3` 向量索引 | 使用本地 TF-IDF 向量 |
| `ADMIN_TOKEN` | 知识库增量更新令牌 | 默认 `yuyan-demo-2026`（演示用，部署请修改） |
| `ENABLE_PUBLIC_MT` | 是否允许公有翻译接口兜底 | 默认 `true`，设为 `false` 可完全离线 |

> 配置 Key 后**无需改代码**，刷新页面即显示“DeepSeek（术语约束）/ BigModel + DeepSeek”正式模式。

---

## 三、目录结构

```
emergency-lang-service/
├─ server/
│  ├─ index.js            # 零依赖 HTTP 服务：路由、静态资源、API、限流
│  └─ lib/
│     ├─ config.js        # .env 读取（密钥只在服务端）
│     ├─ store.js         # 数据装载、检索、术语匹配、分页
│     ├─ nlp.js           # 中英混合分词、TF-IDF、余弦相似度
│     ├─ translate.js     # 翻译编排：术语 + 语料 + 引擎降级
│     ├─ rag.js           # 检索增强问答、阈值拒答、来源标注
│     └─ llm.js           # DeepSeek / BigModel / MyMemory 封装
├─ public/
│  ├─ index.html
│  ├─ styles.css          # 设计系统、响应式、打印样式
│  └─ js/                 # 原生 ES Modules：路由 + 8 个视图
├─ data/
│  ├─ terms.json          # 531 条术语（构建产物）
│  ├─ corpus.json         # 542 句平行语料
│  ├─ kb.json             # 120 个知识切片
│  ├─ news.json           # 60 条中文化资讯快照
│  ├─ kb-docs.json        # 12 份文档元数据
│  └─ seed/               # 原始种子文件（可重新构建）
├─ scripts/
│  ├─ build-data.mjs      # 合并种子数据、生成 ID 与统计
│  ├─ scrape-news.mjs     # 三源爬虫 + 中文化 + 人工校订覆盖
│  └─ smoke-test.mjs      # 提交前接口自检
├─ docs/                  # 智能体生成记录等
├─ shots/                 # 页面截图（PPT 配图）
├─ ppt/                   # 汇报 PPT
├─ Dockerfile / render.yaml
└─ README.md
```

数据重建：

```bash
node scripts/build-data.mjs     # 术语 / 语料 / 知识库
node scripts/scrape-news.mjs    # 抓取最新资讯快照（需要外网）
```

---

## 四、上线部署（公网 + HTTPS）

> **大陆网络优先看这里**：Render 在部分网络被阻断（实测 `render.com` 超时），推荐**腾讯云 CloudBase 云托管**——上海节点、默认 HTTPS 域名、无需自己备案，项目自带 Dockerfile 可直接部署。逐步操作见 [docs/部署到腾讯云CloudBase.md](docs/部署到腾讯云CloudBase.md)。
>
> 下面保留 Render、轻量服务器和临时隧道三种方案，供有条件时选择。

### 方案 0：腾讯云 CloudBase 云托管（大陆推荐）

1. 先把项目推送到 GitHub 或 Gitee（见 [docs/推送到GitHub.md](docs/推送到GitHub.md)）。
2. 打开 <https://tcb.cloud.tencent.com/dev>，实名后创建**免费体验环境**（上海）。
3. 云托管 → 新建服务 → **Git 部署**，选仓库与 `main` 分支，端口填 **8080**。
4. 环境变量填 `DEEPSEEK_API_KEY`、`BIGMODEL_API_KEY`、`ADMIN_TOKEN`、`PORT=8080`。
5. 部署完成后得到 `https://<服务名>-xxxx.ap-shanghai.app.tcloudbase.com`。

### 方案 A：Render（最快，免费额度足够课程演示）

1. 把**项目根目录**推送到 GitHub 仓库。“本目录”指本 README 所在的 `emergency-lang-service/` 文件夹（里面直接有 `package.json`、`server/`、`public/`），不是它的上级目录；不会操作见 [docs/推送到GitHub.md](docs/推送到GitHub.md)。
2. 打开 <https://render.com> → **New → Web Service** → 选择仓库。
3. Runtime 选 **Node**，Build Command 留空或填 `node -v`，Start Command 填 `node server/index.js`。
4. 在 **Environment** 中添加 `DEEPSEEK_API_KEY`、`BIGMODEL_API_KEY`、`ADMIN_TOKEN`。
5. 部署完成后得到 `https://<服务名>.onrender.com`，自带 HTTPS。
6. 可绑定自定义域名（Render 提供免费证书）。

> 也可直接使用仓库内的 `render.yaml`（Blueprint 部署）。Render 免费实例休眠后首次访问约 30 秒唤醒，**演示前先访问一次预热**。

### 方案 B：阿里云 / 腾讯云轻量服务器（大陆访问最稳）

```bash
# 服务器安装 Node 20+
git clone <你的仓库> && cd emergency-lang-service
cp .env.example .env && vim .env       # 填 Key 与 ADMIN_TOKEN
nohup node server/index.js > app.log 2>&1 &

# Nginx 反向代理 + HTTPS（certbot 申请证书）
```

Nginx 关键配置：

```nginx
server {
  listen 443 ssl http2;
  server_name your-domain.com;
  ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
  location / { proxy_pass http://127.0.0.1:8080; proxy_set_header Host $host; }
}
```

> 任务书要求“公开域名可在中国大陆正常访问、HTTPS 无警告”。使用大陆服务器 + 已备案域名最稳妥；Render 等境外节点在部分网络下可能较慢。

### 方案 C：本地演示 + 临时公网地址（无需域名）

```bash
# 终端 1
node server/index.js

# 终端 2（安装 cloudflared 后）
cloudflared tunnel --url http://127.0.0.1:8080
```

会得到一个 `https://xxx.trycloudflare.com` 的临时 HTTPS 地址，适合答辩前应急演示，但地址不固定，不建议作为最终提交地址。

### Docker

```bash
docker build -t yuyan-els .
docker run -p 8080:8080 --env-file .env yuyan-els
```

---

## 五、验收演示脚本（约 6 分钟）

1. **首页**（10 秒说清定位）：谁用、解决什么问题、三个入口。
2. **资讯聚合**：随机点 3 条不同来源 → 展示中文标题、摘要、原文链接。
3. **多语翻译**：输入“伤员右大腿骨折，出现失血性休克，需要立即止血并转运。”→ 译成越南语 → 指出原文与译文中的术语高亮 → 点开术语卡看来源。
4. **术语库**：点击“随机抽检 5 条” → 逐条打开来源链接，说明审核状态。
5. **平行语料**：搜索“检伤分类” → 回到翻译页展示参考语料（向量检索）。
6. **智能问答**：问“物资发放如何防止重复领取？”→ 点开引用原文；再问“今天北京天气怎么样？”→ 展示拒答。
7. **特色功能**：微课页生成一张越南语话术卡 → 打印预览；打开大字模式。

---

## 六、降级策略与已知限制

- **未配置 Key**：翻译走 MyMemory 公有接口（有频率限制），问答走本地 TF-IDF + 抽取式回答；页面会明确标注“未配置 Key”，不冒充正式模式。
- **公有接口不可用**：翻译会回退到平行语料精确匹配，并提示“未获得译文”，不会编造译文。
- **资讯为快照**：默认展示抓取时的 60 条；重新运行 `scrape-news.mjs` 可更新。教学演示数据不作为真实灾情发布。
- **缅甸语 / 高棉语 / 老挝语**：翻译引擎支持，但术语库暂未收录这三语的审定译法（已如实标注），现场关键场景建议由译员复核。
- **数据持久化**：知识库增量写入保存在 `data/kb.json`；Render 免费实例重启后可能丢失，正式使用请挂载持久磁盘或改用数据库。

---

## 七、安全与合规

- API Key 仅通过服务端 `.env` 读取，前端代码、页面源码、截图与 PPT 中均不出现密钥。
- 演示数据中的人名、电话、证件号均为虚构，不使用真实个人信息。
- 资讯保留原始链接与抓取时间；术语与语料逐条标注来源；不使用未授权版权材料。
- 问答附来源，知识库外问题拒答；涉及伤情、用药、法律决定时建议咨询专业人员。
- 站点性质为课程教学演练，不对外作为真实灾情信息发布。

---

## 八、提交物清单

| 文件 | 说明 |
| --- | --- |
| `README.md` | 本文件：功能、运行、部署、演示脚本 |
| `ppt/语安-应急语言服务-汇报.pptx` | 智能体生成的汇报 PPT（12 页） |
| `docs/智能体生成记录.docx` | 生成过程证据：提示词链、产出、校验与截图（另有 `.md` 摘要） |
| `shots/` | 线上/本地页面截图（PPT 配图，可复核一致性） |
| `data/` | 术语、语料、知识库、资讯快照 |

---

## 九、许可与致谢

- 资讯数据版权归 UN News、IFRC、USGS 等原发布方所有，本站仅作教学演示并保留原文链接。
- 术语参考 WHO、IFRC、Sphere、UNHCR、IASC、IATE、UNTERM 等公开资料。
- 代码以 MIT 许可开源，供课程学习使用。
