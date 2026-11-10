// 轻量配置：读取 .env（不依赖 dotenv），所有密钥只留在服务端。
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function loadEnvFile() {
  const file = path.join(root, ".env");
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (/^".*"$/.test(val) || /^'.*'$/.test(val)) val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnvFile();

export const config = {
  root,
  port: Number(process.env.PORT || 8080),
  deepseek: {
    key: process.env.DEEPSEEK_API_KEY || "",
    base: (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, ""),
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  },
  bigmodel: {
    key: process.env.BIGMODEL_API_KEY || "",
    base: (process.env.BIGMODEL_BASE_URL || "https://open.bigmodel.cn/api/paas/v4").replace(/\/$/, ""),
    model: process.env.BIGMODEL_EMBEDDING_MODEL || "embedding-3",
  },
  enablePublicMT: String(process.env.ENABLE_PUBLIC_MT || "true") !== "false",
  adminToken: process.env.ADMIN_TOKEN || "yuyan-demo-2026",
  snapshotLabel: process.env.SNAPSHOT_LABEL || "",
};

export const hasDeepSeek = () => Boolean(config.deepseek.key);
export const hasBigModel = () => Boolean(config.bigmodel.key);
