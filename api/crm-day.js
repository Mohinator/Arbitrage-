// Точный расчёт активности за день из KeyCRM.
// 1) собираем диалоги, обновлённые в/после окна дня (сортировка по свежести),
// 2) по каждому тянем сообщения и берём ИСХОДЯЩИЕ в окне [from,to],
// 3) относим их к менеджеру диалога (assigned_user_id).
// Возвращаем по менеджеру массив меток времени исходящих сообщений.
// Оптимизировано под «сегодня/вчера». Токен: KEYCRM_SESSION_TOKEN.

export const maxDuration = 60;

export default async function handler(req, res) {
  const token = process.env.KEYCRM_SESSION_TOKEN;
  if (!token) { res.status(200).json({ ok:false, error:"KEYCRM_SESSION_TOKEN не задан в Vercel", users:{} }); return; }
  const auth = token.startsWith("Bearer ") ? token : "Bearer " + token;
  const H = { Authorization: auth, Accept: "application/json" };
  const fromMs = Date.parse(req.query.from), toMs = Date.parse(req.query.to);
  if (isNaN(fromMs) || isNaN(toMs)) { res.status(200).json({ ok:false, error:"нужны параметры from/to", users:{} }); return; }

  const CONV_BASE = "https://ratteam.api.keycrm.app/conversations";
  const tsOf = (c) => Date.parse(c.updated_at || c.updated_timestamp || 0);

  try {
    // 1) диалоги в окне (по убыванию свежести)
    const convs = []; // {id, uid}
    for (let page = 1; page <= 40; page++) {
      const r = await fetch(`${CONV_BASE}?filters[type]=all&filters[search_in]=conversations&per_page=50&page=${page}`, { headers: H });
      if (!r.ok) { if (page === 1) { res.status(200).json({ ok:false, error:"conversations вернул статус "+r.status+(r.status===401?" — обнови KEYCRM_SESSION_TOKEN":""), users:{} }); return; } break; }
      const j = await r.json();
      const rows = j.data || [];
      if (!rows.length) break;
      for (const c of rows) {
        if (tsOf(c) >= fromMs) { const uid = (c.assigned_user_id != null) ? c.assigned_user_id : (c.assigned_to && c.assigned_to.id); convs.push({ id: c.id, uid }); }
      }
      if (tsOf(rows[rows.length - 1]) < fromMs) break;        // прошли окно вглубь прошлого
      if (j.last_page && page >= j.last_page) break;
      if (convs.length >= 300) break;
    }

    // 2) сообщения по диалогам (порциями, чтобы успеть в таймаут)
    const DEBUG = req.query.debug === "1" || req.query.debug === "true";
    const users = {}; // uid -> [ts,...]
    const dbg = {};   // uid -> [{conv, fetched, truncated, types:{}, outInWindow, sample:[...]}]
    const add = (uid, ts) => { if (uid == null) return; const k = String(uid); (users[k] || (users[k] = [])).push(ts); };
    let scannedMsgs = 0;
    const worker = async ({ id, uid }) => {
      try {
        const r = await fetch(`https://ratteam.api.keycrm.app/conversations/${id}/messages?per_page=50`, { headers: H });
        if (!r.ok) return;
        const j = await r.json();
        const msgs = j.data || [];
        let outInWindow = 0; const sample = []; const types = {}; let minTs = Infinity, maxTs = -Infinity;
        for (const m of msgs) {
          if (DEBUG) { types[m.type] = (types[m.type]||0)+1; const tt=Date.parse(m.created_at||0); if(!isNaN(tt)){ minTs=Math.min(minTs,tt); maxTs=Math.max(maxTs,tt); } }
          if (m.type !== "outgoing") continue;
          const t = Date.parse(m.created_at || 0);
          if (isNaN(t) || t < fromMs || t >= toMs) continue;
          const author = m.manager_id ?? m.user_id ?? m.created_by ?? (m.author && m.author.id);
          const ak = String(author != null ? author : uid);
          add(author != null ? author : uid, m.created_at);
          if (DEBUG){ outInWindow++; if(sample.length<60) sample.push({ at:m.created_at, author:ak }); }
          scannedMsgs++;
        }
        if (DEBUG) {
          const k = String(uid);
          (dbg[k] || (dbg[k] = [])).push({
            conv:id, fetched:msgs.length, truncated:msgs.length>=50,
            types, outInWindow,
            spanFetched: (isFinite(minTs)?new Date(minTs).toISOString():null)+" … "+(isFinite(maxTs)?new Date(maxTs).toISOString():null),
            sample
          });
        }
      } catch (e) { /* пропускаем диалог при ошибке */ }
    };
    const CONC = 5;
    for (let i = 0; i < convs.length; i += CONC) await Promise.all(convs.slice(i, i + CONC).map(worker));

    res.setHeader("Cache-Control", "no-store");
    const out = { ok:true, refreshed_at:new Date().toISOString(), conversations:convs.length, messages:scannedMsgs, users };
    if (DEBUG) { out.window = { from:new Date(fromMs).toISOString(), to:new Date(toMs).toISOString() }; out.debug = dbg; out.convAssign = convs.map(c=>({conv:c.id,uid:String(c.uid)})); }
    res.status(200).json(out);
  } catch (e) {
    res.status(200).json({ ok:false, error:String((e&&e.message)||e), users:{} });
  }
}
