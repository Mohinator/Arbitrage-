// Серверless-функция Vercel. Дёргает KeyCRM на сервере (токен в env, не в браузере),
// считает последнюю активность по каждому менеджеру (max updated_at заказов/карточек).
// Токен задаётся в Vercel → Settings → Environment Variables → KEYCRM_TOKEN.

export default async function handler(req, res) {
  const token = process.env.KEYCRM_TOKEN;
  if (!token) {
    res.status(200).json({ ok: false, error: "KEYCRM_TOKEN не задан в переменных окружения Vercel", users: [] });
    return;
  }
  const base = "https://openapi.keycrm.app/v1";
  const headers = { Authorization: "Bearer " + token, Accept: "application/json" };
  const activity = {}; // crm_user_id -> { crm_user_id, crm_user_name, last_activity_at, source }

  const nameOf = (m) =>
    m.full_name ||
    [m.first_name, m.last_name].filter(Boolean).join(" ") ||
    m.name || m.email || ("ID " + m.id);

  const ingest = (rows, source) => {
    for (const r of rows || []) {
      const m = r && r.manager;
      if (!m || m.id == null) continue;
      const ts = r.updated_at || r.created_at;
      if (!ts) continue;
      const key = String(m.id);
      const prev = activity[key];
      if (!prev || new Date(ts) > new Date(prev.last_activity_at)) {
        activity[key] = { crm_user_id: key, crm_user_name: nameOf(m), last_activity_at: ts, source };
      }
    }
  };

  // тянем несколько страниц заказов и карточек, по возможности сортируя по свежести обновления
  const pull = async (path, source) => {
    for (let page = 1; page <= 3; page++) {
      let r = await fetch(`${base}${path}?include=manager&limit=50&page=${page}&sort=-updated_at`, { headers });
      if (!r.ok) {
        // если сортировка не поддержана — пробуем без неё
        r = await fetch(`${base}${path}?include=manager&limit=50&page=${page}`, { headers });
        if (!r.ok) break;
      }
      const j = await r.json();
      const rows = Array.isArray(j) ? j : (j.data || j.items || []);
      ingest(rows, source);
      if (!rows || rows.length < 50) break;
    }
  };

  try {
    await pull("/order", "order");
    await pull("/pipelines/cards", "card");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ok: true, refreshed_at: new Date().toISOString(), users: Object.values(activity) });
  } catch (e) {
    res.status(200).json({ ok: false, error: String((e && e.message) || e), users: [] });
  }
}
