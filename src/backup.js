// Резервное копирование / восстановление через n8n-вебхук.
// Без Edge Function: приложение само читает таблицы (RLS выключен) и шлёт на вебхук.

export const WEBHOOK_URL = "https://n8n-all.oktb-dm.online/webhook/grillz";
// Необязательный секрет. Если задать здесь И проверять в n8n — без него вебхук должен отдавать 401.
export const BACKUP_TOKEN = "";

// Все таблицы приложения. Порядок upsert — родители раньше детей (для FK).
export const BACKUP_TABLES = ["managers","geos","platforms","sverka_ignored","players","redeposits","planned_redeposits","user_geos","activity_log"];
const UPSERT_ORDER = ["managers","geos","platforms","user_geos","players","redeposits","planned_redeposits","activity_log","sverka_ignored"];
const DELETE_ORDER = ["sverka_ignored","activity_log","planned_redeposits","redeposits","players","user_geos","platforms","geos","managers"];

export const TABLE_LABELS = {
  managers:"Менеджеры", geos:"Гео", platforms:"Платформы", sverka_ignored:"Исключения сверки",
  players:"Лиды", redeposits:"Редепозиты", planned_redeposits:"Плановые РД",
  user_geos:"Доступы к гео", activity_log:"История действий",
};

// ── чтение всех таблиц и сборка объекта бэкапа ──────────────────────────────
export async function buildBackup(supabase){
  const tables = {};
  for (const t of BACKUP_TABLES){
    const { data, error } = await supabase.from(t).select("*");
    if (error) throw new Error(`Чтение «${t}»: ${error.message}`);
    tables[t] = data || [];
  }
  const managers_index = {};
  (tables.managers||[]).forEach(m=>{ managers_index[m.id] = m.name; });
  return { type:"backup", version:1, app:"arbitrage-tracker", created_at:new Date().toISOString(), managers_index, tables };
}

// ── отправка бэкапа на вебхук (POST) ────────────────────────────────────────
export async function postBackup(obj){
  const headers = { "Content-Type":"application/json" };
  if (BACKUP_TOKEN) headers["X-Backup-Token"] = BACKUP_TOKEN;
  const r = await fetch(WEBHOOK_URL, { method:"POST", headers, body:JSON.stringify(obj) });
  if (!r.ok) throw new Error("Вебхук вернул статус "+r.status);
  let j = null; try { j = await r.json(); } catch { /* тело может быть пустым */ }
  return j;
}

// ── устойчивый разбор ответа (массив / объект / обёртки) ─────────────────────
export function unwrapBackup(data){
  let d = data, guard = 0;
  while (d && guard++ < 8){
    if (Array.isArray(d)) { d = d[0]; continue; }
    if (typeof d !== "object") return null;
    if (d.tables && typeof d.tables === "object") return d;
    if (d.data)  { d = d.data;  continue; }
    if (d.body)  { d = d.body;  continue; }
    if (d.json)  { d = d.json;  continue; }
    if (d.result){ d = d.result;continue; }
    return null;
  }
  return null;
}

// ── получение точки восстановления (GET) ────────────────────────────────────
export async function fetchBackup(){
  const headers = {};
  if (BACKUP_TOKEN) headers["X-Backup-Token"] = BACKUP_TOKEN;
  const r = await fetch(WEBHOOK_URL, { method:"GET", headers });
  if (!r.ok) throw new Error("Вебхук вернул статус "+r.status);
  let raw; try { raw = await r.json(); } catch { throw new Error("Ответ не является JSON"); }
  const b = unwrapBackup(raw);
  if (!b || !b.tables) throw new Error("В ответе не найдена структура бэкапа (tables)");
  return b;
}

// ── снимок текущего состояния выбранных таблиц (для отката) ──────────────────
export async function snapshotTables(supabase, tables){
  const snap = {};
  for (const t of tables){
    const { data, error } = await supabase.from(t).select("*");
    if (error) throw new Error(`Снимок «${t}»: ${error.message}`);
    snap[t] = data || [];
  }
  return snap;
}

// ── применение восстановления (upsert по id, без удаления) ───────────────────
export async function applyRestore(supabase, backup, selectedTables){
  const order = UPSERT_ORDER.filter(t=>selectedTables.includes(t));
  for (const t of order){
    const rows = backup.tables[t] || [];
    for (let i=0;i<rows.length;i+=500){
      const chunk = rows.slice(i,i+500);
      const { error } = await supabase.from(t).upsert(chunk, { onConflict:"id" });
      if (error) throw new Error(`Восстановление «${t}»: ${error.message}`);
    }
  }
}

// ── откат к состоянию ДО восстановления ─────────────────────────────────────
// 1) возвращаем старые значения (upsert снимка)
// 2) удаляем строки, которые восстановление добавило заново (есть в бэкапе, не было в снимке)
export async function rollbackRestore(supabase, snapshot, backup, selectedTables){
  for (const t of UPSERT_ORDER){
    if (!selectedTables.includes(t)) continue;
    const rows = snapshot[t] || [];
    for (let i=0;i<rows.length;i+=500){
      const { error } = await supabase.from(t).upsert(rows.slice(i,i+500), { onConflict:"id" });
      if (error) throw new Error(`Откат «${t}»: ${error.message}`);
    }
  }
  for (const t of DELETE_ORDER){
    if (!selectedTables.includes(t)) continue;
    const snapIds = new Set((snapshot[t]||[]).map(r=>r.id));
    const newIds = (backup.tables[t]||[]).map(r=>r.id).filter(id=>id!=null && !snapIds.has(id));
    for (let i=0;i<newIds.length;i+=200){
      const ids = newIds.slice(i,i+200);
      const { error } = await supabase.from(t).delete().in("id", ids);
      if (error) throw new Error(`Откат (удаление) «${t}»: ${error.message}`);
    }
  }
}

// ── локальный кеш (IndexedDB) для точки отката и состояния «ожидает подтверждения» ──
const IDB_DB = "arb_backup", IDB_STORE = "kv";
function idbOpen(){
  return new Promise((res,rej)=>{
    const r = indexedDB.open(IDB_DB, 1);
    r.onupgradeneeded = ()=>{ if(!r.result.objectStoreNames.contains(IDB_STORE)) r.result.createObjectStore(IDB_STORE); };
    r.onsuccess = ()=>res(r.result);
    r.onerror = ()=>rej(r.error);
  });
}
export async function idbSet(key,val){
  const db = await idbOpen();
  return new Promise((res,rej)=>{ const tx=db.transaction(IDB_STORE,"readwrite"); tx.objectStore(IDB_STORE).put(val,key); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); });
}
export async function idbGet(key){
  const db = await idbOpen();
  return new Promise((res,rej)=>{ const tx=db.transaction(IDB_STORE,"readonly"); const rq=tx.objectStore(IDB_STORE).get(key); rq.onsuccess=()=>res(rq.result); rq.onerror=()=>rej(rq.error); });
}
export async function idbDel(key){
  const db = await idbOpen();
  return new Promise((res,rej)=>{ const tx=db.transaction(IDB_STORE,"readwrite"); tx.objectStore(IDB_STORE).delete(key); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); });
}
export const PENDING_KEY = "pending_restore";
