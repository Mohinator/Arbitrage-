import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Select, DatePicker } from "../components/ui";
import { supabase } from "../supabaseClient";
import { STATUSES, LEAD_COLORS, CSS } from "../constants";
import { getStatusStyle, StatusBadge, StatusPopup, ColorPopup, Toast } from "../components/common";
import { PlayersTable } from "../components/PlayersTable";
import { AddLeadForm } from "../components/AddLeadForm";
import { HistoryView } from "../components/HistoryView";
import { ReportView } from "../components/ReportView";
import * as Backup from "../backup";
import * as P from "../presence";

export function AdminPage({ onLogout }) {
  const [managers, setManagers] = useState([]); const [platforms, setPlatforms] = useState([]); const [players, setPlayers] = useState([]); const [redeposits, setRedeposits] = useState([]);
  const [geos, setGeos] = useState([]); const [userGeos, setUserGeos] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [crmActivity, setCrmActivity] = useState([]);
  const [crmBusy, setCrmBusy] = useState(false); const [crmError, setCrmError] = useState(""); const [crmRefreshedAt, setCrmRefreshedAt] = useState(null);
  const [presenceDate, setPresenceDate] = useState(P.todayStr()); const [trackerEvents, setTrackerEvents] = useState({});
  const [crmUsers, setCrmUsers] = useState([]); const [crmUsersCount, setCrmUsersCount] = useState(null);
  const [crmPresence, setCrmPresence] = useState([]); const [crmPresenceErr, setCrmPresenceErr] = useState("");
  const [crmMsgs, setCrmMsgs] = useState({}); const [crmMsgsInfo, setCrmMsgsInfo] = useState(null);
  const loadCrmMsgs = async () => {
    try { const j = await fetch("/api/crm-conversations").then(r=>r.json()); if(j.ok){ setCrmMsgs(j.users||{}); setCrmMsgsInfo({ distinct:j.distinct, scanned:j.scanned }); } else { setCrmMsgsInfo({ err:j.error }); } }
    catch(e){ setCrmMsgsInfo({ err:String(e?.message||e) }); }
  };
  const [dayDate, setDayDate] = useState(P.todayStr());
  const [dayData, setDayData] = useState({}); const [dayTracker, setDayTracker] = useState({});
  const [dayBusy, setDayBusy] = useState(false); const [dayInfo, setDayInfo] = useState(null); const [expandedId, setExpandedId] = useState(null);
  const loadDay = async (dateStr) => {
    const d = dateStr || dayDate; setDayBusy(true);
    try {
      const { fromISO, toISO } = P.dayBoundsISO(d);
      const j = await fetch(`/api/crm-day?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`).then(r=>r.json());
      if(j.ok){ setDayData(j.users||{}); setDayInfo({ conversations:j.conversations, messages:j.messages }); } else setDayInfo({ err:j.error });
      const { data } = await supabase.from("activity_log").select("manager_id, created_at").gte("created_at", fromISO).lt("created_at", toISO);
      const tr={}; (data||[]).forEach(r=>{ (tr[r.manager_id]||(tr[r.manager_id]=[])).push(r.created_at); }); setDayTracker(tr);
    } catch(e){ setDayInfo({ err:String(e?.message||e) }); }
    setDayBusy(false);
  };
  const loadCrmPresence = async () => {
    try { const j = await fetch("/api/crm-presence").then(r=>r.json()); if(j.ok===false&&j.error) setCrmPresenceErr(j.error); else setCrmPresenceErr(""); setCrmPresence(j.users||[]); }
    catch(e){ setCrmPresenceErr("Не удалось получить /users: "+(e?.message||e)); }
  };
  const [presenceMap, setPresenceMap] = useState({});
  const loadPresence = async () => {
    try { const { data } = await supabase.from("manager_presence").select("manager_id, last_seen"); const m={}; (data||[]).forEach(r=>{ m[r.manager_id]=r.last_seen; }); setPresenceMap(m); } catch(e){}
  };
  const loadCrmUsers = async () => {
    try { const j = await fetch("/api/crm-users").then(r=>r.json()); if(Array.isArray(j.users)){ setCrmUsers(j.users); setCrmUsersCount(j.count); } }
    catch(e){ /* список не критичен */ }
  };
  const loadCrmActivity = async (date) => {
    const d = date || presenceDate;
    setCrmBusy(true); setCrmError("");
    try {
      const { fromISO, toISO } = P.dayBoundsISO(d);
      const [crmRes, logRes] = await Promise.all([
        fetch(`/api/crm-activity?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`).then(r=>r.json()).catch(e=>({ok:false,error:String(e),users:[]})),
        supabase.from("activity_log").select("manager_id, created_at").gte("created_at", fromISO).lt("created_at", toISO),
      ]);
      if(crmRes.ok===false&&crmRes.error) setCrmError(crmRes.error);
      setCrmActivity(crmRes.users||[]);
      setCrmRefreshedAt(crmRes.refreshed_at||new Date().toISOString());
      const ev={}; (logRes.data||[]).forEach(r=>{ if(!r.manager_id) return; (ev[r.manager_id]=ev[r.manager_id]||[]).push(r.created_at); });
      setTrackerEvents(ev);
    } catch(e){ setCrmError("Не удалось получить данные: "+(e?.message||e)); }
    setCrmBusy(false);
  };
  const [tab, setTab] = useState("overview"); const [toast, setToast] = useState(null); const [newName, setNewName] = useState(""); const [newRole, setNewRole] = useState("manager");
  const [backupBusy, setBackupBusy] = useState(false); const [lastBackupAt, setLastBackupAt] = useState(null);
  const [restorePreview, setRestorePreview] = useState(null); const [restoreSel, setRestoreSel] = useState([]); const [previewTable, setPreviewTable] = useState(""); const [restoreConfirm, setRestoreConfirm] = useState("");
  const [pendingRestore, setPendingRestore] = useState(null); const [restoreBusy, setRestoreBusy] = useState(false);
  const [previewMgr, setPreviewMgr] = useState(null);
  const MGR_SECTIONS = [["players","Лиды"],["redeposits","Редепозиты"],["planned_redeposits","Плановые РД"],["user_geos","Доступы к гео"],["activity_log","История действий"]];
  const [mgrSel, setMgrSel] = useState(MGR_SECTIONS.map(s=>s[0]));
  const [mgrConfirm, setMgrConfirm] = useState("");

  const buildMgrPlan = (m, tables) => {
    const myPlayers=(tables.players||[]).filter(p=>p.manager_id===m.id);
    const pids=new Set(myPlayers.map(p=>p.id));
    return {
      players: myPlayers,
      redeposits: (tables.redeposits||[]).filter(r=>pids.has(r.player_id)),
      planned_redeposits: (tables.planned_redeposits||[]).filter(r=>pids.has(r.player_id)),
      user_geos: (tables.user_geos||[]).filter(u=>u.manager_id===m.id),
      activity_log: (tables.activity_log||[]).filter(l=>l.manager_id===m.id),
    };
  };

  const runMgrRestore = async () => {
    if(mgrConfirm.trim().toUpperCase()!=="ВОССТАНОВИТЬ"){ showToast("Впишите слово ВОССТАНОВИТЬ","error"); return; }
    if(mgrSel.length===0){ showToast("Не выбрано ни одного раздела","error"); return; }
    const full = buildMgrPlan(previewMgr, restorePreview.tables);
    const plan = {}; mgrSel.forEach(t=>{ plan[t]=full[t]||[]; });
    if(Object.values(plan).every(a=>a.length===0)){ showToast("У менеджера нет данных в этих разделах","error"); return; }
    setRestoreBusy(true);
    try {
      const idsByTable={}; Object.keys(plan).forEach(t=>idsByTable[t]=plan[t].map(r=>r.id).filter(Boolean));
      const snapshot = await Backup.snapshotByIds(supabase, idsByTable);
      await Backup.idbSet(Backup.PENDING_KEY, { at:new Date().toISOString(), mode:"plan", scope:"менеджер: "+previewMgr.name, tables:mgrSel, plan, snapshot });
      await Backup.applyRestorePlan(supabase, plan);
      setPendingRestore({ at:new Date().toISOString(), scope:"менеджер: "+previewMgr.name, tables:mgrSel });
      setRestorePreview(null); setPreviewMgr(null);
      await load();
      showToast("Восстановлено для "+previewMgr.name);
    } catch(e){ showToast("Ошибка восстановления: "+(e?.message||e),"error"); }
    setRestoreBusy(false);
  };
  const [showPlatformForm, setShowPlatformForm] = useState(false); const [editingPlatform, setEditingPlatform] = useState(null);
  const [pForm, setPForm] = useState({ name:"", target_avg_check:"", min_deposit:"", min_deposit_blik:"", cap:"", date_added:"", is_active:true, reset_monthly:false, geo_id:"" });
  const [showGeoForm, setShowGeoForm] = useState(false); const [geoForm, setGeoForm] = useState({ name:"", code:"" });
  const [selectedManager, setSelectedManager] = useState(null);
  const [selectedHistoryGeo, setSelectedHistoryGeo] = useState(null);
  const [adminViewGeo, setAdminViewGeo] = useState(null);
  const [adminViewManager, setAdminViewManager] = useState(null);
  const [plannedRds, setPlannedRds] = useState([]);
  const [assigningManager, setAssigningManager] = useState(null); // manager id for geo assignment

  const showToast = (msg,type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const [highlightId, setHighlightId] = useState(null);
  const [taskGeo, setTaskGeo] = useState(""); const [taskPlat, setTaskPlat] = useState(""); const [taskMgr, setTaskMgr] = useState(""); const [taskDateFilter, setTaskDateFilter] = useState("");
  const goToLead = (player) => {
    if(!player) return;
    const plat=platforms.find(p=>p.id===player.platform_id);
    let geoId=plat?.geo_id;
    if(!geoId){ const ug=userGeos.find(u=>u.manager_id===player.manager_id); geoId=ug?.geo_id; }
    if(geoId) setAdminViewGeo(geoId);
    setAdminViewManager(player.manager_id);
    setHighlightId(player.id);
    setTab("leads");
    setTimeout(()=>setHighlightId(null),3000);
  };

  const mapCrmUser = async (managerId, crmUserId) => {
    const { error } = await supabase.from("managers").update({ crm_user_id: crmUserId||null }).eq("id", managerId);
    if(error){ showToast("Не удалось сохранить: "+error.message,"error"); return; }
    await load();
  };

  const load = async () => {
    const [{ data:m },{ data:p },{ data:pl },{ data:rd },{ data:prd },{ data:g },{ data:ug },{ data:log }] = await Promise.all([
      supabase.from("managers").select("*").order("created_at"),
      supabase.from("platforms").select("*").order("sort_order").order("name"),
      supabase.from("players").select("*"),
      supabase.from("redeposits").select("*"),
      supabase.from("planned_redeposits").select("*"),
      supabase.from("geos").select("*").order("name"),
      supabase.from("user_geos").select("*"),
      supabase.from("activity_log").select("*, managers(name), players(name)").order("created_at",{ascending:false}).limit(200),
    ]);
    setManagers(m||[]); setPlatforms(p||[]); setPlayers(pl||[]); setRedeposits(rd||[]); setPlannedRds(prd||[]);
    setGeos(g||[]); setUserGeos(ug||[]); setActivityLog(log||[]);
  };
  useEffect(()=>{ load(); },[]);
  useEffect(()=>{ Backup.idbGet(Backup.PENDING_KEY).then(p=>{ if(p) setPendingRestore(p); }).catch(()=>{}); },[]);
  useEffect(()=>{ if(tab==="activity"&&crmPresence.length===0) loadCrmPresence(); if(tab==="activity"&&!crmMsgsInfo) loadCrmMsgs(); if(tab==="activity"&&!dayInfo) loadDay(); },[tab]);

  const doBackup = async () => {
    setBackupBusy(true);
    try {
      const obj = await Backup.buildBackup(supabase);
      await Backup.postBackup(obj);
      const when = new Date().toLocaleString("ru");
      setLastBackupAt(when);
      showToast("Бэкап отправлен ✓");
    } catch(e){ showToast("Бэкап не удался: "+(e?.message||e),"error"); }
    setBackupBusy(false);
  };

  const openRestorePreview = async () => {
    setRestoreBusy(true);
    try {
      const b = await Backup.fetchBackup();
      const present = Backup.BACKUP_TABLES.filter(t=>Array.isArray(b.tables[t]));
      setRestorePreview(b);
      setRestoreSel(present);
      setPreviewTable(present[0]||"");
      setRestoreConfirm("");
    } catch(e){ showToast("Не удалось загрузить точку: "+(e?.message||e),"error"); }
    setRestoreBusy(false);
  };

  const runRestore = async () => {
    if(restoreConfirm.trim().toUpperCase()!=="ВОССТАНОВИТЬ"){ showToast("Введите слово ВОССТАНОВИТЬ для подтверждения","error"); return; }
    if(restoreSel.length===0){ showToast("Не выбрано ни одной таблицы","error"); return; }
    setRestoreBusy(true);
    try {
      const snapshot = await Backup.snapshotTables(supabase, restoreSel);
      await Backup.idbSet(Backup.PENDING_KEY, { at:new Date().toISOString(), tables:restoreSel, snapshot, backup:restorePreview });
      await Backup.applyRestore(supabase, restorePreview, restoreSel);
      const pend = { at:new Date().toISOString(), tables:restoreSel };
      setPendingRestore(pend);
      setRestorePreview(null);
      await load();
      showToast("Восстановление применено — проверьте данные");
    } catch(e){ showToast("Ошибка восстановления: "+(e?.message||e),"error"); }
    setRestoreBusy(false);
  };

  const confirmRestore = async () => {
    await Backup.idbDel(Backup.PENDING_KEY);
    setPendingRestore(null);
    showToast("Восстановление подтверждено ✓");
  };

  const rollbackRestore = async () => {
    if(!confirm("Откатить к состоянию ДО восстановления? Текущие изменения по этим таблицам будут отменены.")) return;
    setRestoreBusy(true);
    try {
      const p = await Backup.idbGet(Backup.PENDING_KEY);
      if(!p){ showToast("Точка отката не найдена","error"); setPendingRestore(null); setRestoreBusy(false); return; }
      if(p.mode==="plan") await Backup.rollbackPlan(supabase, p.snapshot, p.plan);
      else await Backup.rollbackRestore(supabase, p.snapshot, p.backup, p.tables);
      await Backup.idbDel(Backup.PENDING_KEY);
      setPendingRestore(null);
      await load();
      showToast("Откат выполнен — данные вернулись к состоянию до восстановления");
    } catch(e){ showToast("Ошибка отката: "+(e?.message||e),"error"); }
    setRestoreBusy(false);
  };

  const createManager = async () => {
    if(!newName.trim()) return;
    const token=Math.random().toString(36).substring(2,10).toUpperCase();
    await supabase.from("managers").insert({name:newName.trim(),token,role:newRole});
    showToast(`Создан! Токен: ${token}`); setNewName(""); load();
  };
  const deleteManager = async (id) => { if(!confirm("Удалить?")) return; await supabase.from("managers").delete().eq("id",id); load(); };
  const toggleManager = async (m) => { await supabase.from("managers").update({is_active:!m.is_active}).eq("id",m.id); load(); };
  const toggleManagerRole = async (m) => { const newRole=m.role==="team_lead"?"manager":"team_lead"; await supabase.from("managers").update({role:newRole}).eq("id",m.id); showToast(`${m.name} → ${newRole==="team_lead"?"Тим лид":"Менеджер"}`); load(); };

  const createGeo = async () => {
    if(!geoForm.name.trim()) return;
    await supabase.from("geos").insert({name:geoForm.name.trim(),code:geoForm.code.trim().toUpperCase()});
    showToast("Гео добавлено!"); setGeoForm({name:"",code:""}); setShowGeoForm(false); load();
  };

  const toggleUserGeo = async (managerId, geoId) => {
    const exists=userGeos.find(ug=>ug.manager_id===managerId&&ug.geo_id===geoId);
    if(exists) await supabase.from("user_geos").delete().eq("id",exists.id);
    else await supabase.from("user_geos").insert({manager_id:managerId,geo_id:geoId});
    load();
  };

  const openPlatformForm = (p=null) => { setEditingPlatform(p); setPForm(p?{name:p.name,target_avg_check:p.target_avg_check,min_deposit:p.min_deposit||"",min_deposit_blik:p.min_deposit_blik||"",cap:p.cap||"",date_added:p.date_added||"",is_active:p.is_active!==false,reset_monthly:p.reset_monthly||false,geo_id:p.geo_id||""}:{name:"",target_avg_check:"",min_deposit:"",min_deposit_blik:"",cap:"",date_added:new Date().toISOString().slice(0,10),is_active:true,reset_monthly:false,geo_id:""}); setShowPlatformForm(true); };
  const savePlatform = async () => { if(!pForm.name||!pForm.target_avg_check){ showToast("Заполни поля","error"); return; } const data={name:pForm.name,target_avg_check:Number(pForm.target_avg_check),min_deposit:Number(pForm.min_deposit)||0,min_deposit_blik:pForm.min_deposit_blik?Number(pForm.min_deposit_blik):null,cap:pForm.cap?Number(pForm.cap):null,date_added:pForm.date_added||null,is_active:pForm.is_active,reset_monthly:pForm.reset_monthly,geo_id:pForm.geo_id||null}; if(editingPlatform){ await supabase.from("platforms").update(data).eq("id",editingPlatform.id); showToast("Обновлено!"); }else{ await supabase.from("platforms").insert(data); showToast("Добавлено!"); } setShowPlatformForm(false); load(); };
  const deletePlatform = async (id) => { if(!confirm("Удалить?")) return; await supabase.from("platforms").delete().eq("id",id); load(); };

  const getPlayerRds = (pid) => redeposits.filter(r=>r.player_id===pid);
  const calcEffectiveTotal = (player) => { const rds=getPlayerRds(player.id).sort((a,b)=>a.rd_number-b.rd_number); if(player.status==="Кинул"&&rds.length>0) return Number(player.deposit)+rds.slice(0,-1).reduce((s,r)=>s+Number(r.amount),0); return Number(player.deposit)+rds.reduce((s,r)=>s+Number(r.amount),0); };

  const platformStats=platforms.map(plat=>{ const active=players.filter(p=>p.platform_id===plat.id&&p.status==="Да"); const cnt=active.length,amt=active.reduce((s,p)=>s+calcEffectiveTotal(p),0),avg=cnt>0?amt/cnt:0,blik=active.filter(p=>p.is_blik).length,blikPct=cnt>0?Math.round((blik/cnt)*100):0; return{...plat,totalCount:cnt,totalAmount:amt,avgCheck:avg,blikCount:blik,blikPct,allCount:players.filter(p=>p.platform_id===plat.id).length}; });
  const managerStats=managers.map(m=>{ const mp=players.filter(p=>p.manager_id===m.id&&p.status==="Да"); const cnt=mp.length,amt=mp.reduce((s,p)=>s+calcEffectiveTotal(p),0); const byPlatform=platforms.map(plat=>{ const pp=mp.filter(p=>p.platform_id===plat.id),c=pp.length,a=pp.reduce((s,p)=>s+calcEffectiveTotal(p),0),blik=pp.filter(p=>p.is_blik).length,blikPct=c>0?Math.round((blik/c)*100):0; return{...plat,cnt:c,amt:a,avg:c>0?a/c:0,blik,blikPct}; }).filter(p=>p.cnt>0); const mGeos=userGeos.filter(ug=>ug.manager_id===m.id).map(ug=>geos.find(g=>g.id===ug.geo_id)).filter(Boolean); return{...m,totalCount:cnt,totalAmount:amt,byPlatform,geos:mGeos}; });
  const filteredLog=(()=>{
    let log=activityLog;
    if(selectedHistoryGeo){
      const geoManagerIds=new Set(userGeos.filter(ug=>ug.geo_id===selectedHistoryGeo).map(ug=>ug.manager_id));
      log=log.filter(l=>geoManagerIds.has(l.manager_id));
    }
    if(selectedManager) log=log.filter(l=>l.manager_id===selectedManager);
    return log;
  })();
  const actionLabels={"lead_added":"Добавил лида","rd_added":"Внёс РД","rd_planned":"Запланировал РД","rd_marked_done":"Отметил РД","rd_reset":"Сбросил РД","status_changed":"Изменил статус","automation_applied":"Автоматизация"};

  const S={th:{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#4A4A5A",textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:"1px solid rgba(255,255,255,.08)",background:"#101010"},td:{padding:"11px 12px",borderBottom:"1px solid #101010"}};
  const IS={background:"#080808",border:"1px solid rgba(255,255,255,.08)",color:"#F0F0F2",padding:"8px 10px",borderRadius:7,fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"};

  return (
    <div style={{minHeight:"100vh",background:"#080808",color:"#F0F0F2",fontFamily:"'Inter',sans-serif"}}>
      <style>{CSS}</style>
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}

      {showGeoForm&&(
        <div style={{position:"fixed",inset:0,background:"transparent",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div className="slide-in" style={{background:"rgba(16,16,18,.25)",backdropFilter:"blur(24px) saturate(150%)",WebkitBackdropFilter:"blur(24px) saturate(150%)",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,padding:24,width:"100%",maxWidth:380,boxShadow:"0 24px 64px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06)"}}>
            <h3 style={{color:"#fff",marginBottom:18,fontSize:15,fontWeight:700}}>Добавить гео</h3>
            <div style={{marginBottom:12}}><label style={{display:"block",fontSize:10,color:"#4A4A5A",marginBottom:4,fontWeight:700,textTransform:"uppercase"}}>Название *</label><input value={geoForm.name} onChange={e=>setGeoForm(f=>({...f,name:e.target.value}))} placeholder="Польша" style={IS}/></div>
            <div style={{marginBottom:18}}><label style={{display:"block",fontSize:10,color:"#4A4A5A",marginBottom:4,fontWeight:700,textTransform:"uppercase"}}>Код (2 буквы)</label><input value={geoForm.code} onChange={e=>setGeoForm(f=>({...f,code:e.target.value}))} placeholder="PL" maxLength={3} style={IS}/></div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={createGeo} className="btn-p" style={{flex:1,padding:"10px",fontSize:14}}>Добавить</button>
              <button onClick={()=>setShowGeoForm(false)} className="btn-g" style={{flex:1,border:"1px solid rgba(255,255,255,.08)",color:"#8B8B9A",padding:"10px",borderRadius:8,cursor:"pointer"}}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {showPlatformForm&&(
        <div style={{position:"fixed",inset:0,background:"transparent",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div className="slide-in" style={{background:"rgba(16,16,18,.25)",backdropFilter:"blur(24px) saturate(150%)",WebkitBackdropFilter:"blur(24px) saturate(150%)",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,padding:24,width:"100%",maxWidth:460,boxShadow:"0 24px 64px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06)"}}>
            <h3 style={{color:"#fff",marginBottom:18,fontSize:15,fontWeight:700}}>{editingPlatform?"Редактировать":"Добавить"} платформу</h3>
            {[["Название *","name","text"],["Цель СЧ (€) *","target_avg_check","number"],["Мин. депозит (€)","min_deposit","number"],["Мин. депозит BLIK (€)","min_deposit_blik","number"],["Капа","cap","number"],["Дата добавления","date_added","date"]].map(([l,k,t])=>(
              <div key={k} style={{marginBottom:12}}><label style={{display:"block",fontSize:10,color:"#4A4A5A",marginBottom:4,fontWeight:700,textTransform:"uppercase"}}>{l}</label><input type={t} value={pForm[k]} onChange={e=>setPForm(f=>({...f,[k]:e.target.value}))} style={IS}/></div>
            ))}
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:10,color:"#4A4A5A",marginBottom:4,fontWeight:700,textTransform:"uppercase"}}>Гео</label>
              <Select value={pForm.geo_id} onChange={v=>setPForm(f=>({...f,geo_id:v}))} style={{...IS,width:"100%"}} options={[{value:"",label:"— Выбери гео"},...geos.map(g=>({value:g.id,label:g.name}))]}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}>
              {[["is_active","Платформа активна"],["reset_monthly","Сбрасывать СЧ каждый месяц"]].map(([k,l])=>(
                <label key={k} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                  <input type="checkbox" checked={pForm[k]} onChange={e=>setPForm(f=>({...f,[k]:e.target.checked}))} style={{width:14,height:14,accentColor:"#9B5FD0",cursor:"pointer"}}/>
                  <span style={{color:"#8B8B9A",fontSize:13}}>{l}</span>
                </label>
              ))}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={savePlatform} className="btn-p" style={{flex:1,padding:"10px",fontSize:14}}>Сохранить</button>
              <button onClick={()=>setShowPlatformForm(false)} className="btn-g" style={{flex:1,border:"1px solid rgba(255,255,255,.08)",color:"#8B8B9A",padding:"10px",borderRadius:8,cursor:"pointer"}}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      <div style={{background:"#101010",borderBottom:"1px solid rgba(255,255,255,.08)",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"var(--grad)",boxShadow:"0 0 8px rgba(155,79,224,.6)"}}/>
          <span style={{fontWeight:800,fontSize:15,color:"#fff",letterSpacing:"0.05em"}}>АРБИТРАЖ</span>
          <span style={{background:"var(--grad-soft)",color:"#c8a8ff",fontSize:11,fontFamily:"var(--gilroy)",padding:"3px 9px",borderRadius:50,fontWeight:700,letterSpacing:".05em",border:"1px solid rgba(155,79,224,.3)"}}>ADMIN</span>
        </div>
        <button onClick={onLogout} className="btn-g" style={{border:"1px solid rgba(255,255,255,.12)",color:"#8B8B9A",padding:"6px 14px",borderRadius:6,cursor:"pointer",fontSize:13}}>Выйти</button>
      </div>

      <div style={{background:"#101010",borderBottom:"1px solid rgba(255,255,255,.08)",padding:"0 24px",display:"flex"}}>
        {[["overview","Сводка"],["tasks",<span>Задачи{(()=>{ const t=new Date().toISOString().slice(0,10); const ids=new Set((plannedRds||[]).filter(r=>r&&r.date&&r.date<t).map(r=>r.player_id)); const c=players.filter(p=>p&&ids.has(p.id)).length; return c>0?<span style={{ color:"#F2706E",fontWeight:700,marginLeft:6 }}>{c}</span>:null; })()}</span>],["managers","Менеджеры"],["platforms","Платформы"],["geos","Гео"],["report","Отчёт"],["history","История"],["leads","Лиды"],["backup","Бэкап"],["activity","Активность"]].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} className="nb" style={{background:"transparent",border:"none",color:tab===key?"#9B5FD0":"#4A4A5A",padding:"12px 18px",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:tab===key?"2px solid #9B5FD0":"2px solid transparent"}}>{label}</button>
        ))}
      </div>

      <div style={{padding:"24px",maxWidth:1400,margin:"0 auto"}}>

        {tab==="overview"&&(
          <div>
            <h2 style={{color:"#fff",marginBottom:20,fontSize:18}}>Общий СЧ по платформам</h2>
            <div style={{border:"1px solid rgba(255,255,255,.08)",borderRadius:10,overflow:"hidden",marginBottom:32}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Платформа","Гео","Лидов","Сумма","СЧ факт","СЧ цель","Капа","Выполнено","BLIK","Период"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {platformStats.map(p=>{
                    const ok=p.avgCheck>=p.target_avg_check,pct=p.cap?Math.min(100,Math.round((p.totalCount/p.cap)*100)):0;
                    const geo=geos.find(g=>g.id===p.geo_id);
                    return(
                      <tr key={p.id} className="row-hover">
                        <td style={{...S.td,fontWeight:600,color:"#F0F0F2"}}>{p.name}</td>
                        <td style={S.td}>{geo?<span style={{background:"rgba(155,79,224,.15)",color:"#c8a8ff",padding:"2px 7px",borderRadius:5,fontSize:11,fontWeight:600}}>{geo.name}</span>:"—"}</td>
                        <td style={{...S.td,color:"#8B8B9A"}}>{p.totalCount}</td>
                        <td style={{...S.td,color:"#8B8B9A"}}>{p.totalAmount.toFixed(0)}€</td>
                        <td style={S.td}><span style={{background:p.totalCount===0?"rgba(255,255,255,.05)":ok?"rgba(61,214,140,.13)":"rgba(242,112,110,.13)",color:p.totalCount===0?"#4A4A5A":ok?"#3DD68C":"#F2706E",padding:"3px 9px",borderRadius:6,fontWeight:700,fontSize:12}}>{p.totalCount===0?"—":p.avgCheck.toFixed(1)+"€"}</span></td>
                        <td style={{...S.td,color:"#8B8B9A"}}>{p.target_avg_check}€</td>
                        <td style={{...S.td,color:"#8B8B9A"}}>{p.cap??"—"}</td>
                        <td style={S.td}>{p.cap?<div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:40,background:"#080808",borderRadius:4,height:5,overflow:"hidden"}}><div className="progress-bar" style={{width:`${pct}%`,height:"100%",background:pct>=100?"linear-gradient(90deg,#F2706E,#F2706E)":"var(--grad)"}}/></div><span style={{color:pct>=100?"#F2706E":pct>=80?"#F4924A":"#8B8B9A",fontSize:12}}>{p.totalCount}/{p.cap}</span></div>:"—"}</td>
                        <td style={S.td}>{p.totalCount>0?<div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:44,background:"#080808",borderRadius:3,height:4,overflow:"hidden",display:"flex"}}><div className="progress-bar" style={{width:`${100-p.blikPct}%`,height:"100%",background:"var(--grad)"}}/><div className="progress-bar" style={{width:`${p.blikPct}%`,height:"100%",background:"linear-gradient(90deg,#F4B740,#F4924A)"}}/></div><span style={{color:"#F4924A",fontSize:11}}>{p.blikPct}%({p.blikCount})</span></div>:<span style={{color:"#4A4A5A"}}>—</span>}</td>
                        <td style={S.td}><span style={{background:p.reset_monthly?"rgba(176,123,245,.13)":"rgba(255,255,255,.05)",color:p.reset_monthly?"#B07BF5":"#4A4A5A",padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600}}>{p.reset_monthly?"Помесячно":"Накопит."}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <h2 style={{color:"#fff",marginBottom:20,fontSize:18}}>По менеджерам</h2>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {managerStats.map(m=>(
                <div key={m.id} style={{border:"1px solid rgba(255,255,255,.08)",borderRadius:10,overflow:"hidden"}}>
                  <div style={{padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:m.byPlatform.length>0?"1px solid rgba(255,255,255,.08)":"none",background:"#101010"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontWeight:700,color:"#fff",fontSize:14}}>{m.name}</span>
                      <span style={{background:m.role==="team_lead"?"rgba(155,79,224,.18)":"rgba(155,79,224,.15)",color:m.role==="team_lead"?"#fff":"#c8a8ff",fontSize:10,padding:"1px 7px",borderRadius:4,fontWeight:700}}>{m.role==="team_lead"?"Тим лид":"Менеджер"}</span>
                      {m.geos.map(g=><span key={g.id} style={{background:"rgba(155,79,224,.1)",color:"#c8a8ff",fontSize:10,padding:"1px 6px",borderRadius:4}}>{g.name}</span>)}
                    </div>
                    <div style={{display:"flex",gap:20}}><span style={{color:"#4A4A5A",fontSize:12}}>Лидов: <strong style={{color:"#8B8B9A"}}>{m.totalCount}</strong></span><span style={{color:"#4A4A5A",fontSize:12}}>Сумма: <strong style={{color:"#8B8B9A"}}>{m.totalAmount.toFixed(0)}€</strong></span></div>
                  </div>
                  {m.byPlatform.length>0&&(
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead><tr>{["Платформа","Лидов","Сумма","BLIK","СЧ цель","СЧ факт"].map(h=><th key={h} style={{...S.th,padding:"7px 18px"}}>{h}</th>)}</tr></thead>
                      <tbody>
                        {m.byPlatform.map(p=>{
                          const ok=p.avg>=p.target_avg_check;
                          return(
                            <tr key={p.id} className="row-hover">
                              <td style={{padding:"9px 18px",color:"rgba(255,255,255,.1)",fontSize:12,borderBottom:"1px solid rgba(255,255,255,.05)"}}>{p.name}</td>
                              <td style={{padding:"9px 18px",color:"#8B8B9A",fontSize:12,borderBottom:"1px solid rgba(255,255,255,.05)"}}>{p.cnt}</td>
                              <td style={{padding:"9px 18px",color:"#8B8B9A",fontSize:12,borderBottom:"1px solid rgba(255,255,255,.05)"}}>{p.amt.toFixed(0)}€</td>
                              <td style={{padding:"9px 18px",borderBottom:"1px solid rgba(255,255,255,.05)"}}>{p.cnt>0?<div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:36,background:"#080808",borderRadius:3,height:4,overflow:"hidden",display:"flex"}}><div style={{width:`${100-p.blikPct}%`,height:"100%",background:"var(--grad)"}}/><div style={{width:`${p.blikPct}%`,height:"100%",background:"linear-gradient(90deg,#F4B740,#F4924A)"}}/></div><span style={{color:"#F4924A",fontSize:11}}>{p.blik}({p.blikPct}%)</span></div>:"—"}</td>
                              <td style={{padding:"9px 18px",color:"#8B8B9A",fontSize:12,borderBottom:"1px solid rgba(255,255,255,.05)"}}>{p.target_avg_check}€</td>
                              <td style={{padding:"9px 18px",borderBottom:"1px solid rgba(255,255,255,.05)"}}><span style={{background:ok?"rgba(61,214,140,.13)":"rgba(242,112,110,.13)",color:ok?"#3DD68C":"#F2706E",padding:"2px 8px",borderRadius:6,fontWeight:700,fontSize:11}}>{p.avg.toFixed(1)}€</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  {m.byPlatform.length===0&&<div style={{padding:"12px 18px",color:"#4A4A5A",fontSize:12}}>Нет данных</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="managers"&&(
          <div>
            <h2 style={{color:"#fff",marginBottom:20,fontSize:18}}>Менеджеры</h2>
            <div style={{background:"#101010",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,padding:20,marginBottom:24}}>
              <div style={{display:"flex",gap:10,marginBottom:0}}>
                <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createManager()} placeholder="Имя менеджера" style={{flex:1,background:"#080808",border:"1px solid rgba(255,255,255,.08)",color:"#F0F0F2",padding:"9px 12px",borderRadius:8,fontSize:13,outline:"none"}}/>
                <Select value={newRole} onChange={v=>setNewRole(v)} style={{background:"#080808",border:"1px solid rgba(255,255,255,.08)",color:"#F0F0F2",padding:"9px 12px",borderRadius:8,fontSize:13,outline:"none"}} options={[{value:"manager",label:"Менеджер"},{value:"team_lead",label:"Тим лид"}]}/>
                <button onClick={createManager} className="btn-p" style={{padding:"9px 20px",fontSize:13,borderRadius:8}}>+ Создать</button>
              </div>
            </div>
            <div style={{border:"1px solid rgba(255,255,255,.08)",borderRadius:10,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Имя","Токен","Роль","Keitaro","Гео","Статус","Лидов","Действия"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {managers.map(m=>{
                    const mGeos=userGeos.filter(ug=>ug.manager_id===m.id).map(ug=>geos.find(g=>g.id===ug.geo_id)).filter(Boolean);
                    const isAssigning=assigningManager===m.id;
                    return(
                      <>
                        <tr key={m.id} className="row-hover">
                          <td style={{...S.td,fontWeight:600,color:"#F0F0F2"}}>{m.name}</td>
                          <td style={S.td}><code style={{background:"#080808",border:"1px solid rgba(255,255,255,.08)",padding:"3px 8px",borderRadius:5,fontSize:12,color:"#c8a8ff",letterSpacing:"0.1em"}}>{m.token}</code></td>
                          <td style={S.td}><span onClick={()=>toggleManagerRole(m)} style={{background:m.role==="team_lead"?"rgba(155,79,224,.18)":"rgba(155,79,224,.15)",color:m.role==="team_lead"?"#fff":"#c8a8ff",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",userSelect:"none"}} title="Нажми для смены роли">{m.role==="team_lead"?"Тим лид":"Менеджер"}</span></td>
                          <td style={S.td}><input defaultValue={m.keitaro_names||""} onBlur={async e=>{ const v=e.target.value.trim(); if(v!==(m.keitaro_names||"")){ await supabase.from("managers").update({keitaro_names:v}).eq("id",m.id); showToast("Имена Keitaro сохранены"); load(); } }} placeholder="Viktor, Vik" title="Имена менеджера в кампаниях Keitaro, через запятую" style={{background:"#080808",border:"1px solid rgba(255,255,255,.08)",color:"#F0F0F2",padding:"4px 8px",borderRadius:6,fontSize:12,outline:"none",width:130}}/></td>
                          <td style={S.td}>
                            <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                              {mGeos.map(g=><span key={g.id} style={{background:"rgba(155,79,224,.1)",color:"#c8a8ff",fontSize:11,padding:"1px 7px",borderRadius:5,fontWeight:600}}>{g.name}</span>)}
                              <button onClick={()=>setAssigningManager(isAssigning?null:m.id)} style={{background:"transparent",border:"1px dashed rgba(255,255,255,.12)",color:"#4A4A5A",padding:"1px 8px",borderRadius:5,cursor:"pointer",fontSize:11}}>+ гео</button>
                            </div>
                          </td>
                          <td style={S.td}><span style={{background:m.is_active?"rgba(61,214,140,.13)":"rgba(255,255,255,.05)",color:m.is_active?"#3DD68C":"#4A4A5A",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600}}>{m.is_active?"Активен":"Отключён"}</span></td>
                          <td style={{...S.td,color:"#8B8B9A"}}>{players.filter(p=>p.manager_id===m.id).length}</td>
                          <td style={{...S.td,display:"flex",gap:6}}>
                            <button onClick={()=>toggleManager(m)} className="btn-g" style={{border:"1px solid rgba(255,255,255,.08)",color:"#8B8B9A",padding:"5px 10px",borderRadius:6,cursor:"pointer",fontSize:11}}>{m.is_active?"Откл":"Вкл"}</button>
                            <button onClick={()=>deleteManager(m.id)} className="btn-g btn-danger" style={{border:"1px solid rgba(255,255,255,.08)",color:"#8B8B9A",padding:"5px 10px",borderRadius:6,cursor:"pointer",fontSize:11}}>Удалить</button>
                          </td>
                        </tr>
                        {isAssigning&&(
                          <tr key={`assign-${m.id}`}>
                            <td colSpan={8} style={{padding:"10px 18px",background:"#101010",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
                              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                                <span style={{color:"#4A4A5A",fontSize:12}}>Назначить гео:</span>
                                {geos.map(g=>{
                                  const hasGeo=userGeos.some(ug=>ug.manager_id===m.id&&ug.geo_id===g.id);
                                  return(
                                    <button key={g.id} onClick={()=>toggleUserGeo(m.id,g.id)} style={{background:hasGeo?"var(--grad)":"rgba(255,255,255,.05)",color:hasGeo?"#fff":"#8B8B9A",border:`1px solid ${hasGeo?"#9B5FD0":"rgba(255,255,255,.08)"}`,padding:"4px 12px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,transition:"all .15s"}}>
                                      {hasGeo?"✓ ":""}{g.name}{g.code?` (${g.code})`:""}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab==="platforms"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{color:"#fff",fontSize:18,margin:0}}>Платформы</h2>
              <button onClick={()=>openPlatformForm()} className="btn-p" style={{padding:"8px 18px",fontSize:13,borderRadius:8}}>+ Добавить</button>
            </div>
            <div style={{border:"1px solid rgba(255,255,255,.08)",borderRadius:10,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Платформа","Гео","Дата","Мин. деп","Цель СЧ","Капа","Период","Статус","Действия"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {platforms.map(p=>{
                    const isActive=p.is_active!==false,geo=geos.find(g=>g.id===p.geo_id);
                    return(
                      <tr key={p.id} className="row-hover" style={{opacity:isActive?1:0.5}}>
                        <td style={{...S.td,fontWeight:600,color:"#F0F0F2"}}>{p.name}</td>
                        <td style={S.td}>{geo?<span style={{background:"rgba(155,79,224,.15)",color:"#c8a8ff",padding:"2px 7px",borderRadius:5,fontSize:11,fontWeight:600}}>{geo.name}</span>:"—"}</td>
                        <td style={{...S.td,color:"#8B8B9A",fontSize:12}}>{p.date_added||"—"}</td>
                        <td style={{...S.td,color:"#8B8B9A"}}>{p.min_deposit||"—"}€</td>
                        <td style={S.td}><span style={{background:"rgba(176,123,245,.13)",color:"#B07BF5",padding:"2px 8px",borderRadius:6,fontWeight:700,fontSize:11}}>{p.target_avg_check}€</span></td>
                        <td style={{...S.td,color:"#8B8B9A"}}>{p.cap||"—"}</td>
                        <td style={S.td}><span style={{background:p.reset_monthly?"rgba(176,123,245,.13)":"rgba(255,255,255,.05)",color:p.reset_monthly?"#B07BF5":"#4A4A5A",padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600}}>{p.reset_monthly?"Помесячно":"Накопит."}</span></td>
                        <td style={S.td}><span style={{background:isActive?"rgba(61,214,140,.13)":"rgba(255,255,255,.05)",color:isActive?"#3DD68C":"#4A4A5A",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600}}>{isActive?"Активна":"Скрыта"}</span></td>
                        <td style={{...S.td,display:"flex",gap:6}}>
                          <button onClick={()=>openPlatformForm(p)} className="btn-g" style={{border:"1px solid rgba(255,255,255,.08)",color:"#8B8B9A",width:28,height:28,borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={()=>deletePlatform(p.id)} className="btn-g btn-danger" style={{border:"1px solid rgba(242,112,110,.4)",color:"#F2706E",width:28,height:28,borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab==="geos"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{color:"#fff",fontSize:18,margin:0}}>Гео</h2>
              <button onClick={()=>setShowGeoForm(true)} className="btn-p" style={{padding:"8px 18px",fontSize:13,borderRadius:8}}>+ Добавить гео</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:14}}>
              {geos.map(g=>{
                const geoPlatforms=platforms.filter(p=>p.geo_id===g.id);
                const geoManagers2=userGeos.filter(ug=>ug.geo_id===g.id).map(ug=>managers.find(m=>m.id===ug.manager_id)).filter(Boolean);
                return(
                  <div key={g.id} style={{background:"#101010",border:`1px solid ${g.is_active===false?"rgba(242,112,110,.4)":"rgba(255,255,255,.08)"}`,borderRadius:10,padding:16,opacity:g.is_active===false?0.6:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      {g.code&&<span style={{background:"var(--grad)",color:"#fff",padding:"2px 8px",borderRadius:6,fontSize:12,fontWeight:700}}>{g.code}</span>}
                      <span style={{color:"#fff",fontWeight:700,fontSize:14,flex:1}}>{g.name}</span>
                      <div style={{display:"flex",flexDirection:"column",gap:4}}>
                        <button onClick={async()=>{ await supabase.from("geos").update({is_active:g.is_active===false?true:false}).eq("id",g.id); loadAdmin(); }} style={{background:"transparent",border:"1px solid rgba(255,255,255,.08)",color:"#8B8B9A",padding:"3px 8px",borderRadius:5,cursor:"pointer",fontSize:11}}>{g.is_active===false?"Показать":"Скрыть"}</button>
                        <button onClick={async()=>{ if(!confirm(`Удалить гео "${g.name}"?`)) return; await supabase.from("geos").delete().eq("id",g.id); loadAdmin(); }} style={{background:"transparent",border:"1px solid rgba(242,112,110,.4)",color:"#F2706E",padding:"3px 8px",borderRadius:5,cursor:"pointer",fontSize:11}}>Удалить</button>
                      </div>
                    </div>
                    <div style={{fontSize:12,color:"#4A4A5A",marginBottom:4}}>Платформ: <strong style={{color:"#8B8B9A"}}>{geoPlatforms.length}</strong></div>
                    <div style={{fontSize:12,color:"#4A4A5A",marginBottom:8}}>Менеджеров: <strong style={{color:"#8B8B9A"}}>{geoManagers2.length}</strong></div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {geoManagers2.map(m=><span key={m.id} style={{background:"rgba(155,79,224,.1)",color:"#c8a8ff",fontSize:10,padding:"1px 6px",borderRadius:4}}>{m.name}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab==="report"&&(
          <ReportView players={players} redeposits={redeposits} platforms={platforms} managers={managers} geos={geos} userGeos={userGeos} dark={true}/>
        )}
        {tab==="history"&&(
          <HistoryView logs={activityLog} managers={managers} geos={geos} userGeos={userGeos} dark={true} onLeadClick={(pid)=>{ const pl=players.find(x=>x.id===pid); if(pl){ setTab("leads"); goToLead(pl); } }}/>
        )}

        {tab==="tasks"&&(()=>{
          const today=new Date().toISOString().slice(0,10);
          const odd={};
          (plannedRds||[]).forEach(r=>{ if(r&&r.date&&r.date<today&&(!odd[r.player_id]||r.date<odd[r.player_id])) odd[r.player_id]=r.date; });
          const platGeo=(pid)=>platforms.find(pl=>pl.id===pid)?.geo_id;
          const pGeo=(p)=>platGeo(p.platform_id)||userGeos.find(u=>u.manager_id===p.manager_id)?.geo_id;
          const pass=(p)=>{ if(taskGeo&&pGeo(p)!==taskGeo) return false; if(taskPlat&&p.platform_id!==taskPlat) return false; if(taskMgr&&p.manager_id!==taskMgr) return false; return true; };
          const taskDate=taskDateFilter||today;
          const tasks=(plannedRds||[]).filter(r=>r&&r.date===taskDate).map(r=>{ const player=players.find(p=>p.id===r.player_id); return player?{ player, plat:platforms.find(pl=>pl.id===player.platform_id), mgr:managers.find(m=>m.id===player.manager_id), rdNum:r.rd_number, amount:r.amount }:null; }).filter(Boolean).filter(t=>pass(t.player));
          const overdue=players.filter(p=>p&&odd[p.id]&&pass(p)).sort((a,b)=>new Date(odd[a.id])-new Date(odd[b.id]));
          const card={ background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:8,cursor:"pointer" };
          return(
            <div>
              <h2 style={{color:"#fff",marginBottom:16,fontSize:18}}>Задачи и просрочки</h2>
              <div style={{ display:"flex",gap:10,marginBottom:16,flexWrap:"wrap" }}>
                <Select value={taskGeo} onChange={v=>{ setTaskGeo(v); setTaskPlat(""); setTaskMgr(""); }} style={{...IS,width:"auto",minWidth:140}} options={[{value:"",label:"Все гео"},...geos.map(g=>({value:g.id,label:g.name}))]}/>
                <Select value={taskPlat} onChange={v=>setTaskPlat(v)} style={{...IS,width:"auto",minWidth:140}} options={[{value:"",label:"Все платформы"},...platforms.filter(p=>!taskGeo||p.geo_id===taskGeo).map(p=>({value:p.id,label:p.name}))]}/>
                <Select value={taskMgr} onChange={v=>setTaskMgr(v)} style={{...IS,width:"auto",minWidth:140}} options={[{value:"",label:"Все менеджеры"},...managers.filter(m=>!taskGeo||userGeos.some(ug=>ug.geo_id===taskGeo&&ug.manager_id===m.id)).map(m=>({value:m.id,label:m.name}))]}/>
                <DatePicker value={taskDateFilter} onChange={v=>setTaskDateFilter(v)} style={{...IS,width:"auto",minWidth:140}}/>
                {taskDateFilter&&<button onClick={()=>setTaskDateFilter("")} style={{background:"transparent",border:"1px solid rgba(255,255,255,.08)",color:"#8B8B9A",padding:"0 12px",borderRadius:7,cursor:"pointer",fontSize:12}}>Сегодня</button>}
              </div>
              <div style={{ display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-start" }}>
                <div style={{ flex:"1 1 360px",minWidth:300 }}>
                  <h3 style={{ color:"#c8a8ff",fontSize:14,margin:"0 0 10px" }}>Задачи на {taskDateFilter? new Date(taskDateFilter+"T00:00:00").toLocaleDateString("ru",{day:"2-digit",month:"2-digit"}) : "сегодня"}</h3>
                  {tasks.length===0&&<div style={{ color:"#8B8B9A",fontSize:13,padding:"16px 0" }}>Задач на этот день нет</div>}
                  {tasks.map(({player,plat,mgr,rdNum,amount},idx)=>(
                    <div key={`t-${player.id}-${rdNum}-${idx}`} onClick={()=>goToLead(player)} className="row-hover" style={card}>
                      <div style={{ width:8,height:8,borderRadius:"50%",background:"#9B5FD0",flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8 }}><span style={{ fontWeight:700,color:"#fff",fontSize:14 }}>{player.name}</span>{mgr&&<span style={{ fontSize:11,color:"#c8a8ff",background:"rgba(155,79,224,.1)",padding:"1px 6px",borderRadius:4 }}>{mgr.name}</span>}</div>
                        <div style={{ fontSize:12,color:"#8B8B9A" }}>{plat?.name||"—"} · РД{rdNum}</div>
                      </div>
                      {amount!=null&&<div style={{ fontSize:14,fontWeight:700,color:"#c8a8ff" }}>{amount}€</div>}
                    </div>
                  ))}
                </div>
                <div style={{ flex:"1 1 360px",minWidth:300 }}>
                  <h3 style={{ color:"#F2706E",fontSize:14,margin:"0 0 10px" }}>Просроченные</h3>
                  {overdue.length===0&&<div style={{ color:"#8B8B9A",fontSize:13,padding:"16px 0" }}>Нет просроченных РД</div>}
                  {overdue.map(player=>{
                    const plat=platforms.find(p=>p.id===player.platform_id);
                    const mgr=managers.find(m=>m.id===player.manager_id);
                    const od=odd[player.id];
                    const days=Math.floor((new Date(today)-new Date(od))/(1000*60*60*24));
                    const planned=plannedRds.filter(r=>r&&r.player_id===player.id&&r.date<today).sort((a,b)=>a.rd_number-b.rd_number)[0];
                    return(
                      <div key={`o-${player.id}`} onClick={()=>goToLead(player)} className="row-hover" style={{ ...card,background:"rgba(242,112,110,.07)",border:"1px solid rgba(242,112,110,.4)" }}>
                        <div style={{ width:8,height:8,borderRadius:"50%",background:"#F2706E",flexShrink:0 }}/>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}><span style={{ fontWeight:700,color:"#fff",fontSize:14 }}>{player.name}</span>{mgr&&<span style={{ fontSize:11,color:"#c8a8ff",background:"rgba(155,79,224,.1)",padding:"1px 6px",borderRadius:4 }}>{mgr.name}</span>}</div>
                          <div style={{ fontSize:12,color:"#8B8B9A" }}>{plat?.name||"—"}{planned?` · РД${planned.rd_number}`:""} · {od?(([y,m,d])=>`${d}.${m}`)(od.split("-")):""}</div>
                        </div>
                        <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2 }}>
                          {planned&&<span style={{ fontSize:13,fontWeight:700,color:"#F2706E" }}>{planned.amount}€</span>}
                          <span style={{ background:"rgba(242,112,110,.13)",color:"#F2706E",padding:"1px 7px",borderRadius:6,fontWeight:700,fontSize:11 }}>{days} дн.</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
        {tab==="leads"&&(
          <div>
            <h2 style={{color:"#fff",marginBottom:20,fontSize:18}}>Лиды менеджеров</h2>
            <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
              <Select value={adminViewGeo||""} onChange={v=>{ setAdminViewGeo(v||null); setAdminViewManager(null); }} style={{...IS,width:"auto",minWidth:160}} options={[{value:"",label:"Все гео"},...geos.map(g=>({value:g.id,label:g.name}))]}/>
              {adminViewGeo&&(
                <Select value={adminViewManager||""} onChange={v=>setAdminViewManager(v||null)} style={{...IS,width:"auto",minWidth:160}} options={[{value:"",label:"Все менеджеры"},...managers.filter(m=>!adminViewGeo||userGeos.some(ug=>ug.geo_id===adminViewGeo&&ug.manager_id===m.id)).map(m=>({value:m.id,label:m.name}))]}/>
              )}
            </div>
            {adminViewGeo&&(()=>{
              const geoManagers=adminViewManager
                ?managers.filter(m=>m.id===adminViewManager)
                :managers.filter(m=>userGeos.some(ug=>ug.geo_id===adminViewGeo&&ug.manager_id===m.id));
              const geoPlatforms=platforms.filter(p=>p.geo_id===adminViewGeo);
              const geoPlatformIds=new Set(geoPlatforms.map(p=>p.id));
              const isPoland=geos.find(g=>g.id===adminViewGeo)?.code==='PL';
              return geoManagers.map(mgr=>(
                <div key={mgr.id} style={{marginBottom:32}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:THEME.grad}}/>
                    <span style={{color:"#fff",fontWeight:700,fontSize:15}}>{mgr.name}</span>
                    {mgr.role==="team_lead"&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:4,fontWeight:700}}>ТЛ</span>}
                  </div>
                  <PlayersTable
                    players={players.filter(p=>p&&p.id&&p.manager_id===mgr.id&&(geoPlatformIds.has(p.platform_id)||!p.platform_id))}
                    redeposits={redeposits} plannedRds={plannedRds} platforms={platforms}
                    manager={mgr} dark={true} readonly={false}
                    onReload={load} showToast={showToast} isPoland={isPoland} highlightId={highlightId}
                  />
                </div>
              ));
            })()}
          </div>
        )}

        {tab==="backup"&&(
          <div style={{ maxWidth:760 }}>
            <h2 style={{color:"#fff",marginBottom:6,fontSize:18}}>Бэкап и восстановление</h2>
            <p style={{ color:"#4A4A5A",fontSize:12,marginBottom:20 }}>Резервные копии всех таблиц отправляются на вебхук. Хранится одна (самая свежая) точка восстановления.</p>

            <div style={{ background:"#101010",border:"1px solid rgba(255,255,255,.08)",borderRadius:12,padding:20,marginBottom:16 }}>
              <h3 style={{ color:"#F0F0F2",fontSize:14,margin:"0 0 6px" }}>Резервная копия</h3>
              <p style={{ color:"#4A4A5A",fontSize:12,margin:"0 0 14px" }}>Читает все таблицы и отправляет JSON на вебхук. Авто-бэкап каждый день в 08:00 настраивается на стороне n8n (расписание).</p>
              <button onClick={doBackup} disabled={backupBusy} style={{ background:backupBusy?"rgba(255,255,255,.1)":"var(--grad)",border:"none",color:"#fff",padding:"10px 18px",borderRadius:9,cursor:backupBusy?"default":"pointer",fontSize:13,fontWeight:700 }}>{backupBusy?"Отправляю…":"Сделать бэкап сейчас"}</button>
              {lastBackupAt&&<span style={{ color:"#3DD68C",fontSize:12,marginLeft:12 }}>Последний: {lastBackupAt}</span>}
            </div>

            <div style={{ background:"#101010",border:"1px solid rgba(242,112,110,.4)",borderRadius:12,padding:20 }}>
              <h3 style={{ color:"#F2706E",fontSize:14,margin:"0 0 6px" }}>↘ Восстановление</h3>
              <p style={{ color:"#4A4A5A",fontSize:12,margin:"0 0 14px" }}>Загружает последнюю точку, показывает все таблицы для просмотра, даёт выбрать какие восстановить. Данные дополняются (merge по id). Перед применением сохраняется локальная точка отката — пока не подтвердишь, можно откатить назад.</p>
              <button onClick={openRestorePreview} disabled={restoreBusy} style={{ background:"transparent",border:"1px solid #F2706E",color:"#F2706E",padding:"10px 18px",borderRadius:9,cursor:restoreBusy?"default":"pointer",fontSize:13,fontWeight:700 }}>{restoreBusy?"Загружаю…":"Загрузить точку восстановления"}</button>
            </div>
          </div>
        )}

        {tab==="activity"&&(()=>{
          const now=Date.now();
          const isToday=dayDate===P.todayStr();
          const optionUsers=crmPresence.length?crmPresence.map(u=>({crm_user_id:u.id,crm_user_name:u.full_name+(u.username?" ("+u.username+")":"")})):(crmUsers.length?crmUsers:[]);
          const byPres={}; crmPresence.forEach(u=>{ byPres[String(u.id)]=u; });
          const loginInfo=(m)=>{ const u=m.crm_user_id?byPres[String(m.crm_user_id)]:null; const ts=u&&u.last_logged_at; if(!ts) return {txt:"—",c:"#4A4A5A"}; const d=new Date(ts); const days=Math.floor((now-d.getTime())/86400000); const isTd=d.toDateString()===new Date().toDateString(); const txt=isTd?"сегодня "+d.toLocaleTimeString("ru",{hour:"2-digit",minute:"2-digit"}):d.toLocaleDateString("ru",{day:"2-digit",month:"2-digit"})+(days>0?" ("+days+" дн)":""); return { txt, c:isTd?"#3DD68C":days>=3?"#F2706E":"rgba(255,255,255,.1)", blocked:u.status&&u.status!=="active"?u.status:null }; };
          const liveNow=(m)=>{ if(!isToday) return false; const u=m.crm_user_id?crmMsgs[String(m.crm_user_id)]:null; const ts=u&&u.last_outgoing_at; return ts&&((now-new Date(ts).getTime())/60000<=15); };
          const dayFor=(m)=>{ const ev=[...((m.crm_user_id&&dayData[String(m.crm_user_id)])||[]), ...((dayTracker[m.id])||[])]; return P.computeSessions(ev,20); };
          const assigned=new Set(managers.map(m=>m.crm_user_id).filter(Boolean).map(String));
          const unmatched=optionUsers.filter(a=>!assigned.has(String(a.crm_user_id)));
          const teamMgrs=managers.filter(m=>m.role!=="admin");
          const th={ padding:"8px 10px",textAlign:"left",color:"#8B8B9A",fontSize:11,textTransform:"uppercase",letterSpacing:".05em",borderBottom:"1px solid rgba(255,255,255,.08)",whiteSpace:"nowrap" };
          const td={ padding:"10px 10px",borderBottom:"1px solid #161616",fontSize:13,color:"#F0F0F2" };
          return (
          <div style={{ maxWidth:1080 }}>
            <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:6,flexWrap:"wrap" }}>
              <h2 style={{color:"#fff",margin:0,fontSize:18}}>Активность менеджеров</h2>
              <DatePicker value={dayDate} onChange={v=>{setDayDate(v);setExpandedId&&setExpandedId(null);loadDay(v);}} style={{ background:"#080808",border:"1px solid rgba(255,255,255,.08)",color:"#F0F0F2",padding:"6px 10px",borderRadius:8,fontSize:12 }}/>
              {!isToday&&<button onClick={()=>{ const t=P.todayStr(); setDayDate(t); loadDay(t); }} style={{ background:"transparent",border:"1px solid rgba(255,255,255,.08)",color:"#8B8B9A",padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:12 }}>Сегодня</button>}
              <button onClick={()=>{ loadCrmPresence(); loadCrmMsgs(); loadDay(); }} disabled={dayBusy} style={{ background:dayBusy?"rgba(255,255,255,.1)":"var(--grad)",border:"none",color:"#fff",padding:"7px 14px",borderRadius:8,cursor:dayBusy?"default":"pointer",fontSize:12,fontWeight:700 }}>{dayBusy?"Считаю…":"Обновить"}</button>
              {dayInfo&&!dayInfo.err&&<span style={{ color:"#4A4A5A",fontSize:12 }}>диалогов: {dayInfo.conversations} · сообщений: {dayInfo.messages}</span>}
            </div>
            <p style={{ color:"#4A4A5A",fontSize:12,marginBottom:18 }}>«Отработал» — суммарное активное время (по исходящим сообщениям в CRM + действиям в трекере), окно — от первой до последней активности, разрыв ≥20 мин считается отсутствием. Нажми на ячейку «Отсутствие», чтобы увидеть интервалы.</p>

            {dayInfo&&dayInfo.err&&<div style={{ background:"#101010",border:"1px solid rgba(242,112,110,.4)",borderRadius:10,padding:"12px 16px",color:"#F2706E",fontSize:13,marginBottom:16 }}>{dayInfo.err}. Проверь KEYCRM_SESSION_TOKEN в Vercel.</div>}
            {crmPresenceErr&&<div style={{ background:"#101010",border:"1px solid rgba(242,112,110,.4)",borderRadius:10,padding:"12px 16px",color:"#F2706E",fontSize:13,marginBottom:16 }}>{crmPresenceErr}. Проверь переменную KEYCRM_SESSION_TOKEN в Vercel.</div>}

            <div style={{ background:"#101010",border:"1px solid rgba(255,255,255,.08)",borderRadius:12,overflow:"hidden",marginBottom:24 }}>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead><tr>{["Менеджер","CRM-пользователь","Отработал","Первая","Последняя","Отсутствие","Вход в CRM"].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {teamMgrs.map(m=>{
                    const li=loginInfo(m); const s=dayFor(m); const live=liveNow(m); const open=expandedId===m.id;
                    return (
                      <Fragment key={m.id}>
                      <tr className="row-hover">
                        <td style={{...td,fontWeight:600}}>{m.name} {live&&<span style={{ color:"#3DD68C",fontSize:11,fontWeight:700,marginLeft:4 }}>● сейчас</span>} <span style={{ color:"#4A4A5A",fontSize:11,fontWeight:400 }}>{m.role==="team_lead"?"тимлид":""}</span></td>
                        <td style={td}>
                          <Select value={m.crm_user_id||""} onChange={v=>mapCrmUser(m.id,v)} style={{ background:"#080808",border:"1px solid rgba(255,255,255,.08)",color:"#F0F0F2",padding:"5px 8px",borderRadius:6,fontSize:12,outline:"none",maxWidth:230 }} options={[{value:"",label:"— не выбран"},...(crmUsers||[]).map(u=>({value:String(u.id),label:u.name||u.email||String(u.id)}))]}/>
                        </td>
                        <td style={{...td,color:s.activeMin>0?"#3DD68C":"#4A4A5A",fontWeight:700}}>{s.count>0?P.fmtDur(s.activeMin):"—"}</td>
                        <td style={{...td,color:"rgba(255,255,255,.1)"}}>{P.fmtTime(s.first)}</td>
                        <td style={{...td,color:"rgba(255,255,255,.1)"}}>{P.fmtTime(s.last)}</td>
                        <td style={{...td,cursor:s.gaps.length?"pointer":"default",color:s.gaps.length?"#F4B740":"#4A4A5A"}} onClick={()=>s.gaps.length&&setExpandedId(open?null:m.id)}>{s.gaps.length?`${s.gaps.length} · ${P.fmtDur(s.idleMin)} ${open?"▲":"▼"}`:"—"}</td>
                        <td style={{...td,color:li.c,fontSize:12}}>{li.txt}{li.blocked&&<span style={{ color:"#F2706E",fontSize:10,marginLeft:6 }}>{li.blocked}</span>}</td>
                      </tr>
                      {open&&s.gaps.length>0&&(
                        <tr><td colSpan={7} style={{ background:"#15171f",borderBottom:"1px solid #161616",padding:"10px 16px" }}>
                          <div style={{ color:"#8B8B9A",fontSize:12,marginBottom:6 }}>Интервалы отсутствия ({m.name}):</div>
                          <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                            {s.gaps.map((g,i)=><span key={i} style={{ background:"rgba(251,191,36,.08)",border:"1px solid rgba(244,183,64,.4)",color:"#F4B740",padding:"4px 10px",borderRadius:6,fontSize:12 }}>{P.fmtInterval(g)} · {P.fmtDur(g.min)}</span>)}
                          </div>
                        </td></tr>
                      )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {unmatched.length>0&&(
              <div style={{ background:"#101010",border:"1px solid rgba(244,183,64,.4)",borderRadius:12,padding:"14px 16px" }}>
                <div style={{ color:"#F4B740",fontSize:13,fontWeight:700,marginBottom:8 }}>CRM-пользователи без привязки ({unmatched.length})</div>
                <p style={{ color:"#4A4A5A",fontSize:12,margin:"0 0 10px" }}>Есть в CRM, но не сопоставлены с менеджером трекера. Выбери их в выпадающих списках выше.</p>
                <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                  {unmatched.map(a=><span key={a.crm_user_id} style={{ background:"rgba(251,191,36,.1)",border:"1px solid rgba(244,183,64,.4)",color:"#F4B740",padding:"4px 10px",borderRadius:6,fontSize:12 }}>{a.crm_user_name||a.crm_user_id}</span>)}
                </div>
              </div>
            )}
          </div>
          );
        })()}

        {restorePreview&&(()=>{
          const tbls = Backup.BACKUP_TABLES.filter(t=>Array.isArray(restorePreview.tables[t]));
          const rows = restorePreview.tables[previewTable]||[];
          const cols = rows.length>0 ? Object.keys(rows[0]) : [];
          const toggle = (t)=>setRestoreSel(s=>s.includes(t)?s.filter(x=>x!==t):[...s,t]);
          return (
          <div style={{ position:"fixed",inset:0,background:"transparent",zIndex:9000,display:"flex",flexDirection:"column",padding:24 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
              <div>
                <h3 style={{ color:"#fff",margin:0,fontSize:16 }}>Просмотр точки восстановления</h3>
                <span style={{ color:"#4A4A5A",fontSize:12 }}>создана: {restorePreview?.created_at? new Date(restorePreview.created_at).toLocaleString("ru"):"—"}</span>
              </div>
              <button onClick={()=>setRestorePreview(null)} style={{ background:"#101010",border:"1px solid rgba(255,255,255,.08)",color:"#F0F0F2",padding:"8px 16px",borderRadius:8,cursor:"pointer",fontSize:13 }}>Закрыть</button>
            </div>
            <div style={{ flex:1,display:"flex",gap:14,minHeight:0 }}>
              <div style={{ width:230,background:"#101010",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,padding:10,overflowY:"auto" }}>
                <div style={{ color:"#4A4A5A",fontSize:10,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8 }}>Таблицы для восстановления</div>
                {tbls.map(t=>(
                  <div key={t} onClick={()=>{ setPreviewTable(t); setPreviewMgr(null); }} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 8px",borderRadius:7,cursor:"pointer",background:previewTable===t?"rgba(155,79,224,.15)":"transparent",marginBottom:2 }}>
                    <input type="checkbox" checked={restoreSel.includes(t)} onChange={()=>toggle(t)} onClick={e=>e.stopPropagation()} style={{ accentColor:"#9B5FD0" }}/>
                    <span style={{ color:"#F0F0F2",fontSize:12,flex:1 }}>{Backup.TABLE_LABELS[t]||t}</span>
                    <span style={{ color:"#4A4A5A",fontSize:11 }}>{(restorePreview.tables[t]||[]).length}</span>
                  </div>
                ))}
                <div style={{ display:"flex",gap:6,marginTop:8 }}>
                  <button onClick={()=>setRestoreSel(tbls)} style={{ flex:1,background:"transparent",border:"1px solid rgba(255,255,255,.08)",color:"#8B8B9A",padding:"4px 6px",borderRadius:6,cursor:"pointer",fontSize:11 }}>Все</button>
                  <button onClick={()=>setRestoreSel([])} style={{ flex:1,background:"transparent",border:"1px solid rgba(255,255,255,.08)",color:"#8B8B9A",padding:"4px 6px",borderRadius:6,cursor:"pointer",fontSize:11 }}>Снять</button>
                </div>
              </div>
              <div style={{ flex:1,background:"#101010",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,overflow:"auto",minWidth:0 }}>
                {(()=>{
                  const T = restorePreview.tables;
                  const renderTable = (data,onRowClick)=>{
                    if(!data||data.length===0) return <div style={{ padding:20,color:"#4A4A5A",fontSize:13 }}>Нет данных</div>;
                    const cs = Object.keys(data[0]);
                    return (
                      <table style={{ borderCollapse:"collapse",fontSize:11,width:"100%" }}>
                        <thead><tr>{cs.map(c=><th key={c} style={{ position:"sticky",top:0,background:"#0C0C0C",color:"#8B8B9A",padding:"7px 10px",textAlign:"left",borderBottom:"1px solid rgba(255,255,255,.08)",whiteSpace:"nowrap" }}>{c}</th>)}</tr></thead>
                        <tbody>
                          {data.slice(0,200).map((r,i)=>(
                            <tr key={i} onClick={onRowClick?()=>onRowClick(r):undefined} style={onRowClick?{ cursor:"pointer" }:undefined} className={onRowClick?"row-hover":undefined}>
                              {cs.map(c=><td key={c} style={{ color:"rgba(255,255,255,.1)",padding:"6px 10px",borderBottom:"1px solid #161616",whiteSpace:"nowrap",maxWidth:240,overflow:"hidden",textOverflow:"ellipsis" }}>{r[c]==null?"—":typeof r[c]==="object"?JSON.stringify(r[c]):String(r[c])}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  };
                  if(previewMgr){
                    const mid=previewMgr.id;
                    const full=buildMgrPlan(previewMgr, T);
                    return (
                      <div>
                        <div style={{ position:"sticky",top:0,background:"#0C0C0C",borderBottom:"1px solid rgba(255,255,255,.08)",padding:"10px 14px",display:"flex",alignItems:"center",gap:12,zIndex:2 }}>
                          <button onClick={()=>setPreviewMgr(null)} style={{ background:"transparent",border:"1px solid rgba(255,255,255,.08)",color:"#8B8B9A",padding:"5px 10px",borderRadius:6,cursor:"pointer",fontSize:12 }}>← Назад</button>
                          <span style={{ color:"#fff",fontWeight:700,fontSize:14 }}>{previewMgr.name}</span>
                          <span style={{ color:"#4A4A5A",fontSize:11 }}>{previewMgr.role}</span>
                          <span style={{ color:"#4A4A5A",fontSize:11,marginLeft:"auto" }}>Отметь разделы для восстановления ↓</span>
                        </div>
                        {MGR_SECTIONS.map(([key,title])=>{
                          const data=full[key]||[];
                          return (
                            <div key={key} style={{ padding:"12px 14px",borderBottom:"1px solid #161616" }}>
                              <label style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8,cursor:"pointer" }}>
                                <input type="checkbox" checked={mgrSel.includes(key)} onChange={()=>setMgrSel(s=>s.includes(key)?s.filter(x=>x!==key):[...s,key])} style={{ accentColor:"#9B5FD0" }}/>
                                <span style={{ color:"#c8a8ff",fontSize:12,fontWeight:700 }}>{title} <span style={{ color:"#4A4A5A",fontWeight:400 }}>({data.length})</span></span>
                              </label>
                              <div style={{ overflowX:"auto" }}>{renderTable(data)}</div>
                            </div>
                          );
                        })}
                        <div style={{ position:"sticky",bottom:0,background:"#0C0C0C",borderTop:"1px solid rgba(242,112,110,.4)",padding:"12px 14px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",zIndex:2 }}>
                          <span style={{ color:"#F2706E",fontSize:12,fontWeight:600 }}>Восстановить выбранные разделы для {previewMgr.name} (merge, откат возможен)</span>
                          <input value={mgrConfirm} onChange={e=>setMgrConfirm(e.target.value)} placeholder="Впишите: ВОССТАНОВИТЬ" style={{ background:"#080808",border:"1px solid rgba(255,255,255,.08)",color:"#F0F0F2",padding:"8px 12px",borderRadius:8,fontSize:13,outline:"none",marginLeft:"auto",width:190 }}/>
                          <button onClick={runMgrRestore} disabled={restoreBusy} style={{ background:restoreBusy?"rgba(255,255,255,.1)":"rgba(242,112,110,.95)",border:"none",color:"#fff",padding:"9px 16px",borderRadius:9,cursor:restoreBusy?"default":"pointer",fontSize:13,fontWeight:700 }}>{restoreBusy?"…":"Восстановить"}</button>
                        </div>
                      </div>
                    );
                  }
                  return rows.length===0
                    ? <div style={{ padding:20,color:"#4A4A5A",fontSize:13 }}>Таблица пустая</div>
                    : <>
                        {previewTable==="managers"&&<div style={{ padding:"8px 14px",color:"#4A4A5A",fontSize:11,borderBottom:"1px solid #161616" }}>Кликни на менеджера, чтобы открыть его данные и восстановить выборочно</div>}
                        {renderTable(rows, previewTable==="managers"?(m)=>{ setPreviewMgr(m); setMgrSel(MGR_SECTIONS.map(s=>s[0])); setMgrConfirm(""); }:undefined)}
                        {rows.length>200&&<div style={{ padding:10,color:"#4A4A5A",fontSize:11 }}>…показаны первые 200 из {rows.length}</div>}
                      </>;
                })()}
              </div>
            </div>
            <div style={{ marginTop:14,background:"#101010",border:"1px solid rgba(242,112,110,.4)",borderRadius:10,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" }}>
              <span style={{ color:"#F2706E",fontSize:12,fontWeight:600 }}>Выбрано таблиц: {restoreSel.length}. Данные дополнятся (merge). Откат возможен до подтверждения.</span>
              <input value={restoreConfirm} onChange={e=>setRestoreConfirm(e.target.value)} placeholder="Впишите: ВОССТАНОВИТЬ" style={{ background:"#080808",border:"1px solid rgba(255,255,255,.08)",color:"#F0F0F2",padding:"8px 12px",borderRadius:8,fontSize:13,outline:"none",marginLeft:"auto",width:200 }}/>
              <button onClick={runRestore} disabled={restoreBusy} style={{ background:restoreBusy?"rgba(255,255,255,.1)":"rgba(242,112,110,.95)",border:"none",color:"#fff",padding:"9px 18px",borderRadius:9,cursor:restoreBusy?"default":"pointer",fontSize:13,fontWeight:700 }}>{restoreBusy?"Восстанавливаю…":"Восстановить выбранное"}</button>
            </div>
          </div>
          );
        })()}

        {pendingRestore&&(
          <div style={{ position:"fixed",left:0,right:0,bottom:0,zIndex:8000,background:"#101010",borderTop:"2px solid #F4924A",padding:"14px 24px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",boxShadow:"0 -8px 32px rgba(0,0,0,.5)" }}>
            <span style={{ color:"#F4B740",fontWeight:700,fontSize:13 }}>Восстановление применено{pendingRestore.at?` (${new Date(pendingRestore.at).toLocaleString("ru")})`:""}. Проверьте данные.</span>
            <span style={{ color:"#4A4A5A",fontSize:12 }}>{pendingRestore.scope?pendingRestore.scope+" · ":""}{(pendingRestore.tables||[]).map(t=>Backup.TABLE_LABELS[t]||t).join(", ")}</span>
            <div style={{ marginLeft:"auto",display:"flex",gap:10 }}>
              <button onClick={confirmRestore} disabled={restoreBusy} style={{ background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",color:"#fff",padding:"9px 18px",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:700 }}>Подтвердить</button>
              <button onClick={rollbackRestore} disabled={restoreBusy} style={{ background:"transparent",border:"1px solid #F2706E",color:"#F2706E",padding:"9px 18px",borderRadius:9,cursor:restoreBusy?"default":"pointer",fontSize:13,fontWeight:700 }}>↺ Откатить</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

