// Внутренний API KeyCRM: список пользователей с реальным «последним входом».
// GET https://ratteam.api.keycrm.app/users  (Authorization: Bearer <сессионный токен>)
// Токен (долгоживущий) задаётся в Vercel → Settings → Environment Variables → KEYCRM_SESSION_TOKEN
// (вставить значение БЕЗ слова "Bearer ").

export default async function handler(req, res) {
  const token = process.env.KEYCRM_SESSION_TOKEN;
  if (!token) { res.status(200).json({ ok:false, error:"KEYCRM_SESSION_TOKEN не задан в переменных окружения Vercel", users:[] }); return; }
  const auth = token.startsWith("Bearer ") ? token : "Bearer " + token;
  try {
    const r = await fetch("https://ratteam.api.keycrm.app/users", { headers: { Authorization: auth, Accept: "application/json" } });
    if (!r.ok) {
      res.status(200).json({ ok:false, error:"users вернул статус " + r.status + (r.status===401||r.status===403 ? " — сессионный токен истёк или неверен, обнови его в Vercel" : ""), users:[] });
      return;
    }
    const j = await r.json();
    const rows = Array.isArray(j) ? j : (j.data || j.users || []);
    const users = rows.filter(u => u && !u.is_bot).map(u => ({
      id: String(u.id),
      full_name: u.full_name || ((u.first_name||"") + " " + (u.last_name||"")).trim() || u.username || ("ID "+u.id),
      username: u.username || null,
      last_logged_at: u.last_logged_at || null,
      status: u.status || null,
      role: (u.role && u.role.alias) || null,
    }));
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ok:true, refreshed_at:new Date().toISOString(), users });
  } catch (e) {
    res.status(200).json({ ok:false, error:String((e&&e.message)||e), users:[] });
  }
}
