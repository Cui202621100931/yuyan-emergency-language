// 与后端通信的最小封装
const jsonHeaders = { "content-type": "application/json" };

export async function api(path, { method = "GET", body, timeout = 90000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(path, {
      method,
      headers: method === "GET" ? undefined : jsonHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text };
    }
    if (!res.ok) throw new Error(data?.error || `请求失败（${res.status}）`);
    return data;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("请求超时，请检查网络后重试");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

let metaPromise = null;
export function getMeta() {
  if (!metaPromise) metaPromise = api("/api/meta");
  return metaPromise;
}

export function qs(params) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== "" && v !== null && v !== undefined) s.set(k, v);
  }
  const str = s.toString();
  return str ? `?${str}` : "";
}
