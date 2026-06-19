// Собирает полный список менеджеров KeyCRM (в публичном API нет эндпоинта "все юзеры",
// менеджеры доступны только как include у заказов/карточек/покупателей — поэтому сканируем их).
// Токен: Vercel → Settings → Environment Variables → KEYCRM_TOKEN.

export default async function handler(req, res) {
  const token = process.env.KEYCRM_TOKEN;
  if (!token) {
    res.status(200).json({ ok: false, error: "KEYCRM_TOKEN не задан в переменных окружения Vercel", count: 0, users: [] });
    return;
  }
  const base = "https://openapi.keycrm.app/v1";
  const headers = { Authorization: "Bearer " + token, Accept: "application/json" };
  const seen = {};
  const nameOf = (m) =>
    m.full_name || [m.first_name, m.last_name].filter(Boolean).join(" ") || m.name || m.email || ("ID " + m.id);
  const add = (m) => { if (m && m.id != null) { const k = String(m.id); if (!seen[k]) seen[k] = { crm_user_id: k, crm_user_name: nameOf(m) }; } };

  const pull = async (path) => {
    for (let page = 1; page <= 15; page++) {
      const r = await fetch(`${base}${path}?include=manager&limit=50&page=${page}`, { headers });
      if (!r.ok) break;
      const j = await r.json();
      const rows = Array.isArray(j) ? j : (j.data || j.items || []);
      for (const row of rows) {
        add(row && row.manager);
        if (Array.isArray(row && row.assigned)) for (const a of row.assigned) add(a && a.manager ? a.manager : a);
      }
      const lastPage = j.last_page || (j.meta && j.meta.last_page);
      if (!rows || rows.length < 50) break;
      if (lastPage && page >= lastPage) break;
    }
  };

  try {
    await pull("/order");
    await pull("/pipelines/cards");
    await pull("/buyer");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ok: true, count: Object.keys(seen).length, users: Object.values(seen).sort((a,b)=> (a.crm_user_name||"").localeCompare(b.crm_user_name||"")) });
  } catch (e) {
    res.status(200).json({ ok: false, error: String((e && e.message) || e), count: 0, users: [] });
  }
}
