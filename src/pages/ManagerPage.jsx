import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "../supabaseClient";
import { STATUSES, LEAD_COLORS, CSS, THEME } from "../constants";
import { getStatusStyle, StatusBadge, StatusPopup, ColorPopup, Toast } from "../components/common";
import { PlayersTable } from "../components/PlayersTable";
import { AddLeadForm } from "../components/AddLeadForm";
import { HistoryView } from "../components/HistoryView";
import { ReportView } from "../components/ReportView";
import * as P from "../presence";

function SbIcon({ name }) {
  const c = { width:18, height:18, viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:1.8, strokeLinecap:"round", strokeLinejoin:"round" };
  switch(name){
    case "main": case "team": return <svg {...c}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "tasks": return <svg {...c}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
    case "platforms": return <svg {...c}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>;
    case "report": return <svg {...c}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
    case "history": return <svg {...c}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case "overview": return <svg {...c}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
    case "activity": return <svg {...c}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
    default: return <svg {...c}><circle cx="12" cy="12" r="9"/></svg>;
  }
}

export function ManagerPage({ manager, onLogout }) {
  const [dark, setDark] = useState(true);
  const [platforms, setPlatforms] = useState([]);
  const [allManagers, setAllManagers] = useState([]);
  const [geos, setGeos] = useState([]);
  const [myGeos, setMyGeos] = useState([]);
  const [userGeos, setUserGeos] = useState([]);
  const [players, setPlayers] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]); // all players in my geos
  const [redeposits, setRedeposits] = useState([]);
  const [plannedRds, setPlannedRds] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [tab, setTab] = useState("main");
  const [activeGeo, setActiveGeo] = useState(null);
  const [viewingManager, setViewingManager] = useState(() => ({})); // { geoId: managerId }
  const [pinnedPlatforms, setPinnedPlatforms] = useState(()=>{ try{ return JSON.parse(localStorage.getItem(`pinned_${manager.id}`)||"[]"); }catch{ return []; } });
  const updatePinnedPlatforms = (fn) => { setPinnedPlatforms(prev=>{ const next=typeof fn==='function'?fn(prev):fn; localStorage.setItem(`pinned_${manager.id}`,JSON.stringify(next)); return next; }); };
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);
  const [todoPlatFilter, setTodoPlatFilter] = useState("");
  const [todoMgrFilter, setTodoMgrFilter] = useState("");
  const [todoDate, setTodoDate] = useState("");
  const [crmActivity, setCrmActivity] = useState([]); const [crmBusy, setCrmBusy] = useState(false); const [crmError, setCrmError] = useState(""); const [crmRefreshedAt, setCrmRefreshedAt] = useState(null);
  const [presenceDate, setPresenceDate] = useState(P.todayStr()); const [trackerEvents, setTrackerEvents] = useState({});
  const [crmUsers, setCrmUsers] = useState([]);
  const [presenceMap, setPresenceMap] = useState({});
  const [crmPresence, setCrmPresence] = useState([]);
  const loadCrmPresence = async () => { try { const j=await fetch("/api/crm-presence").then(r=>r.json()); setCrmPresence(j.users||[]); } catch(e){} };
  const [crmMsgs, setCrmMsgs] = useState({});
  const loadCrmMsgs = async () => { try { const j=await fetch("/api/crm-conversations").then(r=>r.json()); if(j.ok) setCrmMsgs(j.users||{}); } catch(e){} };
  const [dayDate, setDayDate] = useState(P.todayStr());
  const [dayData, setDayData] = useState({}); const [dayTracker, setDayTracker] = useState({});
  const [dayBusy, setDayBusy] = useState(false); const [dayLoaded, setDayLoaded] = useState(false); const [expandedId, setExpandedId] = useState(null);
  const loadDay = async (dateStr) => {
    const d = dateStr || dayDate; setDayBusy(true);
    try {
      const { fromISO, toISO } = P.dayBoundsISO(d);
      const j = await fetch(`/api/crm-day?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`).then(r=>r.json());
      if(j.ok) setDayData(j.users||{});
      const { data } = await supabase.from("activity_log").select("manager_id, created_at").gte("created_at", fromISO).lt("created_at", toISO);
      const tr={}; (data||[]).forEach(r=>{ (tr[r.manager_id]||(tr[r.manager_id]=[])).push(r.created_at); }); setDayTracker(tr);
    } catch(e){}
    setDayBusy(false); setDayLoaded(true);
  };
  const loadPresence = async () => { try { const { data }=await supabase.from("manager_presence").select("manager_id, last_seen"); const m={}; (data||[]).forEach(r=>{ m[r.manager_id]=r.last_seen; }); setPresenceMap(m); } catch(e){} };
  const loadCrmUsers = async () => { try { const j=await fetch("/api/crm-users").then(r=>r.json()); if(Array.isArray(j.users)) setCrmUsers(j.users); } catch(e){} };
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
      setCrmActivity(crmRes.users||[]); setCrmRefreshedAt(crmRes.refreshed_at||new Date().toISOString());
      const ev={}; (logRes.data||[]).forEach(r=>{ if(!r.manager_id) return; (ev[r.manager_id]=ev[r.manager_id]||[]).push(r.created_at); });
      setTrackerEvents(ev);
    } catch(e){ setCrmError("Не удалось получить данные: "+(e?.message||e)); }
    setCrmBusy(false);
  };
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('desc');
  const [toast, setToast] = useState(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showAddRd, setShowAddRd] = useState(null);
  const [showAutomation, setShowAutomation] = useState(false);
  const [showSverka, setShowSverka] = useState(false);
  const [sverkaLoading, setSverkaLoading] = useState(false);
  const [sverkaData, setSverkaData] = useState(null);
  const [showIgnored, setShowIgnored] = useState(false);
  const [showUnknownDep, setShowUnknownDep] = useState(false);
  const [automationPreview, setAutomationPreview] = useState([]);
  const [excludedIds, setExcludedIds] = useState(new Set());
  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [teamFilterPlatform, setTeamFilterPlatform] = useState("");
  const [teamFilterStatus, setTeamFilterStatus] = useState("");
  const [dragPlatId, setDragPlatId] = useState(null);
  const [statPlatform, setStatPlatform] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [leadForm, setLeadForm] = useState({ date:new Date().toISOString().slice(0,10), platform_id:"", name:"", sub18:"", deposit:"", is_blik:false, status:"Да", next_rd_date:"" });
  const [rdForm, setRdForm] = useState({ amount:"", date:new Date().toISOString().slice(0,10) });
  const [showPlatformForm, setShowPlatformForm] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [pForm, setPForm] = useState({ name:"", target_avg_check:"", min_deposit:"", min_deposit_blik:"", cap:"", date_added:"", is_active:true, reset_monthly:false, geo_id:"" });
  const [showGeoForm, setShowGeoForm] = useState(false);
  const [geoForm, setGeoForm] = useState({ name:"", code:"" });

  const showToast = (msg, type="ok", onUndo=null) => { setToast({msg,type,onUndo}); setTimeout(()=>setToast(null),4000); };

  const load = async () => {
    const [{ data:p },{ data:pl },{ data:rd },{ data:prd },{ data:ug },{ data:g },{ data:am },{ data:allUg },{ data:al }] = await Promise.all([
      supabase.from("platforms").select("*").order("sort_order").order("name"),
      supabase.from("players").select("*").order("sort_order",{ascending:true,nullsFirst:false}).order("date",{ascending:false}),
      supabase.from("redeposits").select("*"),
      supabase.from("planned_redeposits").select("*"),
      supabase.from("user_geos").select("*, geos(*)").eq("manager_id",manager.id),
      supabase.from("geos").select("*").eq("is_active",true),
      supabase.from("managers").select("*").eq("is_active",true),
      supabase.from("user_geos").select("*"),
      supabase.from("activity_log").select("*, managers(name), players(name)").order("created_at",{ascending:false}).limit(200),
    ]);
    setPlatforms(p||[]); setRedeposits(rd||[]); setPlannedRds(prd||[]);
    setGeos(g||[]); setAllManagers(am||[]); setUserGeos(allUg||[]); setActivityLog(al||[]);
    const myGeoList=(ug||[]).map(u=>u&&u.geos).filter(g=>g&&g.id);
    setMyGeos(myGeoList);
    const firstGeo=myGeoList.length>0?myGeoList[0].id:null;
    if (myGeoList.length>0&&!activeGeo) setActiveGeo(firstGeo);
    const myPlayers=(pl||[]).filter(p=>p&&p.id&&p.manager_id===manager.id);
    setPlayers(myPlayers);
    setAllPlayers((pl||[]).filter(p=>p&&p.id));
  };
  useEffect(()=>{ load(); },[]);
  useEffect(()=>{ if(tab==="activity"&&isTeamLead&&crmPresence.length===0) loadCrmPresence(); if(tab==="activity"&&isTeamLead&&Object.keys(crmMsgs).length===0) loadCrmMsgs(); if(tab==="activity"&&isTeamLead&&!dayLoaded) loadDay(); },[tab]);

  const today = new Date().toISOString().slice(0,10);
  const isTeamLead = manager.role === "team_lead";

  const [highlightId, setHighlightId] = useState(null);
  const goToLead = (player) => {
    if(!player) return;
    setHighlightId(player.id);
    if(player.manager_id===manager.id){ setTab("main"); }
    else { setViewingManager(prev=>({...(prev||{}),[activeGeo]:player.manager_id})); setTab("team"); }
    setTimeout(()=>setHighlightId(null),3000);
  };

  const geoManagers = activeGeo ? (() => {
    return allManagers.filter(m => m.id !== manager.id);
  })() : [];

  const getPlayerRds = (pid) => (redeposits||[]).filter(r=>r&&r.player_id===pid).sort((a,b)=>a.rd_number-b.rd_number);
  const calcEffectiveTotal = (player) => {
    if(!player||!player.id) return 0;
    const rds=getPlayerRds(player.id);
    if (player.status==="Кинул"&&rds.length>0) return Number(player.deposit)+rds.slice(0,-1).reduce((s,r)=>s+Number(r.amount),0);
    return Number(player.deposit)+rds.reduce((s,r)=>s+Number(r.amount),0);
  };

  const openPlatformForm = (p=null) => {
    setEditingPlatform(p);
    setPForm(p?{name:p.name,target_avg_check:p.target_avg_check,min_deposit:p.min_deposit||"",min_deposit_blik:p.min_deposit_blik||"",cap:p.cap||"",date_added:p.date_added||"",is_active:p.is_active!==false,reset_monthly:p.reset_monthly||false,geo_id:p.geo_id||""}:{name:"",target_avg_check:"",min_deposit:"",min_deposit_blik:"",cap:"",date_added:new Date().toISOString().slice(0,10),is_active:true,reset_monthly:false,geo_id:activeGeo||""});
    setShowPlatformForm(true);
  };
  const savePlatform = async () => {
    if(!pForm.name||!pForm.target_avg_check){ showToast("Заполни поля","error"); return; }
    const data={name:pForm.name,target_avg_check:Number(pForm.target_avg_check),min_deposit:Number(pForm.min_deposit)||0,min_deposit_blik:Number(pForm.min_deposit_blik)||null,cap:pForm.cap?Number(pForm.cap):null,date_added:pForm.date_added||null,is_active:pForm.is_active,reset_monthly:pForm.reset_monthly,geo_id:pForm.geo_id||null};
    if(editingPlatform){ await supabase.from("platforms").update(data).eq("id",editingPlatform.id); showToast("Обновлено!"); }
    else{ await supabase.from("platforms").insert(data); showToast("Добавлено!"); }
    setShowPlatformForm(false); load();
  };
  const deletePlatform = async (id) => { if(!confirm("Удалить платформу?")) return; await supabase.from("platforms").delete().eq("id",id); load(); };
  const togglePlatformActive = async (p) => { await supabase.from("platforms").update({ is_active:p.is_active===false }).eq("id",p.id); load(); };
  const togglePlatformHidden = async (p) => { await supabase.from("platforms").update({ is_hidden:!p.is_hidden }).eq("id",p.id); load(); };
  const reorderPlatforms = async (fromId, toId) => {
    if(!fromId||!toId||fromId===toId) return;
    const list = platformStats.filter(p=>p.geo_id===activeGeo).map(p=>p.id);
    const from=list.indexOf(fromId), to=list.indexOf(toId);
    if(from<0||to<0) return;
    list.splice(to,0,list.splice(from,1)[0]);
    await Promise.all(list.map((id,i)=>supabase.from("platforms").update({ sort_order:i }).eq("id",id)));
    load();
  };
  const createGeo = async () => {
    if(!geoForm.name.trim()) return;
    await supabase.from("geos").insert({name:geoForm.name.trim(),code:geoForm.code.trim().toUpperCase()});
    showToast("Гео добавлено!"); setGeoForm({name:"",code:""}); setShowGeoForm(false); load();
  };

  const genRdAmount = (minDep) => {
    const min=Number(minDep)||10,r=Math.random()*100;
    if(r<65) return Math.round(min+Math.random()*(min*0.38));
    if(r<85) return Math.round(min*1.4+Math.random()*(min*0.38));
    if(r<95) return Math.round(min*1.8+Math.random()*(min*0.18));
    return Math.round(min*2.0+Math.random()*(min*0.2));
  };

  const getMinDeposit = (plat, player) => {
    if(player.is_blik&&plat.min_deposit_blik) return Number(plat.min_deposit_blik);
    return Number(plat.min_deposit)||10;
  };

  const genAutomation = () => {
    const preview=[];
    const active=players.filter(p=>p.status==="Да"&&!excludedIds.has(p.id));
    const byPlat={};
    active.forEach(p=>{ if(!byPlat[p.platform_id]) byPlat[p.platform_id]=[]; byPlat[p.platform_id].push(p); });

    Object.entries(byPlat).forEach(([pid,pps])=>{
      const plat=platforms.find(p=>p.id===pid); if(!plat) return;
      const target=plat.target_avg_check, cnt=pps.length;
      const curTotal=pps.reduce((s,p)=>s+calcEffectiveTotal(p),0);
      const needed=Math.max(0,target*cnt-curTotal);
      if(needed<=0) return;

      const plans=pps.map(p=>({
        player:p,
        existing:getPlayerRds(p.id),
        slots:9-getPlayerRds(p.id).length,
        amts:[]
      })).filter(pp=>pp.slots>0);
      if(!plans.length) return;

      let best=null, bestDiff=Infinity;
      for(let a=0;a<300;a++){
        plans.forEach(pp=>pp.amts=[]);
        let rem=needed;
        const shuffled=[...plans].sort(()=>Math.random()-.5);
        for(let r=0;r<9&&rem>0;r++){
          for(const pp of shuffled){
            if(pp.amts.length>=pp.slots||rem<=0) continue;
            const min=getMinDeposit(plat,pp.player);
            const amt=genRdAmount(min);
            if(rem<=0) break;
            pp.amts.push(amt);
            rem-=amt;
          }
        }
        const added=plans.reduce((s,pp)=>s+pp.amts.reduce((a,b)=>a+b,0),0);
        const newAvg=(curTotal+added)/cnt;
        const diff=Math.abs(newAvg-target);
        if(diff<bestDiff){ bestDiff=diff; best=plans.map(pp=>({...pp,amts:[...pp.amts]})); }
        if(newAvg>=target&&diff<2) break;
      }
      if(!best) return;

      best.forEach(pp=>{
        if(!pp.amts.length) return;
        const dep=new Date(pp.player.date), ec=pp.existing.length;
        const periodDays=30;
        const step=Math.floor(periodDays/pp.amts.length);
        const sortedAmts=[...pp.amts].sort((a,b)=>a-b);
        const rdPlan=sortedAmts.map((amt,i)=>{
          const dt=new Date(dep);
          const offset=i===0?3:step*i+Math.floor(Math.random()*2);
          dt.setDate(dt.getDate()+offset);
          return{ rd_number:ec+i+1, amount:amt, date:dt.toISOString().slice(0,10) };
        });
        preview.push({player:pp.player,plat,rdPlan,total:calcEffectiveTotal(pp.player)+pp.amts.reduce((s,a)=>s+a,0)});
      });
    });
    setAutomationPreview(preview);
  };

  const applyAutomation = async () => {
    for(const item of automationPreview){
      await supabase.from("planned_redeposits").delete().eq("player_id",item.player.id);
      for(const rd of item.rdPlan) await supabase.from("planned_redeposits").insert({player_id:item.player.id,rd_number:rd.rd_number,amount:rd.amount,date:rd.date});
      if(item.rdPlan.length>0) await supabase.from("players").update({next_rd_date:item.rdPlan[0].date}).eq("id",item.player.id);
    }
    setShowAutomation(false); setAutomationPreview([]); showToast("Автоматизация применена!"); load();
  };

  const leadFormRef = useRef(leadForm);
  useEffect(()=>{ leadFormRef.current=leadForm; },[leadForm]);

  const addLead = async () => {
    const form = leadFormRef.current;
    if(!form.name||!form.deposit){ showToast("Заполни имя и депозит","error"); return; }
    const nextRd=new Date(new Date().setDate(new Date().getDate()+3)).toISOString().slice(0,10);
    const maxOrder=players.length>0?Math.max(...players.map(p=>p.sort_order||0))+1:0;
    const status=form.status;
    let color="none";
    if(form.name||form.sub18){
      const existing=allPlayers.find(p=>p&&((form.name&&p.name===form.name)||(form.sub18&&p.sub18===form.sub18)));
      if(existing){ color=existing.color||"none"; }
    }
    await supabase.from("players").insert({manager_id:manager.id,platform_id:form.platform_id,date:form.date,name:form.name,sub18:form.sub18,deposit:Number(form.deposit),is_blik:form.is_blik,status,color,next_rd_date:nextRd,sort_order:maxOrder});
    showToast("Лид добавлен!"); setShowAddLead(false);
    setLeadForm({date:new Date().toISOString().slice(0,10),platform_id:"",name:"",sub18:"",deposit:"",is_blik:false,status:"Да",next_rd_date:""});
    load();
  };

  const activeGeoPlatIds = new Set(platforms.filter(p=>p&&p.geo_id===activeGeo&&!p.is_hidden).map(p=>p.id));
  const statBase = (isTeamLead ? allPlayers : players).filter(p=>p&&activeGeoPlatIds.has(p.platform_id));
  const platformStats = platforms.map(plat=>{
    const active=statBase.filter(p=>p.platform_id===plat.id&&p.status==="Да");
    const cnt=active.length,amt=active.reduce((s,p)=>s+calcEffectiveTotal(p),0),avg=cnt>0?amt/cnt:0;
    const blik=active.filter(p=>p.is_blik).length,blikPct=cnt>0?Math.round((blik/cnt)*100):0;
    const need=cnt>0?Math.max(0,plat.target_avg_check*cnt-amt):0;
    return{...plat,totalCount:cnt,totalAmount:amt,avgCheck:avg,blikCount:blik,blikPct,needMore:need};
  });

  const allMonths=[...new Set((isTeamLead?allPlayers:players).map(p=>p.date?p.date.slice(0,7):"").filter(Boolean))].sort().reverse();
  const cardBase = statPlatform ? statBase.filter(p=>p.platform_id===statPlatform) : statBase;
  const getStatPlayers=()=>!filterMonth?cardBase.filter(p=>p.status==="Да"):cardBase.filter(p=>p.status==="Да"&&p.date?.slice(0,7)===filterMonth);

  const hiddenPlatIds = new Set(platforms.filter(p=>p&&p.is_hidden).map(p=>p.id));
  const geoPlatforms = activeGeo ? platforms.filter(p=>p.geo_id===activeGeo&&!p.is_hidden) : platforms.filter(p=>!p.is_hidden);
  const addPlatforms = geoPlatforms.filter(p=>p.is_active!==false);

  const runSverka = async () => {
    setShowSverka(true); setSverkaLoading(true); setSverkaData(null);
    try {
      const { data, error } = await supabase.functions.invoke("dynamic-processor", { body: {} });
      if (error) throw new Error(error.message||"Не удалось вызвать функцию");
      if (!data?.ok) throw new Error(data?.error||"Функция вернула ошибку");
      const convs = data.conversions||[];
      const isTL = manager.role==="team_lead";
      const geoPlatIds = new Set(platforms.filter(p=>p&&p.geo_id===activeGeo).map(p=>p.id));
      const platSorted = [...platforms].sort((a,b)=>(b.name||"").length-(a.name||"").length);
      const nameToMgr = [];
      for (const m of allManagers) (m.keitaro_names||"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean).forEach(nm=>nameToMgr.push([nm, m.id]));
      const tailToMgr = (tail) => { const t=(tail||"").trim().toLowerCase(); if(!t) return null; const h=nameToMgr.find(([nm])=>nm===t); return h?h[1]:null; };
      const mgrName = (id) => allManagers.find(m=>m.id===id)?.name || "—";
      const ktPairs = new Map();
      for (const c of convs) {
        const camp = c.campaign||"";
        const plat = platSorted.find(p=>p.name && camp.startsWith(p.name));
        if (!plat || !geoPlatIds.has(plat.id)) continue;
        const tail = camp.slice(plat.name.length).trim();
        const convMgr = tailToMgr(tail);
        const sub = (c.sub18||"").trim().toLowerCase();
        const key = sub+"|"+plat.id;
        if (!ktPairs.has(key)) ktPairs.set(key, { sub18:sub, platId:plat.id, platName:plat.name, manager:tail||"—", convMgrId:convMgr, revenue:c.revenue, datetime:c.datetime, source:c.source });
      }
      let geoLeads = allPlayers.filter(p=>p&&p.platform_id&&geoPlatIds.has(p.platform_id));
      const leadByPair = new Map();
      geoLeads.forEach(p=>leadByPair.set((p.sub18||"").trim().toLowerCase()+"|"+p.platform_id, p));
      const ktKeys = new Set(ktPairs.keys());
      const allGeoConvBySub = new Map();
      for (const c of convs) {
        const camp = c.campaign||"";
        const plat = platSorted.find(p=>p.name && camp.startsWith(p.name));
        if (!plat || !geoPlatIds.has(plat.id)) continue;
        const sub = (c.sub18||"").trim().toLowerCase();
        if (!allGeoConvBySub.has(sub)) allGeoConvBySub.set(sub, []);
        const arr = allGeoConvBySub.get(sub);
        if (!arr.some(x=>x.platId===plat.id)) arr.push({ platId:plat.id, platName:plat.name });
      }
      const allGeoLeadPairs = new Set(allPlayers.filter(p=>p&&p.platform_id&&geoPlatIds.has(p.platform_id)).map(p=>(p.sub18||"").trim().toLowerCase()+"|"+p.platform_id));
      const { data: ign } = await supabase.from("sverka_ignored").select("*");
      const ignored = ign||[];
      const ignSet = new Set(ignored.map(r=>`${r.list_type}|${(r.sub18||"").toLowerCase()}|${r.platform_id||""}`));
      const notIgn = (lt,sub,platId)=>!ignSet.has(`${lt}|${(sub||"").toLowerCase()}|${platId||""}`);
      const notInTracker = [...ktPairs.values()].filter(c=>c.convMgrId).filter(c=>!leadByPair.has(c.sub18+"|"+c.platId)).filter(c=>notIgn("not_in_tracker",c.sub18,c.platId));
      const notInTrackerUnknown = [...ktPairs.values()].filter(c=>!c.convMgrId).filter(c=>!leadByPair.has(c.sub18+"|"+c.platId)).filter(c=>notIgn("not_in_tracker",c.sub18,c.platId));
      const checkSub = geoLeads.filter(p=>p.status==="Да" && !ktKeys.has((p.sub18||"").trim().toLowerCase()+"|"+p.platform_id))
        .map(p=>{
          const sub=(p.sub18||"").trim().toLowerCase();
          const others=(allGeoConvBySub.get(sub)||[]).filter(o=>o.platId!==p.platform_id && !allGeoLeadPairs.has(sub+"|"+o.platId));
          return { name:p.name, sub18:p.sub18, platId:p.platform_id, platName:platforms.find(pl=>pl.id===p.platform_id)?.name||"—", mgr:mgrName(p.manager_id), pid:p.id, mgrId:p.manager_id, hint: others.length? others.map(o=>o.platName).join(", ") : null };
        })
        .filter(p=>notIgn("check_sub",p.sub18,p.platId));
      const wrongMgr = [];
      for (const c of ktPairs.values()) {
        if (!c.convMgrId) continue;
        const lead = leadByPair.get(c.sub18+"|"+c.platId);
        if (lead && lead.manager_id !== c.convMgrId && notIgn("wrong_mgr",c.sub18,c.platId)) wrongMgr.push({ name:lead.name, sub18:c.sub18, platId:c.platId, platName:c.platName, trackerMgr:mgrName(lead.manager_id), keitaroMgr:mgrName(c.convMgrId), pid:lead.id, mgrId:lead.manager_id });
      }
      const statusMismatch = [];
      for (const c of ktPairs.values()) {
        const lead = leadByPair.get(c.sub18+"|"+c.platId);
        if (lead && lead.status !== "Да" && notIgn("status_mismatch",c.sub18,c.platId)) statusMismatch.push({ name:lead.name, sub18:c.sub18, platId:c.platId, platName:c.platName, status:lead.status||"—", mgr:mgrName(lead.manager_id), pid:lead.id, mgrId:lead.manager_id });
      }
      setSverkaData({ notInTracker, notInTrackerUnknown, checkSub, wrongMgr, statusMismatch, ignored, total:convs.length, scope:"гео", isTL });
    } catch(e) {
      setSverkaData({ error:String(e?.message||e) });
    }
    setSverkaLoading(false);
  };

  const ignoreSverkaItem = async (list_type, sub18, platId, note) => {
    await supabase.from("sverka_ignored").insert({ list_type, sub18:(sub18||"").toLowerCase(), platform_id:platId||null, note:note||null });
    setSverkaData(prev=>{
      if(!prev) return prev;
      const keep = (it)=> !((it.sub18||"").toLowerCase()===(sub18||"").toLowerCase() && (it.platId||null)===(platId||null));
      const map = { not_in_tracker:"notInTracker", check_sub:"checkSub", wrong_mgr:"wrongMgr", status_mismatch:"statusMismatch" };
      const field = map[list_type];
      return { ...prev, [field]: (prev[field]||[]).filter(keep), ignored:[...(prev.ignored||[]), { list_type, sub18:(sub18||"").toLowerCase(), platform_id:platId||null }] };
    });
  };
  const restoreSverkaItem = async (row) => {
    let q = supabase.from("sverka_ignored").delete().eq("list_type",row.list_type).eq("sub18",row.sub18);
    q = row.platform_id ? q.eq("platform_id",row.platform_id) : q.is("platform_id",null);
    await q;
    runSverka();
  };
  const sverkaGoToLead = (pid, mgrId) => {
    if(!pid) return;
    setShowSverka(false);
    goToLead({ id:pid, manager_id:mgrId });
  };

  const filteredPlayers = players.filter(p=>{
    const plat=platforms.find(pl=>pl.id===p.platform_id);
    if(activeGeo&&plat&&plat.geo_id!==activeGeo) return false;
    if(hiddenPlatIds.has(p.platform_id)) return false;
    if(filterPlatform&&p.platform_id!==filterPlatform) return false;
    if(filterStatus&&p.status!==filterStatus) return false;
    if(searchQuery){ const q=searchQuery.toLowerCase(); if(!p.name?.toLowerCase().includes(q)&&!p.sub18?.toLowerCase().includes(q)) return false; }
    return true;
  });

  const sortedPlayers = useMemo(()=>{
    if(!sortCol) return filteredPlayers;
    return [...filteredPlayers].sort((a,b)=>{
      let av,bv;
      if(sortCol==='date'){ av=a.date||''; bv=b.date||''; }
      else if(sortCol==='deposit'){ av=Number(a.deposit)||0; bv=Number(b.deposit)||0; }
      else if(sortCol==='total'){ av=calcEffectiveTotal(a); bv=calcEffectiveTotal(b); }
      if(av<bv) return sortDir==='asc'?-1:1;
      if(av>bv) return sortDir==='asc'?1:-1;
      return 0;
    });
  },[filteredPlayers,sortCol,sortDir]);

  const overdueDatesByPlayer={};
  (plannedRds||[]).forEach(r=>{ if(r&&r.date&&r.date<today&&(!overdueDatesByPlayer[r.player_id]||r.date<overdueDatesByPlayer[r.player_id])) overdueDatesByPlayer[r.player_id]=r.date; });
  const inActiveGeo=(p)=>geoPlatforms.some(gp=>gp.id===p.platform_id);
  const overdueRds=players.filter(p=>p&&overdueDatesByPlayer[p.id]&&inActiveGeo(p));
  const todayRdPlayerIds=new Set((plannedRds||[]).filter(r=>r&&r.date===today).map(r=>r.player_id));
  const todayRds=players.filter(p=>p&&todayRdPlayerIds.has(p.id)&&inActiveGeo(p));

  const chartData=(()=>{
    const byDay={};
    cardBase.filter(p=>p.status==="Да").forEach(p=>{
      const d=p.date; if(!byDay[d]) byDay[d]={total:0,cnt:0};
      byDay[d].total+=Number(p.deposit); byDay[d].cnt+=1;
      getPlayerRds(p.id).forEach(rd=>{ const dd=rd.date||d; if(!byDay[dd]) byDay[dd]={total:0,cnt:0}; byDay[dd].total+=Number(rd.amount); });
    });
    let rt=0,rc=0;
    return Object.keys(byDay).sort().map(date=>{ rt+=byDay[date].total; rc+=byDay[date].cnt||0; const [y,m,d]=date.split("-"); return{date:`${d}.${m}`,sch:rc>0?Math.round((rt/rc)*10)/10:0}; });
  })();

  const T = { bg:"#080808",surface:"#101010",border:"rgba(255,255,255,.08)",text:"#F0F0F2",muted:"#4A4A5A",sub:"#8B8B9A",navBg:"#101010",hdrBg:"#101010",inputBg:"rgba(255,255,255,.03)",alertBg:"rgba(244,183,64,.08)",alertBorder:"rgba(244,183,64,.4)",thBg:"transparent",rowBorder:"rgba(255,255,255,.05)" };
  const IS = { background:T.inputBg,border:`1px solid ${T.border}`,color:T.text,padding:"8px 10px",borderRadius:7,fontSize:13,outline:"none",width:"100%",boxSizing:"border-box" };
  const S = { th:{ padding:"9px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".07em",borderBottom:`1px solid ${T.border}`,background:T.thBg },td:{ padding:"10px 12px",borderBottom:`1px solid ${T.rowBorder}`,verticalAlign:"middle" } };

  return (
    <div style={{ minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Inter',sans-serif" }}>
      <style>{CSS}</style>
      <aside style={{ position:"fixed",top:0,left:0,bottom:0,width:60,background:T.surface,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",alignItems:"center",padding:"14px 0",zIndex:400 }}>
        <div style={{ width:38,height:38,borderRadius:12,background:THEME.grad,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:18,boxShadow:"0 0 20px rgba(155,79,224,.4)",flexShrink:0 }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="rgba(255,255,255,.95)"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        {myGeos.length>0&&(
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"8px 0",borderTop:`1px solid ${T.border}`,borderBottom:`1px solid ${T.border}`,width:"100%",marginBottom:6 }}>
            {myGeos.map(g=>{
              const on=activeGeo===g.id;
              return <div key={g.id} onClick={()=>setActiveGeo(g.id)} title={g.name} style={{ width:38,height:28,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,fontFamily:THEME.fontGilroy,fontSize:10,fontWeight:600,letterSpacing:".05em",color:on?"#fff":T.muted,background:on?THEME.gradSoft:"transparent",border:on?"1px solid rgba(155,79,224,.4)":"1px solid transparent",cursor:"pointer" }}>{(g.code||g.name.slice(0,2)).toUpperCase()}</div>;
            })}
          </div>
        )}
        <nav style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,width:"100%" }}>
          {[["main","Мои лиды"],["tasks","Задачи"],["team","Команда"],["platforms","Платформы"],["report","Отчёт"],["history","История"],["overview","Сводка"],...(isTeamLead?[["activity","Активность"]]:[])].map(([key,label])=>{
            const on=tab===key;
            const badge=key==="tasks"&&overdueRds.length>0?overdueRds.length:null;
            return (
              <div key={key} onClick={()=>{ setTab(key); setViewingManager(null); }} title={label} style={{ position:"relative",width:38,height:38,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:11,color:on?"#fff":T.muted,background:on?THEME.gradSoft:"transparent",border:on?"1px solid rgba(155,79,224,.4)":"1px solid transparent",cursor:"pointer" }}>
                <SbIcon name={key}/>
                {badge&&<span style={{ position:"absolute",top:3,right:3,minWidth:14,height:14,padding:"0 3px",background:THEME.bad,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:THEME.fontGilroy,fontSize:8,fontWeight:700,color:"#fff" }}>{badge}</span>}
              </div>
            );
          })}
        </nav>
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:8,paddingTop:8,borderTop:`1px solid ${T.border}`,width:"100%" }}>
          <div title={manager.name} style={{ width:34,height:34,borderRadius:10,background:THEME.gradSoft,border:"1px solid rgba(155,79,224,.4)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:THEME.fontGilroy,fontSize:13,fontWeight:700,color:"#fff" }}>{manager.name.slice(0,1).toUpperCase()}</div>
          <div onClick={onLogout} title="Выйти" style={{ width:34,height:30,display:"flex",alignItems:"center",justifyContent:"center",color:T.muted,borderRadius:8,cursor:"pointer" }}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin:"round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </div>
        </div>
      </aside>
      <div style={{ marginLeft:60 }}>
      {toast&&<Toast msg={toast.msg} type={toast.type} onUndo={toast.onUndo}/>}

      {showAddLead&&(
        <AddLeadForm
          dark={dark} T={T} IS={IS}
          leadForm={leadForm} setLeadForm={setLeadForm}
          geoPlatforms={addPlatforms} myGeos={myGeos} activeGeo={activeGeo}
          onSubmit={addLead} onClose={()=>setShowAddLead(false)}
        />
      )}

      {showAutomation&&(
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
          <div className="slide-in" style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:24,width:"100%",maxWidth:780,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,.7)" }}>
            <h3 style={{ color:T.text,marginBottom:4,fontSize:15,fontWeight:700 }}>Предпросмотр автоматизации</h3>
            <p style={{ color:T.muted,fontSize:13,marginBottom:18 }}>РД распределены для достижения целевого СЧ платформы</p>
            {automationPreview.length===0?<p style={{ color:T.muted }}>Нет лидов для автоматизации</p>:(
              <div style={{ border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden",marginBottom:18,overflowX:"auto" }}>
                <table style={{ width:"100%",borderCollapse:"collapse" }}>
                  <thead><tr style={{ background:T.thBg }}>{["Лид","Платформа","РД1","РД2","РД3","РД4","РД5","РД6","РД7","РД8","РД9","СЧ"].map(h=><th key={h} style={{ padding:"7px 8px",textAlign:"left",fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",borderBottom:`1px solid ${T.border}` }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {automationPreview.map(item=>{
                      const rdArr=Array(9).fill(null).map((_,i)=>item.rdPlan.find(r=>r.rd_number===i+1)||null);
                      const platPrev=automationPreview.filter(x=>x.plat.id===item.plat.id);
                      const platCur=platPrev.reduce((s,x)=>s+calcEffectiveTotal(x.player),0);
                      const platAdd=platPrev.reduce((s,x)=>s+x.rdPlan.reduce((a,r)=>a+r.amount,0),0);
                      const newSch=platPrev.length>0?(platCur+platAdd)/platPrev.length:0;
                      const ok=newSch>=item.plat.target_avg_check;
                      return(
                        <tr key={item.player.id}>
                          <td style={{ padding:"7px 8px",color:T.text,fontSize:12,fontWeight:500,borderBottom:`1px solid ${T.rowBorder}` }}>{item.player.name}</td>
                          <td style={{ padding:"7px 8px",color:T.sub,fontSize:11,borderBottom:`1px solid ${T.rowBorder}` }}>{item.plat.name}</td>
                          {rdArr.map((rd,i)=><td key={i} style={{ padding:"5px 4px",textAlign:"center",fontSize:11,borderBottom:`1px solid ${T.rowBorder}`,color:rd?"#818cf8":T.border }}>{rd?<div><div style={{ fontWeight:600 }}>{rd.amount}€</div><div style={{ fontSize:9,color:T.muted }}>{rd.date?(([y,m,d])=>`${d}.${m}`)(rd.date.split("-")):"—"}</div></div>:"—"}</td>)}
                          <td style={{ padding:"7px 8px",borderBottom:`1px solid ${T.rowBorder}` }}><span style={{ background:ok?"linear-gradient(135deg,#14532d,#166534)":"linear-gradient(135deg,#7f1d1d,#991b1b)",color:ok?"#86efac":"#fca5a5",padding:"2px 7px",borderRadius:5,fontWeight:700,fontSize:11 }}>{newSch.toFixed(1)}€</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={applyAutomation} className="btn-p" style={{ flex:1,padding:"10px",fontSize:14 }}>Применить</button>
              <button onClick={genAutomation} className="btn-a" style={{ flex:1,padding:"10px",fontSize:14 }}>Перегенерировать</button>
              <button onClick={()=>setShowAutomation(false)} className="btn-g" style={{ flex:1,border:`1px solid ${T.border}`,color:T.sub,padding:"10px",borderRadius:8,cursor:"pointer" }}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      <header style={{ position:"sticky",top:0,zIndex:300,height:52,background:T.hdrBg,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",padding:"0 20px",gap:10 }}>
        <span style={{ fontSize:11,fontWeight:700,fontFamily:THEME.fontGilroy,background:THEME.gradSoft,color:"#c8a8ff",padding:"3px 9px",borderRadius:50,letterSpacing:".05em",border:"1px solid rgba(155,79,224,.3)" }}>{isTeamLead?"ТИМ ЛИД":"МЕНЕДЖЕР"}</span>
        <span style={{ color:T.muted,fontSize:13 }}>/ <b style={{ color:T.sub,fontWeight:500 }}>{manager.name}</b></span>
        <div style={{ flex:1 }}/>
        <button onClick={()=>{ genAutomation(); setShowAutomation(true); }} className="btn-g" style={{ height:36,display:"inline-flex",alignItems:"center",gap:7,padding:"0 16px",fontSize:13 }}>⚡ Автоматизация</button>
        <button onClick={runSverka} className="btn-g" style={{ height:36,display:"inline-flex",alignItems:"center",gap:7,padding:"0 16px",fontSize:13 }}>🔍 Сверка</button>
        <button onClick={()=>setShowAddLead(true)} className="btn-p" style={{ height:36,display:"inline-flex",alignItems:"center",gap:7,padding:"0 18px",fontSize:13 }}>+ Добавить лида</button>
      </header>

      {tab==="main"&&(
        <div style={{ padding:"16px 20px" }}>
          {todayRds.length>0&&(
            <div style={{ background:T.alertBg,border:`1px solid ${T.alertBorder}`,borderRadius:10,padding:"10px 16px",display:"flex",alignItems:"center",gap:8,marginBottom:14,flexWrap:"wrap" }}>
              <span className="alert-pulse" style={{ fontSize:18 }}>🔔</span>
              <span style={{ color:"#d97706",fontWeight:700,fontSize:13,marginRight:2 }}>Сегодня нужно сделать РД:</span>
              {todayRds.flatMap(p=>{
                const plat=platforms.find(pl=>pl.id===p.platform_id);
                return (plannedRds||[]).filter(r=>r&&r.player_id===p.id&&r.date===today).map(r=>(
                  <span key={`${p.id}-${r.rd_number}`} onClick={()=>goToLead(p)} className="row-hover" title="Перейти к лиду" style={{ cursor:"pointer",color:"#fbbf24",fontSize:12,fontWeight:600,background:"rgba(217,119,6,.12)",border:"1px solid rgba(217,119,6,.35)",borderRadius:6,padding:"2px 8px" }}>
                    {p.name} · {plat?.name||"—"} · РД{r.rd_number}{r.amount!=null?` · ${r.amount}€`:""}
                  </span>
                ));
              })}
            </div>
          )}
          <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:12,flexWrap:"wrap" }}>
            <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="🔍 Поиск по имени / SUB18" style={{ ...IS,width:220 }}/>
            <select value={filterPlatform} onChange={e=>setFilterPlatform(e.target.value)} style={{ background:T.surface,border:`1px solid ${T.border}`,color:T.sub,padding:"7px 10px",borderRadius:7,fontSize:12,outline:"none" }}>
              <option value="">Все платформы</option>
              {geoPlatforms.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ background:T.surface,border:`1px solid ${T.border}`,color:T.sub,padding:"7px 10px",borderRadius:7,fontSize:12,outline:"none" }}>
              <option value="">Все статусы</option>
              {STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
            <span style={{ color:T.muted,fontSize:12,marginLeft:"auto" }}>Показано: <strong style={{ color:T.text }}>{filteredPlayers.length}</strong></span>
          </div>
          <PlayersTable players={sortedPlayers} redeposits={redeposits} plannedRds={plannedRds} platforms={platforms} manager={manager} dark={dark} readonly={false} onReload={load} showToast={showToast} excludedIds={excludedIds} setExcludedIds={setExcludedIds} isPoland={myGeos.find(g=>g.id===activeGeo)?.code==='PL'} highlightId={highlightId}/>
        </div>
      )}

      {tab==="tasks"&&(
        <div style={{ padding:"16px 20px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap" }}>
            <h2 style={{ color:T.text,fontSize:18,margin:0 }}>Задачи и просрочки</h2>
            <select value={todoPlatFilter} onChange={e=>setTodoPlatFilter(e.target.value)} style={{ background:T.surface,border:`1px solid ${T.border}`,color:T.sub,padding:"5px 10px",borderRadius:7,fontSize:12,outline:"none" }}>
              <option value="">Все платформы</option>
              {geoPlatforms.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {isTeamLead&&(
              <select value={todoMgrFilter} onChange={e=>setTodoMgrFilter(e.target.value)} style={{ background:T.surface,border:`1px solid ${T.border}`,color:T.sub,padding:"5px 10px",borderRadius:7,fontSize:12,outline:"none" }}>
                <option value="">Все менеджеры</option>
                {allManagers.filter(m=>userGeos.some(ug=>ug.geo_id===activeGeo&&ug.manager_id===m.id)).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            )}
            <input type="date" value={todoDate} onChange={e=>setTodoDate(e.target.value)} style={{ background:T.surface,border:`1px solid ${T.border}`,color:T.sub,padding:"5px 10px",borderRadius:7,fontSize:12,outline:"none",colorScheme:"dark" }}/>
            {todoDate&&<button onClick={()=>setTodoDate("")} style={{ background:"transparent",border:`1px solid ${T.border}`,color:T.muted,padding:"5px 10px",borderRadius:7,cursor:"pointer",fontSize:12 }}>Сегодня</button>}
          </div>
          <div style={{ display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-start" }}>
            <div style={{ flex:"1 1 360px",minWidth:300 }}>
              <h3 style={{ color:"#a5b4fc",fontSize:14,margin:"0 0 10px" }}>📋 Задачи на {todoDate?new Date(todoDate+"T00:00:00").toLocaleDateString("ru",{day:"2-digit",month:"2-digit"}):"сегодня"}</h3>
              {(()=>{
                const taskDate = todoDate || today;
                const sourcePlayers=(isTeamLead
                  ? allPlayers.filter(p=>p&&p.status==="Да"&&userGeos.filter(ug=>ug.geo_id===activeGeo).map(ug=>ug.manager_id).includes(p.manager_id))
                  : players.filter(p=>p.status==="Да")
                ).filter(p=>geoPlatforms.some(gp=>gp.id===p.platform_id));
                const tasks=sourcePlayers.flatMap(p=>{
                  const plat=platforms.find(pl=>pl.id===p.platform_id);
                  const mgr=allManagers.find(m=>m.id===p.manager_id);
                  return plannedRds.filter(r=>r&&r.player_id===p.id&&r.date===taskDate).map(r=>({ player:p, plat, mgr, rdNum:r.rd_number, amount:r.amount }));
                }).filter(t=>{
                  if(todoPlatFilter&&t.plat?.id!==todoPlatFilter) return false;
                  if(todoMgrFilter&&t.player?.manager_id!==todoMgrFilter) return false;
                  return true;
                });
                if(tasks.length===0) return <div style={{ color:T.muted,fontSize:13,padding:"16px 0" }}>Задач на этот день нет</div>;
                return tasks.map(({player,plat,mgr,rdNum,amount},idx)=>(
                  <div key={`t-${player.id}-${rdNum}-${idx}`} onClick={()=>goToLead(player)} className="row-hover" style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:8,cursor:"pointer" }}>
                    <div style={{ width:8,height:8,borderRadius:"50%",background:"#6366f1",flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <span style={{ fontWeight:700,color:T.text,fontSize:14 }}>{player.name}</span>
                        {isTeamLead&&mgr&&<span style={{ fontSize:11,color:"#a5b4fc",background:"rgba(99,102,241,.1)",padding:"1px 6px",borderRadius:4 }}>{mgr.name}</span>}
                      </div>
                      <div style={{ fontSize:12,color:T.muted }}>{plat?.name||"—"} · РД{rdNum}</div>
                    </div>
                    {amount!=null&&<div style={{ fontSize:14,fontWeight:700,color:"#a5b4fc" }}>{amount}€</div>}
                  </div>
                ));
              })()}
            </div>
            <div style={{ flex:"1 1 360px",minWidth:300 }}>
              <h3 style={{ color:"#fca5a5",fontSize:14,margin:"0 0 10px" }}>⚠️ Просроченные</h3>
              {(()=>{
                const source=(isTeamLead
                  ? allPlayers.filter(p=>p&&overdueDatesByPlayer[p.id]&&p.status==="Да"&&userGeos.filter(ug=>ug.geo_id===activeGeo).map(ug=>ug.manager_id).includes(p.manager_id))
                  : overdueRds
                ).filter(p=>geoPlatforms.some(gp=>gp.id===p.platform_id));
                const filtered=source.filter(p=>{
                  if(todoPlatFilter&&p.platform_id!==todoPlatFilter) return false;
                  if(todoMgrFilter&&p.manager_id!==todoMgrFilter) return false;
                  return true;
                }).sort((a,b)=>new Date(overdueDatesByPlayer[a.id])-new Date(overdueDatesByPlayer[b.id]));
                if(filtered.length===0) return <div style={{ color:T.muted,fontSize:13,padding:"16px 0" }}>✅ Нет просроченных РД</div>;
                return filtered.map(player=>{
                  const plat=platforms.find(p=>p.id===player.platform_id);
                  const mgr=allManagers.find(m=>m.id===player.manager_id);
                  const od=overdueDatesByPlayer[player.id];
                  const days=Math.floor((new Date(today)-new Date(od))/(1000*60*60*24));
                  const planned=plannedRds.filter(r=>r&&r.player_id===player.id&&r.date<today).sort((a,b)=>a.rd_number-b.rd_number)[0];
                  return(
                    <div key={`o-${player.id}`} onClick={()=>goToLead(player)} className="row-hover" style={{ background:"rgba(239,68,68,.06)",border:"1px solid #7f1d1d",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:8,cursor:"pointer" }}>
                      <div style={{ width:8,height:8,borderRadius:"50%",background:"#ef4444",flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                          <span style={{ fontWeight:700,color:T.text,fontSize:14 }}>{player.name}</span>
                          {isTeamLead&&mgr&&<span style={{ fontSize:11,color:"#a5b4fc",background:"rgba(99,102,241,.1)",padding:"1px 6px",borderRadius:4 }}>{mgr.name}</span>}
                        </div>
                        <div style={{ fontSize:12,color:T.muted }}>{plat?.name||"—"}{planned?` · РД${planned.rd_number}`:""} · {od?(([y,m,d])=>`${d}.${m}`)(od.split("-")):""}</div>
                      </div>
                      <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2 }}>
                        {planned&&<span style={{ fontSize:13,fontWeight:700,color:"#fca5a5" }}>{planned.amount}€</span>}
                        <span style={{ background:"linear-gradient(135deg,#7f1d1d,#991b1b)",color:"#fca5a5",padding:"1px 7px",borderRadius:6,fontWeight:700,fontSize:11 }}>{days} дн.</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {tab==="team"&&(
        <div style={{ padding:"16px 20px" }}>
          <h2 style={{ color:T.text,marginBottom:16,fontSize:18 }}>Команда</h2>
          {myGeos.filter(geo=>geo&&geo.id===activeGeo).map(geo=>{
            const geoManagerIds=userGeos.filter(ug=>ug&&ug.geo_id===geo.id&&ug.manager_id).map(ug=>ug.manager_id);
            const geoManagers2=allManagers.filter(m=>m&&m.id!==manager.id&&geoManagerIds.includes(m.id));
            const viewing=(viewingManager||{})[geo.id]||null;
            return(
              <div key={geo.id}>
                <div style={{ display:"flex",gap:10,flexWrap:"wrap",marginBottom:16 }}>
                  {geoManagers2.map(m=>{
                    const mPlayers=allPlayers.filter(p=>p&&p.id&&p.manager_id===m.id);
                    const mActive=mPlayers.filter(p=>p.status==="Да");
                    const total=mActive.reduce((s,p)=>s+calcEffectiveTotal(p),0);
                    const avg=mActive.length>0?total/mActive.length:0;
                    const isViewing=viewing===m.id;
                    return(
                      <div key={m.id} onClick={()=>setViewingManager(prev=>({...prev,[geo.id]:isViewing?null:m.id}))} style={{ background:isViewing?"linear-gradient(135deg,#1e3a5f,#1e2235)":T.surface,border:`1px solid ${isViewing?"#6366f1":T.border}`,borderRadius:10,padding:"12px 16px",cursor:"pointer",transition:"all .2s",minWidth:160 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:6 }}>
                          <div style={{ width:7,height:7,borderRadius:"50%",background:m.role==="team_lead"?"#14b8a6":"#6366f1" }}/>
                          <span style={{ fontWeight:700,color:T.text,fontSize:13 }}>{m.name}</span>
                        </div>
                        <div style={{ fontSize:11,color:T.muted }}>СЧ: <strong style={{ color:avg>0?"#86efac":T.muted }}>{avg>0?avg.toFixed(1)+"€":"—"}</strong></div>
                      </div>
                    );
                  })}
                </div>
                {viewing&&(
                  <div>
                    <PlayersTable
                      players={allPlayers.filter(p=>p&&p.id&&p.manager_id===viewing&&!hiddenPlatIds.has(p.platform_id))}
                      redeposits={redeposits} plannedRds={plannedRds} platforms={platforms}
                      manager={manager} dark={dark} readonly={!isTeamLead}
                      onReload={load} showToast={showToast} highlightId={highlightId}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab==="report"&&(
        <div style={{ padding:"16px 20px" }}>
          {(()=>{
            const myGeoIds=new Set(myGeos.map(g=>g.id));
            const accessibleMgrIds=new Set(userGeos.filter(ug=>myGeoIds.has(ug.geo_id)).map(ug=>ug.manager_id));
            const scopedPlayers=allPlayers.filter(p=>accessibleMgrIds.has(p.manager_id));
            const scopedMgrs=allManagers.filter(m=>accessibleMgrIds.has(m.id));
            return <ReportView players={scopedPlayers} redeposits={redeposits} platforms={platforms} managers={scopedMgrs} geos={myGeos} userGeos={userGeos} dark={dark}/>;
          })()}
        </div>
      )}

      {tab==="history"&&(
        <div style={{ padding:"16px 20px" }}>
          {(()=>{
            const myGeoIds=new Set(myGeos.map(g=>g.id));
            const accessibleMgrIds=new Set(userGeos.filter(ug=>myGeoIds.has(ug.geo_id)).map(ug=>ug.manager_id));
            const scopedLogs=activityLog.filter(l=>accessibleMgrIds.has(l.manager_id));
            const scopedMgrs=allManagers.filter(m=>accessibleMgrIds.has(m.id));
            return <HistoryView logs={scopedLogs} managers={scopedMgrs} geos={myGeos} userGeos={userGeos} dark={dark} onLeadClick={(pid)=>{ const pl=allPlayers.find(x=>x.id===pid); if(pl) goToLead(pl); }}/>;
          })()}
        </div>
      )}

      {tab==="platforms"&&(
        <div style={{ padding:"16px 20px" }}>
          <h2 style={{ color:T.text,fontSize:18,margin:"0 0 16px" }}>Платформы</h2>
          <div style={{ border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead><tr>{["Платформа","Дата","Мин. деп","Цель СЧ","Капа","Лидов","СЧ факт","Нужно добрать"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {platformStats.filter(p=>p.geo_id===activeGeo).map(p=>{
                  const ok=p.avgCheck>=p.target_avg_check;
                  return(
                    <tr key={p.id} className="row-hover">
                      <td style={{ ...S.td,fontWeight:600,color:T.text }}>{p.name}</td>
                      <td style={{ ...S.td,color:T.sub,fontSize:12 }}>{p.date_added||"—"}</td>
                      <td style={{ ...S.td,color:T.sub }}>{p.min_deposit||"—"}€</td>
                      <td style={S.td}><span style={{ background:"linear-gradient(135deg,#1e3a5f,#1e40af)",color:"#93c5fd",padding:"2px 9px",borderRadius:6,fontWeight:700,fontSize:11 }}>{p.target_avg_check}€</span></td>
                      <td style={{ ...S.td,color:T.sub }}>{p.cap||"—"}</td>
                      <td style={{ ...S.td,color:"#a5b4fc",fontWeight:700 }}>{p.totalCount}</td>
                      <td style={S.td}>{p.totalCount>0?<span style={{ background:ok?"linear-gradient(135deg,#14532d,#166534)":"linear-gradient(135deg,#7f1d1d,#991b1b)",color:ok?"#86efac":"#fca5a5",padding:"2px 9px",borderRadius:6,fontWeight:700,fontSize:11 }}>{p.avgCheck.toFixed(1)}€</span>:<span style={{ color:T.muted }}>—</span>}</td>
                      <td style={{ ...S.td,color:"#f59e0b",fontWeight:700 }}>{p.totalCount>0?p.needMore.toFixed(0)+"€":"—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==="overview"&&(
        <div style={{ padding:"16px 20px" }}>
          <h2 style={{ color:T.text,marginBottom:20,fontSize:18 }}>Сводка</h2>
        </div>
      )}

      {tab==="activity"&&isTeamLead&&(()=>{
        const now=Date.now();
        const isToday=dayDate===P.todayStr();
        const byPres={}; crmPresence.forEach(u=>{ byPres[String(u.id)]=u; });
        const loginInfo=(m)=>{ const u=m.crm_user_id?byPres[String(m.crm_user_id)]:null; const ts=u&&u.last_logged_at; if(!ts) return {txt:"—",c:T.muted}; const d=new Date(ts); const days=Math.floor((now-d.getTime())/86400000); const isTd=d.toDateString()===new Date().toDateString(); return { txt:isTd?"сегодня "+d.toLocaleTimeString("ru",{hour:"2-digit",minute:"2-digit"}):d.toLocaleDateString("ru",{day:"2-digit",month:"2-digit"})+(days>0?" ("+days+" дн)":""), c:isTd?"#16a34a":days>=3?"#dc2626":T.sub }; };
        const liveNow=(m)=>{ if(!isToday) return false; const u=m.crm_user_id?crmMsgs[String(m.crm_user_id)]:null; const ts=u&&u.last_outgoing_at; return ts&&((now-new Date(ts).getTime())/60000<=15); };
        const dayFor=(m)=>{ const ev=[...((m.crm_user_id&&dayData[String(m.crm_user_id)])||[]), ...((dayTracker[m.id])||[])]; return P.computeSessions(ev,20); };
        const teamMgrs=allManagers.filter(m=>userGeos.some(ug=>ug.geo_id===activeGeo&&ug.manager_id===m.id));
        return (
          <div style={{ padding:"16px 20px",maxWidth:980 }}>
            <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:18,flexWrap:"wrap" }}>
              <h2 style={{color:T.text,margin:0,fontSize:18}}>Активность менеджеров</h2>
              <input type="date" value={dayDate} max={P.todayStr()} onChange={e=>{ setDayDate(e.target.value); setExpandedId(null); loadDay(e.target.value); }} style={{ background:T.inputBg,border:`1px solid ${T.border}`,color:T.text,padding:"6px 10px",borderRadius:8,fontSize:12,outline:"none",colorScheme:"dark" }}/>
              <button onClick={()=>{ loadCrmPresence(); loadCrmMsgs(); loadDay(); }} disabled={dayBusy} style={{ background:dayBusy?T.border:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",padding:"7px 14px",borderRadius:8,cursor:dayBusy?"default":"pointer",fontSize:12,fontWeight:700 }}>{dayBusy?"Считаю…":"Обновить"}</button>
            </div>
            <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden" }}>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead><tr>{["Менеджер","Отработал","Первая","Последняя","Отсутствие","Вход в CRM"].map(h=><th key={h} style={{ ...S.th,fontSize:10 }}>{h}</th>)}</tr></thead>
                <tbody>
                  {teamMgrs.map(m=>{
                    const li=loginInfo(m); const s=dayFor(m); const live=liveNow(m); const open=expandedId===m.id;
                    return (
                      <Fragment key={m.id}>
                        <tr>
                          <td style={{ ...S.td,fontWeight:600,color:T.text }}>{m.name}{live&&<span style={{ color:"#16a34a",fontSize:11,marginLeft:6 }}>● сейчас</span>}</td>
                          <td style={{ ...S.td,color:s.activeMin>0?"#16a34a":T.muted,fontWeight:700 }}>{s.count>0?P.fmtDur(s.activeMin):"—"}</td>
                          <td style={{ ...S.td,color:T.sub }}>{P.fmtTime(s.first)}</td>
                          <td style={{ ...S.td,color:T.sub }}>{P.fmtTime(s.last)}</td>
                          <td style={{ ...S.td,cursor:s.gaps.length?"pointer":"default",color:s.gaps.length?"#d97706":T.muted }} onClick={()=>s.gaps.length&&setExpandedId(open?null:m.id)}>{s.gaps.length?`${s.gaps.length} · ${P.fmtDur(s.idleMin)} ${open?"▲":"▼"}`:"—"}</td>
                          <td style={{ ...S.td,color:li.c,fontSize:12 }}>{li.txt}</td>
                        </tr>
                        {open&&s.gaps.length>0&&(
                          <tr><td colSpan={6} style={{ background:"#15171f",borderBottom:`1px solid ${T.border}`,padding:"10px 16px" }}>
                            <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                              {s.gaps.map((g,i)=><span key={i} style={{ background:"rgba(217,119,6,.1)",border:"1px solid #b45309",color:"#d97706",padding:"4px 10px",borderRadius:6,fontSize:12 }}>{P.fmtInterval(g)} · {P.fmtDur(g.min)}</span>)}
                            </div>
                          </td></tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
      </div>
    </div>
  );
}
