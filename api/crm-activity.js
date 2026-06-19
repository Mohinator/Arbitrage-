// Серверless-функция Vercel: активность менеджеров из KeyCRM (заказы + карточки воронки).
// Без from/to — последняя активность (для статуса). С from/to — события за день (для «работал/простой»).
// Токен: Vercel → Settings → Environment Variables → KEYCRM_TOKEN.

export default async function handler(req, res) {
  const token = process.env.KEYCRM_TOKEN;
  if (!token) { res.status(200).json({ ok:false, error:"KEYCRM_TOKEN не задан в переменных окружения Vercel", users:[] }); return; }
  const base = "https://openapi.keycrm.app/v1";
  const headers = { Authorization: "Bearer " + token, Accept: "application/json" };

  const fromMs = req.query && req.query.from ? Date.parse(req.query.from) : NaN;
  const toMs   = req.query && req.query.to   ? Date.parse(req.query.to)   : NaN;
  const timeline = !isNaN(fromMs) && !isNaN(toMs);

  const acc = {};
  const diag = { scanned: 0, inWindow: 0, sortDesc: null };
  const nameOf = (m) => m.full_name || [m.first_name, m.last_name].filter(Boolean).join(" ") || m.name || m.email || ("ID " + m.id);
  const tsOf = (r) => Date.parse((r && (r.updated_at || r.created_at)) || 0);

  const ingest = (rows, source) => {
    for (const r of rows || []) {
      const m = r && r.manager; if (!m || m.id == null) continue;
      const tsRaw = r.updated_at || r.created_at; if (!tsRaw) continue;
      const ts = Date.parse(tsRaw); if (isNaN(ts)) continue;
      diag.scanned++;
      const key = String(m.id);
      if (!acc[key]) acc[key] = { crm_user_id:key, crm_user_name:nameOf(m), last_activity_at:tsRaw, events:[] };
      if (Date.parse(acc[key].last_activity_at) < ts) acc[key].last_activity_at = tsRaw;
      if (timeline && ts >= fromMs && ts < toMs) { acc[key].events.push(tsRaw); diag.inWindow++; }
    }
  };

  const getPage = async (path, page) => {
    let r = await fetch(`${base}${path}?include=manager&limit=50&page=${page}&sort=-updated_at`, { headers });
    if (!r.ok) r = await fetch(`${base}${path}?include=manager&limit=50&page=${page}`, { headers });
    if (!r.ok) return null;
    const j = await r.json();
    return { rows: Array.isArray(j) ? j : (j.data || j.items || []), lastPage: j.last_page || (j.meta && j.meta.last_page) || null };
  };

  const pull = async (path, source) => {
    const p1 = await getPage(path, 1);
    if (!p1 || !p1.rows.length) return;
    ingest(p1.rows, source);
    if (!timeline) { // режим статуса — берём пару страниц свежих
      for (let pg=2; pg<=3 && p1.rows.length>=50; pg++){ const pp=await getPage(path,pg); if(!pp||!pp.rows.length) break; ingest(pp.rows,source); if(pp.rows.length<50) break; }
      return;
    }
    // режим таймлайна: определяем реальное направление по данным
    const f = tsOf(p1.rows[0]), l = tsOf(p1.rows[p1.rows.length-1]);
    const desc = f >= l; diag.sortDesc = desc;
    if (desc) {
      let pageMin = Math.min(...p1.rows.map(tsOf));
      for (let pg=2; pg<=30 && pageMin>=fromMs && p1.rows.length>=50; pg++){
        const pp=await getPage(path,pg); if(!pp||!pp.rows.length) break;
        ingest(pp.rows,source); pageMin=Math.min(...pp.rows.map(tsOf));
        if(pp.rows.length<50) break;
      }
    } else {
      // по возрастанию: свежее — в конце, идём с последней страницы назад
      const lp = p1.lastPage || 1;
      for (let pg=lp, c=0; pg>=1 && c<30; pg--, c++){
        const pp=await getPage(path,pg); if(!pp||!pp.rows.length) continue;
        ingest(pp.rows,source);
        if (Math.max(...pp.rows.map(tsOf)) < fromMs) break;
      }
    }
  };

  try {
    await pull("/order", "order");
    await pull("/pipelines/cards", "card");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ok:true, refreshed_at:new Date().toISOString(), timeline:!!timeline, diag, users:Object.values(acc) });
  } catch (e) {
    res.status(200).json({ ok:false, error:String((e&&e.message)||e), users:[] });
  }
}
