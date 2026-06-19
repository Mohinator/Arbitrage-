// Серверless-функция Vercel. Дёргает KeyCRM на сервере (токен в env, не в браузере).
// Без параметров: последняя активность по каждому менеджеру (для статуса).
// С ?from=ISO&to=ISO: таймлайн — все метки активности за период (для расчёта работал/простой).
// Токен: Vercel → Settings → Environment Variables → KEYCRM_TOKEN.

export default async function handler(req, res) {
  const token = process.env.KEYCRM_TOKEN;
  if (!token) {
    res.status(200).json({ ok: false, error: "KEYCRM_TOKEN не задан в переменных окружения Vercel", users: [] });
    return;
  }
  const base = "https://openapi.keycrm.app/v1";
  const headers = { Authorization: "Bearer " + token, Accept: "application/json" };

  const fromMs = req.query && req.query.from ? Date.parse(req.query.from) : null;
  const toMs   = req.query && req.query.to   ? Date.parse(req.query.to)   : null;
  const timeline = !isNaN(fromMs) && !isNaN(toMs) && fromMs && toMs;

  const acc = {}; // crm_user_id -> { crm_user_id, crm_user_name, last_activity_at, events:[] }

  const nameOf = (m) =>
    m.full_name || [m.first_name, m.last_name].filter(Boolean).join(" ") || m.name || m.email || ("ID " + m.id);

  const ingest = (rows, source) => {
    let minTs = Infinity;
    for (const r of rows || []) {
      const m = r && r.manager;
      if (!m || m.id == null) continue;
      const tsRaw = r.updated_at || r.created_at;
      if (!tsRaw) continue;
      const ts = Date.parse(tsRaw);
      if (isNaN(ts)) continue;
      if (ts < minTs) minTs = ts;
      const key = String(m.id);
      if (!acc[key]) acc[key] = { crm_user_id: key, crm_user_name: nameOf(m), last_activity_at: tsRaw, events: [] };
      if (Date.parse(acc[key].last_activity_at) < ts) acc[key].last_activity_at = tsRaw;
      if (timeline && ts >= fromMs && ts < toMs) acc[key].events.push(tsRaw);
    }
    return minTs;
  };

  const pull = async (path, source) => {
    const maxPages = timeline ? 20 : 3;
    for (let page = 1; page <= maxPages; page++) {
      let r = await fetch(`${base}${path}?include=manager&limit=50&page=${page}&sort=-updated_at`, { headers });
      let sorted = true;
      if (!r.ok) { r = await fetch(`${base}${path}?include=manager&limit=50&page=${page}`, { headers }); sorted = false; }
      if (!r.ok) break;
      const j = await r.json();
      const rows = Array.isArray(j) ? j : (j.data || j.items || []);
      const minTs = ingest(rows, source);
      if (!rows || rows.length < 50) break;
      // в режиме таймлайна при сортировке по убыванию можно остановиться, как ушли раньше начала периода
      if (timeline && sorted && minTs < fromMs) break;
    }
  };

  try {
    await pull("/order", "order");
    await pull("/pipelines/cards", "card");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ok: true, refreshed_at: new Date().toISOString(), timeline: !!timeline, users: Object.values(acc) });
  } catch (e) {
    res.status(200).json({ ok: false, error: String((e && e.message) || e), users: [] });
  }
}
