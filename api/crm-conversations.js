// Внутренний API KeyCRM: активность по сообщениям.
// GET https://ratteam.api.keycrm.app/conversations  (Authorization: Bearer <KEYCRM_SESSION_TOKEN>)
// По каждому диалогу: assigned_user_id (менеджер) + last_message.type (outgoing/incoming) + время.
// Агрегируем по менеджеру: время последнего ИСХОДЯЩЕГО сообщения = "активен сейчас / последняя активность".

export default async function handler(req, res) {
  const token = process.env.KEYCRM_SESSION_TOKEN;
  if (!token) { res.status(200).json({ ok:false, error:"KEYCRM_SESSION_TOKEN не задан в переменных окружения Vercel", users:{} }); return; }
  const auth = token.startsWith("Bearer ") ? token : "Bearer " + token;
  const base = "https://ratteam.api.keycrm.app/conversations";

  const agg = {}; // uid -> { last_outgoing_at, last_activity_at, outgoing_count }
  const touch = (uid, ts, outgoing) => {
    if (uid == null || !ts) return;
    const t = Date.parse(ts); if (isNaN(t)) return;
    const k = String(uid);
    if (!agg[k]) agg[k] = { last_outgoing_at:null, last_activity_at:null, outgoing_count:0 };
    if (!agg[k].last_activity_at || Date.parse(agg[k].last_activity_at) < t) agg[k].last_activity_at = ts;
    if (outgoing) { agg[k].outgoing_count++; if (!agg[k].last_outgoing_at || Date.parse(agg[k].last_outgoing_at) < t) agg[k].last_outgoing_at = ts; }
  };

  try {
    const distinct = new Set();
    let scanned = 0;
    for (let page = 1; page <= 8; page++) {
      const url = `${base}?filters[type]=all&filters[search_in]=conversations&per_page=50&page=${page}`;
      const r = await fetch(url, { headers: { Authorization: auth, Accept: "application/json" } });
      if (!r.ok) {
        if (page === 1) { res.status(200).json({ ok:false, error:"conversations вернул статус " + r.status + (r.status===401||r.status===403?" — токен истёк, обнови KEYCRM_SESSION_TOKEN в Vercel":""), users:{} }); return; }
        break;
      }
      const j = await r.json();
      const rows = j.data || [];
      for (const c of rows) {
        const uid = (c.assigned_user_id != null) ? c.assigned_user_id : (c.assigned_to && c.assigned_to.id);
        if (uid != null) distinct.add(String(uid));
        const lm = c.last_message;
        const ts = (lm && lm.created_at) || c.updated_at || c.updated_timestamp;
        const outgoing = !!(lm && lm.type === "outgoing");
        touch(uid, ts, outgoing);
        scanned++;
      }
      if (!rows.length || (j.last_page && page >= j.last_page)) break;
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ok:true, refreshed_at:new Date().toISOString(), distinct:distinct.size, scanned, users:agg });
  } catch (e) {
    res.status(200).json({ ok:false, error:String((e&&e.message)||e), users:{} });
  }
}
