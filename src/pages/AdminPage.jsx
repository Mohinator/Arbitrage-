import { useState, useEffect, useRef, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "../supabaseClient";
import { STATUSES, LEAD_COLORS, CSS } from "../constants";
import { getStatusStyle, StatusBadge, StatusPopup, ColorPopup, Toast } from "../components/common";
import { PlayersTable } from "../components/PlayersTable";
import { AddLeadForm } from "../components/AddLeadForm";
import { HistoryView } from "../components/HistoryView";
import { ReportView } from "../components/ReportView";
import * as Backup from "../backup";

export function AdminPage({ onLogout }) {
  const [managers, setManagers] = useState([]); const [platforms, setPlatforms] = useState([]); const [players, setPlayers] = useState([]); const [redeposits, setRedeposits] = useState([]);
  const [geos, setGeos] = useState([]); const [userGeos, setUserGeos] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
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

  const S={th:{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:"1px solid #2d3148",background:"#151824"},td:{padding:"11px 12px",borderBottom:"1px solid #1a1d27"}};
  const IS={background:"#0f1117",border:"1px solid #2d3148",color:"#e2e8f0",padding:"8px 10px",borderRadius:7,fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"};

  return (
    <div style={{minHeight:"100vh",background:"#0f1117",color:"#e2e8f0",fontFamily:"'Inter',sans-serif"}}>
      <style>{CSS}</style>
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}

      {showGeoForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div className="slide-in" style={{background:"#1a1d27",border:"1px solid #2d3148",borderRadius:14,padding:24,width:"100%",maxWidth:380,boxShadow:"0 24px 64px rgba(0,0,0,.7)"}}>
            <h3 style={{color:"#fff",marginBottom:18,fontSize:15,fontWeight:700}}>Добавить гео</h3>
            <div style={{marginBottom:12}}><label style={{display:"block",fontSize:10,color:"#64748b",marginBottom:4,fontWeight:700,textTransform:"uppercase"}}>Название *</label><input value={geoForm.name} onChange={e=>setGeoForm(f=>({...f,name:e.target.value}))} placeholder="Польша" style={IS}/></div>
            <div style={{marginBottom:18}}><label style={{display:"block",fontSize:10,color:"#64748b",marginBottom:4,fontWeight:700,textTransform:"uppercase"}}>Код (2 буквы)</label><input value={geoForm.code} onChange={e=>setGeoForm(f=>({...f,code:e.target.value}))} placeholder="PL" maxLength={3} style={IS}/></div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={createGeo} className="btn-p" style={{flex:1,padding:"10px",fontSize:14}}>Добавить</button>
              <button onClick={()=>setShowGeoForm(false)} className="btn-g" style={{flex:1,border:"1px solid #2d3148",color:"#94a3b8",padding:"10px",borderRadius:8,cursor:"pointer"}}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {showPlatformForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div className="slide-in" style={{background:"#1a1d27",border:"1px solid #2d3148",borderRadius:14,padding:24,width:"100%",maxWidth:460,boxShadow:"0 24px 64px rgba(0,0,0,.7)"}}>
            <h3 style={{color:"#fff",marginBottom:18,fontSize:15,fontWeight:700}}>{editingPlatform?"Редактировать":"Добавить"} платформу</h3>
            {[["Название *","name","text"],["Цель СЧ (€) *","target_avg_check","number"],["Мин. депозит (€)","min_deposit","number"],["Мин. депозит BLIK (€)","min_deposit_blik","number"],["Капа","cap","number"],["Дата добавления","date_added","date"]].map(([l,k,t])=>(
              <div key={k} style={{marginBottom:12}}><label style={{display:"block",fontSize:10,color:"#64748b",marginBottom:4,fontWeight:700,textTransform:"uppercase"}}>{l}</label><input type={t} value={pForm[k]} onChange={e=>setPForm(f=>({...f,[k]:e.target.value}))} style={IS}/></div>
            ))}
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:10,color:"#64748b",marginBottom:4,fontWeight:700,textTransform:"uppercase"}}>Гео</label>
              <select value={pForm.geo_id} onChange={e=>setPForm(f=>({...f,geo_id:e.target.value}))} style={IS}>
                <option value="">Без гео</option>
                {geos.map(g=><option key={g.id} value={g.id}>{g.name} {g.code?`(${g.code})`:""}</option>)}
              </select>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}>
              {[["is_active","Платформа активна"],["reset_monthly","Сбрасывать СЧ каждый месяц"]].map(([k,l])=>(
                <label key={k} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                  <input type="checkbox" checked={pForm[k]} onChange={e=>setPForm(f=>({...f,[k]:e.target.checked}))} style={{width:14,height:14,accentColor:"#6366f1",cursor:"pointer"}}/>
                  <span style={{color:"#94a3b8",fontSize:13}}>{l}</span>
                </label>
              ))}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={savePlatform} className="btn-p" style={{flex:1,padding:"10px",fontSize:14}}>Сохранить</button>
              <button onClick={()=>setShowPlatformForm(false)} className="btn-g" style={{flex:1,border:"1px solid #2d3148",color:"#94a3b8",padding:"10px",borderRadius:8,cursor:"pointer"}}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      <div style={{background:"#1a1d27",borderBottom:"1px solid #2d3148",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#818cf8)",boxShadow:"0 0 8px rgba(99,102,241,.6)"}}/>
          <span style={{fontWeight:800,fontSize:15,color:"#fff",letterSpacing:"0.05em"}}>АРБИТРАЖ</span>
          <span style={{background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",fontSize:10,padding:"1px 7px",borderRadius:4,fontWeight:700}}>ADMIN</span>
        </div>
        <button onClick={onLogout} className="btn-g" style={{border:"1px solid #3d4268",color:"#94a3b8",padding:"6px 14px",borderRadius:6,cursor:"pointer",fontSize:13}}>Выйти</button>
      </div>

      <div style={{background:"#1a1d27",borderBottom:"1px solid #2d3148",padding:"0 24px",display:"flex"}}>
        {[["overview","Сводка"],["tasks",<span>Задачи{(()=>{ const t=new Date().toISOString().slice(0,10); const ids=new Set((plannedRds||[]).filter(r=>r&&r.date&&r.date<t).map(r=>r.player_id)); const c=players.filter(p=>p&&ids.has(p.id)).length; return c>0?<span style={{ color:"#ef4444",fontWeight:700,marginLeft:6 }}>{c}</span>:null; })()}</span>],["managers","Менеджеры"],["platforms","Платформы"],["geos","Гео"],["report","Отчёт"],["history","История"],["leads","Лиды"],["backup","Бэкап"]].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} className="nb" style={{background:"transparent",border:"none",color:tab===key?"#6366f1":"#64748b",padding:"12px 18px",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:tab===key?"2px solid #6366f1":"2px solid transparent"}}>{label}</button>
        ))}
      </div>

      <div style={{padding:"24px",maxWidth:1400,margin:"0 auto"}}>

        {tab==="overview"&&(
          <div>
            <h2 style={{color:"#fff",marginBottom:20,fontSize:18}}>Общий СЧ по платформам</h2>
            <div style={{border:"1px solid #2d3148",borderRadius:10,overflow:"hidden",marginBottom:32}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Платформа","Гео","Лидов","Сумма","СЧ факт","СЧ цель","Капа","Выполнено","BLIK","Период"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {platformStats.map(p=>{
                    const ok=p.avgCheck>=p.target_avg_check,pct=p.cap?Math.min(100,Math.round((p.totalCount/p.cap)*100)):0;
                    const geo=geos.find(g=>g.id===p.geo_id);
                    return(
                      <tr key={p.id} className="row-hover">
                        <td style={{...S.td,fontWeight:600,color:"#e2e8f0"}}>{p.name}</td>
                        <td style={S.td}>{geo?<span style={{background:"rgba(99,102,241,.15)",color:"#a5b4fc",padding:"2px 7px",borderRadius:5,fontSize:11,fontWeight:600}}>{geo.name}</span>:"—"}</td>
                        <td style={{...S.td,color:"#94a3b8"}}>{p.totalCount}</td>
                        <td style={{...S.td,color:"#94a3b8"}}>{p.totalAmount.toFixed(0)}€</td>
                        <td style={S.td}><span style={{background:p.totalCount===0?"#1e2235":ok?"linear-gradient(135deg,#14532d,#166534)":"linear-gradient(135deg,#7f1d1d,#991b1b)",color:p.totalCount===0?"#64748b":ok?"#86efac":"#fca5a5",padding:"3px 9px",borderRadius:6,fontWeight:700,fontSize:12}}>{p.totalCount===0?"—":p.avgCheck.toFixed(1)+"€"}</span></td>
                        <td style={{...S.td,color:"#94a3b8"}}>{p.target_avg_check}€</td>
                        <td style={{...S.td,color:"#94a3b8"}}>{p.cap??"—"}</td>
                        <td style={S.td}>{p.cap?<div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:40,background:"#0f1117",borderRadius:4,height:5,overflow:"hidden"}}><div className="progress-bar" style={{width:`${pct}%`,height:"100%",background:pct>=100?"linear-gradient(90deg,#ef4444,#f87171)":"linear-gradient(90deg,#6366f1,#818cf8)"}}/></div><span style={{color:pct>=100?"#fca5a5":pct>=80?"#f59e0b":"#94a3b8",fontSize:12}}>{p.totalCount}/{p.cap}</span></div>:"—"}</td>
                        <td style={S.td}>{p.totalCount>0?<div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:44,background:"#0f1117",borderRadius:3,height:4,overflow:"hidden",display:"flex"}}><div className="progress-bar" style={{width:`${100-p.blikPct}%`,height:"100%",background:"linear-gradient(90deg,#6366f1,#818cf8)"}}/><div className="progress-bar" style={{width:`${p.blikPct}%`,height:"100%",background:"linear-gradient(90deg,#d97706,#f59e0b)"}}/></div><span style={{color:"#d97706",fontSize:11}}>{p.blikPct}%({p.blikCount})</span></div>:<span style={{color:"#475569"}}>—</span>}</td>
                        <td style={S.td}><span style={{background:p.reset_monthly?"linear-gradient(135deg,#1e3a5f,#1e40af)":"#1e2235",color:p.reset_monthly?"#93c5fd":"#64748b",padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600}}>{p.reset_monthly?"Помесячно":"Накопит."}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <h2 style={{color:"#fff",marginBottom:20,fontSize:18}}>По менеджерам</h2>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {managerStats.map(m=>(
                <div key={m.id} style={{border:"1px solid #2d3148",borderRadius:10,overflow:"hidden"}}>
                  <div style={{padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:m.byPlatform.length>0?"1px solid #2d3148":"none",background:"#1a1d27"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontWeight:700,color:"#fff",fontSize:14}}>{m.name}</span>
                      <span style={{background:m.role==="team_lead"?"linear-gradient(135deg,#0f766e,#14b8a6)":"rgba(99,102,241,.15)",color:m.role==="team_lead"?"#fff":"#a5b4fc",fontSize:10,padding:"1px 7px",borderRadius:4,fontWeight:700}}>{m.role==="team_lead"?"Тим лид":"Менеджер"}</span>
                      {m.geos.map(g=><span key={g.id} style={{background:"rgba(99,102,241,.1)",color:"#a5b4fc",fontSize:10,padding:"1px 6px",borderRadius:4}}>{g.name}</span>)}
                    </div>
                    <div style={{display:"flex",gap:20}}><span style={{color:"#64748b",fontSize:12}}>Лидов: <strong style={{color:"#94a3b8"}}>{m.totalCount}</strong></span><span style={{color:"#64748b",fontSize:12}}>Сумма: <strong style={{color:"#94a3b8"}}>{m.totalAmount.toFixed(0)}€</strong></span></div>
                  </div>
                  {m.byPlatform.length>0&&(
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead><tr>{["Платформа","Лидов","Сумма","BLIK","СЧ цель","СЧ факт"].map(h=><th key={h} style={{...S.th,padding:"7px 18px"}}>{h}</th>)}</tr></thead>
                      <tbody>
                        {m.byPlatform.map(p=>{
                          const ok=p.avg>=p.target_avg_check;
                          return(
                            <tr key={p.id} className="row-hover">
                              <td style={{padding:"9px 18px",color:"#cbd5e1",fontSize:12,borderBottom:"1px solid #1e2235"}}>{p.name}</td>
                              <td style={{padding:"9px 18px",color:"#94a3b8",fontSize:12,borderBottom:"1px solid #1e2235"}}>{p.cnt}</td>
                              <td style={{padding:"9px 18px",color:"#94a3b8",fontSize:12,borderBottom:"1px solid #1e2235"}}>{p.amt.toFixed(0)}€</td>
                              <td style={{padding:"9px 18px",borderBottom:"1px solid #1e2235"}}>{p.cnt>0?<div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:36,background:"#0f1117",borderRadius:3,height:4,overflow:"hidden",display:"flex"}}><div style={{width:`${100-p.blikPct}%`,height:"100%",background:"linear-gradient(90deg,#6366f1,#818cf8)"}}/><div style={{width:`${p.blikPct}%`,height:"100%",background:"linear-gradient(90deg,#d97706,#f59e0b)"}}/></div><span style={{color:"#d97706",fontSize:11}}>{p.blik}({p.blikPct}%)</span></div>:"—"}</td>
                              <td style={{padding:"9px 18px",color:"#94a3b8",fontSize:12,borderBottom:"1px solid #1e2235"}}>{p.target_avg_check}€</td>
                              <td style={{padding:"9px 18px",borderBottom:"1px solid #1e2235"}}><span style={{background:ok?"linear-gradient(135deg,#14532d,#166534)":"linear-gradient(135deg,#7f1d1d,#991b1b)",color:ok?"#86efac":"#fca5a5",padding:"2px 8px",borderRadius:6,fontWeight:700,fontSize:11}}>{p.avg.toFixed(1)}€</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  {m.byPlatform.length===0&&<div style={{padding:"12px 18px",color:"#475569",fontSize:12}}>Нет данных</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="managers"&&(
          <div>
            <h2 style={{color:"#fff",marginBottom:20,fontSize:18}}>Менеджеры</h2>
            <div style={{background:"#1a1d27",border:"1px solid #2d3148",borderRadius:10,padding:20,marginBottom:24}}>
              <div style={{display:"flex",gap:10,marginBottom:0}}>
                <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createManager()} placeholder="Имя менеджера" style={{flex:1,background:"#0f1117",border:"1px solid #2d3148",color:"#e2e8f0",padding:"9px 12px",borderRadius:8,fontSize:13,outline:"none"}}/>
                <select value={newRole} onChange={e=>setNewRole(e.target.value)} style={{background:"#0f1117",border:"1px solid #2d3148",color:"#e2e8f0",padding:"9px 12px",borderRadius:8,fontSize:13,outline:"none"}}>
                  <option value="manager">Менеджер</option>
                  <option value="team_lead">Тим лид</option>
                </select>
                <button onClick={createManager} className="btn-p" style={{padding:"9px 20px",fontSize:13,borderRadius:8}}>+ Создать</button>
              </div>
            </div>
            <div style={{border:"1px solid #2d3148",borderRadius:10,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Имя","Токен","Роль","Keitaro","Гео","Статус","Лидов","Действия"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {managers.map(m=>{
                    const mGeos=userGeos.filter(ug=>ug.manager_id===m.id).map(ug=>geos.find(g=>g.id===ug.geo_id)).filter(Boolean);
                    const isAssigning=assigningManager===m.id;
                    return(
                      <>
                        <tr key={m.id} className="row-hover">
                          <td style={{...S.td,fontWeight:600,color:"#e2e8f0"}}>{m.name}</td>
                          <td style={S.td}><code style={{background:"#0f1117",border:"1px solid #2d3148",padding:"3px 8px",borderRadius:5,fontSize:12,color:"#a5b4fc",letterSpacing:"0.1em"}}>{m.token}</code></td>
                          <td style={S.td}><span onClick={()=>toggleManagerRole(m)} style={{background:m.role==="team_lead"?"linear-gradient(135deg,#0f766e,#14b8a6)":"rgba(99,102,241,.15)",color:m.role==="team_lead"?"#fff":"#a5b4fc",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",userSelect:"none"}} title="Нажми для смены роли">{m.role==="team_lead"?"Тим лид":"Менеджер"}</span></td>
                          <td style={S.td}><input defaultValue={m.keitaro_names||""} onBlur={async e=>{ const v=e.target.value.trim(); if(v!==(m.keitaro_names||"")){ await supabase.from("managers").update({keitaro_names:v}).eq("id",m.id); showToast("Имена Keitaro сохранены"); load(); } }} placeholder="Viktor, Vik" title="Имена менеджера в кампаниях Keitaro, через запятую" style={{background:"#0f1117",border:"1px solid #2d3148",color:"#e2e8f0",padding:"4px 8px",borderRadius:6,fontSize:12,outline:"none",width:130}}/></td>
                          <td style={S.td}>
                            <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                              {mGeos.map(g=><span key={g.id} style={{background:"rgba(99,102,241,.1)",color:"#a5b4fc",fontSize:11,padding:"1px 7px",borderRadius:5,fontWeight:600}}>{g.name}</span>)}
                              <button onClick={()=>setAssigningManager(isAssigning?null:m.id)} style={{background:"transparent",border:"1px dashed #3d4268",color:"#64748b",padding:"1px 8px",borderRadius:5,cursor:"pointer",fontSize:11}}>+ гео</button>
                            </div>
                          </td>
                          <td style={S.td}><span style={{background:m.is_active?"linear-gradient(135deg,#14532d,#166534)":"#1e2235",color:m.is_active?"#86efac":"#64748b",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600}}>{m.is_active?"Активен":"Отключён"}</span></td>
                          <td style={{...S.td,color:"#94a3b8"}}>{players.filter(p=>p.manager_id===m.id).length}</td>
                          <td style={{...S.td,display:"flex",gap:6}}>
                            <button onClick={()=>toggleManager(m)} className="btn-g" style={{border:"1px solid #2d3148",color:"#94a3b8",padding:"5px 10px",borderRadius:6,cursor:"pointer",fontSize:11}}>{m.is_active?"Откл":"Вкл"}</button>
                            <button onClick={()=>deleteManager(m.id)} className="btn-g btn-danger" style={{border:"1px solid #2d3148",color:"#94a3b8",padding:"5px 10px",borderRadius:6,cursor:"pointer",fontSize:11}}>Удалить</button>
                          </td>
                        </tr>
                        {isAssigning&&(
                          <tr key={`assign-${m.id}`}>
                            <td colSpan={8} style={{padding:"10px 18px",background:"#151824",borderBottom:"1px solid #2d3148"}}>
                              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                                <span style={{color:"#64748b",fontSize:12}}>Назначить гео:</span>
                                {geos.map(g=>{
                                  const hasGeo=userGeos.some(ug=>ug.manager_id===m.id&&ug.geo_id===g.id);
                                  return(
                                    <button key={g.id} onClick={()=>toggleUserGeo(m.id,g.id)} style={{background:hasGeo?"linear-gradient(135deg,#6366f1,#818cf8)":"#1e2235",color:hasGeo?"#fff":"#94a3b8",border:`1px solid ${hasGeo?"#6366f1":"#2d3148"}`,padding:"4px 12px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,transition:"all .15s"}}>
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
            <div style={{border:"1px solid #2d3148",borderRadius:10,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Платформа","Гео","Дата","Мин. деп","Цель СЧ","Капа","Период","Статус","Действия"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {platforms.map(p=>{
                    const isActive=p.is_active!==false,geo=geos.find(g=>g.id===p.geo_id);
                    return(
                      <tr key={p.id} className="row-hover" style={{opacity:isActive?1:0.5}}>
                        <td style={{...S.td,fontWeight:600,color:"#e2e8f0"}}>{p.name}</td>
                        <td style={S.td}>{geo?<span style={{background:"rgba(99,102,241,.15)",color:"#a5b4fc",padding:"2px 7px",borderRadius:5,fontSize:11,fontWeight:600}}>{geo.name}</span>:"—"}</td>
                        <td style={{...S.td,color:"#94a3b8",fontSize:12}}>{p.date_added||"—"}</td>
                        <td style={{...S.td,color:"#94a3b8"}}>{p.min_deposit||"—"}€</td>
                        <td style={S.td}><span style={{background:"linear-gradient(135deg,#1e3a5f,#1e40af)",color:"#93c5fd",padding:"2px 8px",borderRadius:6,fontWeight:700,fontSize:11}}>{p.target_avg_check}€</span></td>
                        <td style={{...S.td,color:"#94a3b8"}}>{p.cap||"—"}</td>
                        <td style={S.td}><span style={{background:p.reset_monthly?"linear-gradient(135deg,#1e3a5f,#1e40af)":"#1e2235",color:p.reset_monthly?"#93c5fd":"#64748b",padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600}}>{p.reset_monthly?"Помесячно":"Накопит."}</span></td>
                        <td style={S.td}><span style={{background:isActive?"linear-gradient(135deg,#14532d,#166534)":"#1e2235",color:isActive?"#86efac":"#64748b",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600}}>{isActive?"Активна":"Скрыта"}</span></td>
                        <td style={{...S.td,display:"flex",gap:6}}>
                          <button onClick={()=>openPlatformForm(p)} className="btn-g" style={{border:"1px solid #2d3148",color:"#94a3b8",width:28,height:28,borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={()=>deletePlatform(p.id)} className="btn-g btn-danger" style={{border:"1px solid #7f1d1d",color:"#fca5a5",width:28,height:28,borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
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
                  <div key={g.id} style={{background:"#1a1d27",border:`1px solid ${g.is_active===false?"#7f1d1d":"#2d3148"}`,borderRadius:10,padding:16,opacity:g.is_active===false?0.6:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      {g.code&&<span style={{background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",padding:"2px 8px",borderRadius:6,fontSize:12,fontWeight:700}}>{g.code}</span>}
                      <span style={{color:"#fff",fontWeight:700,fontSize:14,flex:1}}>{g.name}</span>
                      <div style={{display:"flex",flexDirection:"column",gap:4}}>
                        <button onClick={async()=>{ await supabase.from("geos").update({is_active:g.is_active===false?true:false}).eq("id",g.id); loadAdmin(); }} style={{background:"transparent",border:"1px solid #2d3148",color:"#94a3b8",padding:"3px 8px",borderRadius:5,cursor:"pointer",fontSize:11}}>{g.is_active===false?"Показать":"Скрыть"}</button>
                        <button onClick={async()=>{ if(!confirm(`Удалить гео "${g.name}"?`)) return; await supabase.from("geos").delete().eq("id",g.id); loadAdmin(); }} style={{background:"transparent",border:"1px solid #7f1d1d",color:"#fca5a5",padding:"3px 8px",borderRadius:5,cursor:"pointer",fontSize:11}}>Удалить</button>
                      </div>
                    </div>
                    <div style={{fontSize:12,color:"#64748b",marginBottom:4}}>Платформ: <strong style={{color:"#94a3b8"}}>{geoPlatforms.length}</strong></div>
                    <div style={{fontSize:12,color:"#64748b",marginBottom:8}}>Менеджеров: <strong style={{color:"#94a3b8"}}>{geoManagers2.length}</strong></div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {geoManagers2.map(m=><span key={m.id} style={{background:"rgba(99,102,241,.1)",color:"#a5b4fc",fontSize:10,padding:"1px 6px",borderRadius:4}}>{m.name}</span>)}
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
                <select value={taskGeo} onChange={e=>{ setTaskGeo(e.target.value); setTaskPlat(""); setTaskMgr(""); }} style={{...IS,width:"auto",minWidth:140}}>
                  <option value="">Все гео</option>
                  {geos.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <select value={taskPlat} onChange={e=>setTaskPlat(e.target.value)} style={{...IS,width:"auto",minWidth:140}}>
                  <option value="">Все платформы</option>
                  {platforms.filter(p=>!taskGeo||p.geo_id===taskGeo).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={taskMgr} onChange={e=>setTaskMgr(e.target.value)} style={{...IS,width:"auto",minWidth:140}}>
                  <option value="">Все менеджеры</option>
                  {managers.filter(m=>!taskGeo||userGeos.some(ug=>ug.geo_id===taskGeo&&ug.manager_id===m.id)).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input type="date" value={taskDateFilter} onChange={e=>setTaskDateFilter(e.target.value)} style={{...IS,width:"auto",colorScheme:"dark"}}/>
                {taskDateFilter&&<button onClick={()=>setTaskDateFilter("")} style={{background:"transparent",border:"1px solid #2d3148",color:"#94a3b8",padding:"0 12px",borderRadius:7,cursor:"pointer",fontSize:12}}>Сегодня</button>}
              </div>
              <div style={{ display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-start" }}>
                <div style={{ flex:"1 1 360px",minWidth:300 }}>
                  <h3 style={{ color:"#a5b4fc",fontSize:14,margin:"0 0 10px" }}>📋 Задачи на {taskDateFilter? new Date(taskDateFilter+"T00:00:00").toLocaleDateString("ru",{day:"2-digit",month:"2-digit"}) : "сегодня"}</h3>
                  {tasks.length===0&&<div style={{ color:"#7b8290",fontSize:13,padding:"16px 0" }}>Задач на этот день нет</div>}
                  {tasks.map(({player,plat,mgr,rdNum,amount},idx)=>(
                    <div key={`t-${player.id}-${rdNum}-${idx}`} onClick={()=>goToLead(player)} className="row-hover" style={card}>
                      <div style={{ width:8,height:8,borderRadius:"50%",background:"#6366f1",flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8 }}><span style={{ fontWeight:700,color:"#fff",fontSize:14 }}>{player.name}</span>{mgr&&<span style={{ fontSize:11,color:"#a5b4fc",background:"rgba(99,102,241,.1)",padding:"1px 6px",borderRadius:4 }}>{mgr.name}</span>}</div>
                        <div style={{ fontSize:12,color:"#7b8290" }}>{plat?.name||"—"} · РД{rdNum}</div>
                      </div>
                      {amount!=null&&<div style={{ fontSize:14,fontWeight:700,color:"#a5b4fc" }}>{amount}€</div>}
                    </div>
                  ))}
                </div>
                <div style={{ flex:"1 1 360px",minWidth:300 }}>
                  <h3 style={{ color:"#fca5a5",fontSize:14,margin:"0 0 10px" }}>⚠️ Просроченные</h3>
                  {overdue.length===0&&<div style={{ color:"#7b8290",fontSize:13,padding:"16px 0" }}>✅ Нет просроченных РД</div>}
                  {overdue.map(player=>{
                    const plat=platforms.find(p=>p.id===player.platform_id);
                    const mgr=managers.find(m=>m.id===player.manager_id);
                    const od=odd[player.id];
                    const days=Math.floor((new Date(today)-new Date(od))/(1000*60*60*24));
                    const planned=plannedRds.filter(r=>r&&r.player_id===player.id&&r.date<today).sort((a,b)=>a.rd_number-b.rd_number)[0];
                    return(
                      <div key={`o-${player.id}`} onClick={()=>goToLead(player)} className="row-hover" style={{ ...card,background:"rgba(239,68,68,.07)",border:"1px solid #7f1d1d" }}>
                        <div style={{ width:8,height:8,borderRadius:"50%",background:"#ef4444",flexShrink:0 }}/>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}><span style={{ fontWeight:700,color:"#fff",fontSize:14 }}>{player.name}</span>{mgr&&<span style={{ fontSize:11,color:"#a5b4fc",background:"rgba(99,102,241,.1)",padding:"1px 6px",borderRadius:4 }}>{mgr.name}</span>}</div>
                          <div style={{ fontSize:12,color:"#7b8290" }}>{plat?.name||"—"}{planned?` · РД${planned.rd_number}`:""} · {od?(([y,m,d])=>`${d}.${m}`)(od.split("-")):""}</div>
                        </div>
                        <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2 }}>
                          {planned&&<span style={{ fontSize:13,fontWeight:700,color:"#fca5a5" }}>{planned.amount}€</span>}
                          <span style={{ background:"linear-gradient(135deg,#7f1d1d,#991b1b)",color:"#fca5a5",padding:"1px 7px",borderRadius:6,fontWeight:700,fontSize:11 }}>{days} дн.</span>
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
              <select value={adminViewGeo||""} onChange={e=>{ setAdminViewGeo(e.target.value||null); setAdminViewManager(null); }} style={{...IS,width:"auto",minWidth:160}}>
                <option value="">Выбери гео</option>
                {geos.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              {adminViewGeo&&(
                <select value={adminViewManager||""} onChange={e=>setAdminViewManager(e.target.value||null)} style={{...IS,width:"auto",minWidth:160}}>
                  <option value="">Все менеджеры</option>
                  {managers.filter(m=>userGeos.some(ug=>ug.geo_id===adminViewGeo&&ug.manager_id===m.id)).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
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
                    <div style={{width:7,height:7,borderRadius:"50%",background:mgr.role==="team_lead"?"#14b8a6":"#6366f1"}}/>
                    <span style={{color:"#fff",fontWeight:700,fontSize:15}}>{mgr.name}</span>
                    {mgr.role==="team_lead"&&<span style={{background:"rgba(20,184,166,.15)",color:"#14b8a6",fontSize:10,padding:"1px 6px",borderRadius:4,fontWeight:700}}>ТЛ</span>}
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
            <p style={{ color:"#64748b",fontSize:12,marginBottom:20 }}>Резервные копии всех таблиц отправляются на вебхук. Хранится одна (самая свежая) точка восстановления.</p>

            <div style={{ background:"#1a1d27",border:"1px solid #2d3148",borderRadius:12,padding:20,marginBottom:16 }}>
              <h3 style={{ color:"#e2e8f0",fontSize:14,margin:"0 0 6px" }}>💾 Резервная копия</h3>
              <p style={{ color:"#64748b",fontSize:12,margin:"0 0 14px" }}>Читает все таблицы и отправляет JSON на вебхук. Авто-бэкап каждый день в 08:00 настраивается на стороне n8n (расписание).</p>
              <button onClick={doBackup} disabled={backupBusy} style={{ background:backupBusy?"#334155":"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",padding:"10px 18px",borderRadius:9,cursor:backupBusy?"default":"pointer",fontSize:13,fontWeight:700 }}>{backupBusy?"Отправляю…":"Сделать бэкап сейчас"}</button>
              {lastBackupAt&&<span style={{ color:"#86efac",fontSize:12,marginLeft:12 }}>Последний: {lastBackupAt}</span>}
            </div>

            <div style={{ background:"#1a1d27",border:"1px solid #7f1d1d",borderRadius:12,padding:20 }}>
              <h3 style={{ color:"#fca5a5",fontSize:14,margin:"0 0 6px" }}>↘ Восстановление</h3>
              <p style={{ color:"#64748b",fontSize:12,margin:"0 0 14px" }}>Загружает последнюю точку, показывает все таблицы для просмотра, даёт выбрать какие восстановить. Данные дополняются (merge по id). Перед применением сохраняется локальная точка отката — пока не подтвердишь, можно откатить назад.</p>
              <button onClick={openRestorePreview} disabled={restoreBusy} style={{ background:"transparent",border:"1px solid #f87171",color:"#fca5a5",padding:"10px 18px",borderRadius:9,cursor:restoreBusy?"default":"pointer",fontSize:13,fontWeight:700 }}>{restoreBusy?"Загружаю…":"Загрузить точку восстановления"}</button>
            </div>
          </div>
        )}

        {restorePreview&&(()=>{
          const tbls = Backup.BACKUP_TABLES.filter(t=>Array.isArray(restorePreview.tables[t]));
          const rows = restorePreview.tables[previewTable]||[];
          const cols = rows.length>0 ? Object.keys(rows[0]) : [];
          const toggle = (t)=>setRestoreSel(s=>s.includes(t)?s.filter(x=>x!==t):[...s,t]);
          return (
          <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:9000,display:"flex",flexDirection:"column",padding:24 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
              <div>
                <h3 style={{ color:"#fff",margin:0,fontSize:16 }}>Просмотр точки восстановления</h3>
                <span style={{ color:"#64748b",fontSize:12 }}>создана: {restorePreview.created_at? new Date(restorePreview.created_at).toLocaleString("ru"):"—"}</span>
              </div>
              <button onClick={()=>setRestorePreview(null)} style={{ background:"#1a1d27",border:"1px solid #2d3148",color:"#e2e8f0",padding:"8px 16px",borderRadius:8,cursor:"pointer",fontSize:13 }}>Закрыть</button>
            </div>
            <div style={{ flex:1,display:"flex",gap:14,minHeight:0 }}>
              <div style={{ width:230,background:"#1a1d27",border:"1px solid #2d3148",borderRadius:10,padding:10,overflowY:"auto" }}>
                <div style={{ color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8 }}>Таблицы для восстановления</div>
                {tbls.map(t=>(
                  <div key={t} onClick={()=>{ setPreviewTable(t); setPreviewMgr(null); }} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 8px",borderRadius:7,cursor:"pointer",background:previewTable===t?"rgba(99,102,241,.15)":"transparent",marginBottom:2 }}>
                    <input type="checkbox" checked={restoreSel.includes(t)} onChange={()=>toggle(t)} onClick={e=>e.stopPropagation()} style={{ accentColor:"#6366f1" }}/>
                    <span style={{ color:"#e2e8f0",fontSize:12,flex:1 }}>{Backup.TABLE_LABELS[t]||t}</span>
                    <span style={{ color:"#64748b",fontSize:11 }}>{(restorePreview.tables[t]||[]).length}</span>
                  </div>
                ))}
                <div style={{ display:"flex",gap:6,marginTop:8 }}>
                  <button onClick={()=>setRestoreSel(tbls)} style={{ flex:1,background:"transparent",border:"1px solid #2d3148",color:"#94a3b8",padding:"4px 6px",borderRadius:6,cursor:"pointer",fontSize:11 }}>Все</button>
                  <button onClick={()=>setRestoreSel([])} style={{ flex:1,background:"transparent",border:"1px solid #2d3148",color:"#94a3b8",padding:"4px 6px",borderRadius:6,cursor:"pointer",fontSize:11 }}>Снять</button>
                </div>
              </div>
              <div style={{ flex:1,background:"#1a1d27",border:"1px solid #2d3148",borderRadius:10,overflow:"auto",minWidth:0 }}>
                {(()=>{
                  const T = restorePreview.tables;
                  const renderTable = (data,onRowClick)=>{
                    if(!data||data.length===0) return <div style={{ padding:20,color:"#64748b",fontSize:13 }}>Нет данных</div>;
                    const cs = Object.keys(data[0]);
                    return (
                      <table style={{ borderCollapse:"collapse",fontSize:11,width:"100%" }}>
                        <thead><tr>{cs.map(c=><th key={c} style={{ position:"sticky",top:0,background:"#13151c",color:"#94a3b8",padding:"7px 10px",textAlign:"left",borderBottom:"1px solid #2d3148",whiteSpace:"nowrap" }}>{c}</th>)}</tr></thead>
                        <tbody>
                          {data.slice(0,200).map((r,i)=>(
                            <tr key={i} onClick={onRowClick?()=>onRowClick(r):undefined} style={onRowClick?{ cursor:"pointer" }:undefined} className={onRowClick?"row-hover":undefined}>
                              {cs.map(c=><td key={c} style={{ color:"#cbd5e1",padding:"6px 10px",borderBottom:"1px solid #23262f",whiteSpace:"nowrap",maxWidth:240,overflow:"hidden",textOverflow:"ellipsis" }}>{r[c]==null?"—":typeof r[c]==="object"?JSON.stringify(r[c]):String(r[c])}</td>)}
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
                        <div style={{ position:"sticky",top:0,background:"#13151c",borderBottom:"1px solid #2d3148",padding:"10px 14px",display:"flex",alignItems:"center",gap:12,zIndex:2 }}>
                          <button onClick={()=>setPreviewMgr(null)} style={{ background:"transparent",border:"1px solid #2d3148",color:"#94a3b8",padding:"5px 10px",borderRadius:6,cursor:"pointer",fontSize:12 }}>← Назад</button>
                          <span style={{ color:"#fff",fontWeight:700,fontSize:14 }}>{previewMgr.name}</span>
                          <span style={{ color:"#64748b",fontSize:11 }}>{previewMgr.role}</span>
                          <span style={{ color:"#64748b",fontSize:11,marginLeft:"auto" }}>Отметь разделы для восстановления ↓</span>
                        </div>
                        {MGR_SECTIONS.map(([key,title])=>{
                          const data=full[key]||[];
                          return (
                            <div key={key} style={{ padding:"12px 14px",borderBottom:"1px solid #23262f" }}>
                              <label style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8,cursor:"pointer" }}>
                                <input type="checkbox" checked={mgrSel.includes(key)} onChange={()=>setMgrSel(s=>s.includes(key)?s.filter(x=>x!==key):[...s,key])} style={{ accentColor:"#6366f1" }}/>
                                <span style={{ color:"#a5b4fc",fontSize:12,fontWeight:700 }}>{title} <span style={{ color:"#64748b",fontWeight:400 }}>({data.length})</span></span>
                              </label>
                              <div style={{ overflowX:"auto" }}>{renderTable(data)}</div>
                            </div>
                          );
                        })}
                        <div style={{ position:"sticky",bottom:0,background:"#13151c",borderTop:"1px solid #7f1d1d",padding:"12px 14px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",zIndex:2 }}>
                          <span style={{ color:"#fca5a5",fontSize:12,fontWeight:600 }}>Восстановить выбранные разделы для {previewMgr.name} (merge, откат возможен)</span>
                          <input value={mgrConfirm} onChange={e=>setMgrConfirm(e.target.value)} placeholder="Впишите: ВОССТАНОВИТЬ" style={{ background:"#0f1117",border:"1px solid #2d3148",color:"#e2e8f0",padding:"8px 12px",borderRadius:8,fontSize:13,outline:"none",marginLeft:"auto",width:190 }}/>
                          <button onClick={runMgrRestore} disabled={restoreBusy} style={{ background:restoreBusy?"#334155":"linear-gradient(135deg,#dc2626,#b91c1c)",border:"none",color:"#fff",padding:"9px 16px",borderRadius:9,cursor:restoreBusy?"default":"pointer",fontSize:13,fontWeight:700 }}>{restoreBusy?"…":"Восстановить"}</button>
                        </div>
                      </div>
                    );
                  }
                  return rows.length===0
                    ? <div style={{ padding:20,color:"#64748b",fontSize:13 }}>Таблица пустая</div>
                    : <>
                        {previewTable==="managers"&&<div style={{ padding:"8px 14px",color:"#64748b",fontSize:11,borderBottom:"1px solid #23262f" }}>Кликни на менеджера, чтобы открыть его данные и восстановить выборочно</div>}
                        {renderTable(rows, previewTable==="managers"?(m)=>{ setPreviewMgr(m); setMgrSel(MGR_SECTIONS.map(s=>s[0])); setMgrConfirm(""); }:undefined)}
                        {rows.length>200&&<div style={{ padding:10,color:"#64748b",fontSize:11 }}>…показаны первые 200 из {rows.length}</div>}
                      </>;
                })()}
              </div>
            </div>
            <div style={{ marginTop:14,background:"#1a1d27",border:"1px solid #7f1d1d",borderRadius:10,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" }}>
              <span style={{ color:"#fca5a5",fontSize:12,fontWeight:600 }}>Выбрано таблиц: {restoreSel.length}. Данные дополнятся (merge). Откат возможен до подтверждения.</span>
              <input value={restoreConfirm} onChange={e=>setRestoreConfirm(e.target.value)} placeholder="Впишите: ВОССТАНОВИТЬ" style={{ background:"#0f1117",border:"1px solid #2d3148",color:"#e2e8f0",padding:"8px 12px",borderRadius:8,fontSize:13,outline:"none",marginLeft:"auto",width:200 }}/>
              <button onClick={runRestore} disabled={restoreBusy} style={{ background:restoreBusy?"#334155":"linear-gradient(135deg,#dc2626,#b91c1c)",border:"none",color:"#fff",padding:"9px 18px",borderRadius:9,cursor:restoreBusy?"default":"pointer",fontSize:13,fontWeight:700 }}>{restoreBusy?"Восстанавливаю…":"Восстановить выбранное"}</button>
            </div>
          </div>
          );
        })()}

        {pendingRestore&&(
          <div style={{ position:"fixed",left:0,right:0,bottom:0,zIndex:8000,background:"#1a1d27",borderTop:"2px solid #f59e0b",padding:"14px 24px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",boxShadow:"0 -8px 32px rgba(0,0,0,.5)" }}>
            <span style={{ color:"#fbbf24",fontWeight:700,fontSize:13 }}>⚠ Восстановление применено{pendingRestore.at?` (${new Date(pendingRestore.at).toLocaleString("ru")})`:""}. Проверьте данные.</span>
            <span style={{ color:"#64748b",fontSize:12 }}>{pendingRestore.scope?pendingRestore.scope+" · ":""}{(pendingRestore.tables||[]).map(t=>Backup.TABLE_LABELS[t]||t).join(", ")}</span>
            <div style={{ marginLeft:"auto",display:"flex",gap:10 }}>
              <button onClick={confirmRestore} disabled={restoreBusy} style={{ background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",color:"#fff",padding:"9px 18px",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:700 }}>✓ Подтвердить</button>
              <button onClick={rollbackRestore} disabled={restoreBusy} style={{ background:"transparent",border:"1px solid #f87171",color:"#fca5a5",padding:"9px 18px",borderRadius:9,cursor:restoreBusy?"default":"pointer",fontSize:13,fontWeight:700 }}>↺ Откатить</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

