import { useState, useEffect, useRef, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "../supabaseClient";
import { STATUSES, LEAD_COLORS, CSS } from "../constants";
import { getStatusStyle, StatusBadge, StatusPopup, ColorPopup, Toast } from "../components/common";
import { PlayersTable } from "../components/PlayersTable";
import { AddLeadForm } from "../components/AddLeadForm";
import { HistoryView } from "../components/HistoryView";
import { ReportView } from "../components/ReportView";
import * as P from "../presence";

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
  useEffect(()=>{ if(tab==="activity"&&isTeamLead&&crmActivity.length===0&&!crmBusy) loadCrmActivity(); if(tab==="activity"&&isTeamLead&&crmUsers.length===0) loadCrmUsers(); },[tab]);

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

  // Managers in active geo
  const geoManagers = activeGeo ? (() => {
    // Get all manager ids in this geo
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

      // Строим пул слотов — каждый лид может получить от 0 до (9 - уже_есть_РД) РД
      const plans=pps.map(p=>({
        player:p,
        existing:getPlayerRds(p.id),
        slots:9-getPlayerRds(p.id).length,
        amts:[]
      })).filter(pp=>pp.slots>0);
      if(!plans.length) return;

      // Ищем лучшее распределение за 300 попыток
      let best=null, bestDiff=Infinity;
      for(let a=0;a<300;a++){
        plans.forEach(pp=>pp.amts=[]);
        let rem=needed;

        // Перемешиваем планы рандомно чтобы разные лиды получали разное кол-во РД
        const shuffled=[...plans].sort(()=>Math.random()-.5);

        for(let r=0;r<9&&rem>0;r++){
          for(const pp of shuffled){
            if(pp.amts.length>=pp.slots||rem<=0) continue;
            const min=getMinDeposit(plat,pp.player);
            const amt=genRdAmount(min);
            // Не добавляем больше чем осталось нужно
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
        // Растягиваем на 30 дней с даты депозита
        const periodDays=30;
        const step=Math.floor(periodDays/pp.amts.length);
        // Сортируем суммы по возрастанию чтобы не повторялись подряд
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
    const status=form.status; // всегда берём статус из формы
    let color="none";
    if(form.name||form.sub18){
      const existing=allPlayers.find(p=>p&&((form.name&&p.name===form.name)||(form.sub18&&p.sub18===form.sub18)));
      if(existing){ color=existing.color||"none"; } // только цвет берём из существующего
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
      // keitaro-имя -> id менеджера
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
      // все конверсии гео (без фильтра по менеджеру) — для подсказки про перепутанную платформу
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
      // загруженные исключения
      const { data: ign } = await supabase.from("sverka_ignored").select("*");
      const ignored = ign||[];
      const ignSet = new Set(ignored.map(r=>`${r.list_type}|${(r.sub18||"").toLowerCase()}|${r.platform_id||""}`));
      const notIgn = (lt,sub,platId)=>!ignSet.has(`${lt}|${(sub||"").toLowerCase()}|${platId||""}`);
      const notInTracker = [...ktPairs.values()].filter(c=>c.convMgrId).filter(c=>!leadByPair.has(c.sub18+"|"+c.platId)).filter(c=>notIgn("not_in_tracker",c.sub18,c.platId));
      const notInTrackerUnknown = [...ktPairs.values()].filter(c=>!c.convMgrId).filter(c=>!leadByPair.has(c.sub18+"|"+c.platId)).filter(c=>notIgn("not_in_tracker",c.sub18,c.platId));
      const checkSub = geoLeads.filter(p=>p.status==="Да" && !ktKeys.has((p.sub18||"").trim().toLowerCase()+"|"+p.platform_id))
        .map(p=>{
          const sub=(p.sub18||"").trim().toLowerCase();
          // деп этого sub есть на ДРУГОЙ платформе, и под ту платформу лида в трекере нет → перепутана платформа
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

  const T = dark ? { bg:"#0f1117",surface:"#1a1d27",border:"#2d3148",text:"#e2e8f0",muted:"#64748b",sub:"#94a3b8",navBg:"#151824",hdrBg:"#1a1d27",inputBg:"#0f1117",alertBg:"#1c160a",alertBorder:"#d97706",thBg:"#151824",rowBorder:"#1e2235" }
    : { bg:"#eef0f5",surface:"#f5f6fa",border:"#dde1ea",text:"#1e293b",muted:"#94a3b8",sub:"#64748b",navBg:"#f0f2f7",hdrBg:"#f0f2f7",inputBg:"#e8eaf0",alertBg:"#fffbeb",alertBorder:"#fcd34d",thBg:"#e8eaf0",rowBorder:"#e2e6ef" };
  const IS = { background:T.inputBg,border:`1px solid ${T.border}`,color:T.text,padding:"8px 10px",borderRadius:7,fontSize:13,outline:"none",width:"100%",boxSizing:"border-box" };
  const S = { th:{ padding:"9px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".07em",borderBottom:`1px solid ${T.border}`,background:T.thBg },td:{ padding:"10px 12px",borderBottom:`1px solid ${T.rowBorder}`,verticalAlign:"middle" } };

  return (
    <div style={{ minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Inter',sans-serif" }}>
      <style>{CSS}</style>
      {toast&&<Toast msg={toast.msg} type={toast.type} onUndo={toast.onUndo}/>}

      {showSverka&&(
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:20,overflowY:"auto" }} onClick={e=>e.target===e.currentTarget&&setShowSverka(false)}>
          <div className="slide-in" style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:22,width:"100%",maxWidth:720,marginTop:30,boxShadow:"0 24px 64px rgba(0,0,0,.6)" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
              <h3 style={{ color:T.text,fontSize:16,fontWeight:700,margin:0 }}>Сверка с Keitaro</h3>
              <div style={{ display:"flex",gap:8 }}>
                <button onClick={runSverka} disabled={sverkaLoading} className="btn-g" style={{ border:`1px solid ${T.border}`,color:T.sub,padding:"5px 12px",borderRadius:7,cursor:"pointer",fontSize:12 }}>{sverkaLoading?"Загрузка…":"Обновить"}</button>
                <button onClick={()=>setShowSverka(false)} className="btn-g" style={{ border:`1px solid ${T.border}`,color:T.sub,padding:"5px 12px",borderRadius:7,cursor:"pointer",fontSize:12 }}>Закрыть</button>
              </div>
            </div>
            <p style={{ color:T.muted,fontSize:12,margin:"0 0 16px" }}>Гео: {myGeos.find(g=>g.id===activeGeo)?.name||"—"} · за текущий месяц · только депозиты (Sale){sverkaData&&!sverkaData.error?` · ${sverkaData.scope==="свои"?"мои лиды":"всё гео"}`:""}</p>
            {sverkaLoading&&<div style={{ color:T.muted,fontSize:13,padding:"24px 0",textAlign:"center" }}>Запрашиваю Keitaro…</div>}
            {!sverkaLoading&&sverkaData?.error&&<div style={{ color:"#fca5a5",fontSize:13,padding:"16px",background:"rgba(239,68,68,.08)",border:"1px solid #7f1d1d",borderRadius:8 }}>Ошибка: {sverkaData.error}</div>}
            {!sverkaLoading&&sverkaData&&!sverkaData.error&&(()=>{
              const card={ border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden",marginBottom:16 };
              return (
                <div>
                  <div style={{ color:T.muted,fontSize:11,marginBottom:14 }}>Конверсий из Keitaro за период: {sverkaData.total}</div>
                  <div style={card}>
                    <div style={{ padding:"10px 14px",background:"rgba(239,68,68,.08)",color:"#fca5a5",fontWeight:700,fontSize:13 }}>❗ Не заведён в трекере ({sverkaData.notInTracker.length})</div>
                    {sverkaData.notInTracker.length===0&&<div style={{ padding:"12px 14px",color:T.muted,fontSize:12 }}>Все депозиты из Keitaro заведены ✅</div>}
                    {sverkaData.notInTracker.map((c,i)=>(
                      <div key={i} style={{ display:"flex",justifyContent:"space-between",gap:12,padding:"9px 14px",borderTop:`1px solid ${T.rowB}`,flexWrap:"wrap",fontSize:12 }}>
                        <span style={{ color:T.text,fontWeight:600 }}>{c.platName} <span style={{color:T.muted,fontWeight:400}}>· {c.manager}</span></span>
                        <span style={{ color:T.sub,fontFamily:"monospace" }}>{c.sub18}</span>
                        <span style={{ color:T.muted }}>{c.revenue}€ · {(c.datetime||"").slice(5,16)} · {c.source}</span>
                        {sverkaData.isTL&&<button onClick={()=>ignoreSverkaItem("not_in_tracker",c.sub18,c.platId)} title="Исключить из сверки" style={{ background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:14,padding:"0 2px",lineHeight:1 }}>✕</button>}
                      </div>
                    ))}
                  </div>
                  {(sverkaData.notInTrackerUnknown||[]).length>0&&(
                    <div style={card}>
                      <div onClick={()=>setShowUnknownDep(v=>!v)} style={{ padding:"10px 14px",color:T.sub,fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                        <span>❓ Не заведён · менеджер не распознан ({sverkaData.notInTrackerUnknown.length})</span>
                        <span style={{ color:T.muted,fontSize:11 }}>{showUnknownDep?"▲":"▼"}</span>
                      </div>
                      <div style={{ padding:"0 14px 6px",color:T.muted,fontSize:11 }}>Депозиты без лида, чей менеджер в кампании Keitaro не привязан к keitaro-имени. Впиши имя из хвоста в нужного менеджера — деп уйдёт в основной список.</div>
                      {showUnknownDep&&sverkaData.notInTrackerUnknown.map((c,i)=>(
                        <div key={i} style={{ display:"flex",justifyContent:"space-between",gap:12,padding:"9px 14px",borderTop:`1px solid ${T.rowB}`,flexWrap:"wrap",fontSize:12 }}>
                          <span style={{ color:T.text,fontWeight:600 }}>{c.platName} <span style={{color:"#fca5a5",fontWeight:600}}>· {c.manager}</span></span>
                          <span style={{ color:T.sub,fontFamily:"monospace" }}>{c.sub18}</span>
                          <span style={{ color:T.muted }}>{c.revenue}€ · {(c.datetime||"").slice(5,16)} · {c.source}</span>
                          {sverkaData.isTL&&<button onClick={()=>ignoreSverkaItem("not_in_tracker",c.sub18,c.platId)} title="Исключить из сверки" style={{ background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:14,padding:"0 2px",lineHeight:1 }}>✕</button>}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={card}>
                    <div style={{ padding:"10px 14px",background:"rgba(251,191,36,.08)",color:"#fcd34d",fontWeight:700,fontSize:13 }}>⚠ Проверь sub18 ({sverkaData.checkSub.length})</div>
                    <div style={{ padding:"6px 14px",color:T.muted,fontSize:11 }}>Лиды со статусом «Да», по которым нет депозита в Keitaro</div>
                    {sverkaData.checkSub.length===0&&<div style={{ padding:"12px 14px",color:T.muted,fontSize:12 }}>Все «Да» подтверждены в Keitaro ✅</div>}
                    {sverkaData.checkSub.map((p,i)=>(
                      <div key={i} onClick={()=>sverkaGoToLead(p.pid,p.mgrId)} className="row-hover" style={{ display:"flex",justifyContent:"space-between",gap:12,padding:"9px 14px",borderTop:`1px solid ${T.rowB}`,flexWrap:"wrap",fontSize:12,cursor:"pointer" }}>
                        <span style={{ color:T.text,fontWeight:600 }}>{p.name} <span style={{ color:"#fcd34d",fontWeight:400 }}>· {p.mgr}</span></span>
                        <span style={{ color:T.sub,fontFamily:"monospace" }}>{p.sub18}</span>
                        <span style={{ color:T.muted }}>{p.platName}</span>
                        {sverkaData.isTL&&<button onClick={e=>{ e.stopPropagation(); ignoreSverkaItem("check_sub",p.sub18,p.platId); }} title="Исключить из сверки" style={{ background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:14,padding:"0 2px",lineHeight:1 }}>✕</button>}
                        {p.hint&&<span style={{ flexBasis:"100%",color:"#fca5a5",fontSize:11,marginTop:2 }}>⚠ возможно, перепутана платформа — в Keitaro деп на: <b>{p.hint}</b></span>}
                      </div>
                    ))}
                  </div>
                  {sverkaData.wrongMgr&&sverkaData.wrongMgr.length>0&&(
                    <div style={card}>
                      <div style={{ padding:"10px 14px",background:"rgba(168,85,247,.1)",color:"#c4b5fd",fontWeight:700,fontSize:13 }}>↪ Лид не на том менеджере ({sverkaData.wrongMgr.length})</div>
                      <div style={{ padding:"6px 14px",color:T.muted,fontSize:11 }}>sub18 и платформа сошлись, но в Keitaro деп на другого менеджера</div>
                      {sverkaData.wrongMgr.map((p,i)=>(
                        <div key={i} onClick={()=>sverkaGoToLead(p.pid,p.mgrId)} className="row-hover" style={{ display:"flex",justifyContent:"space-between",gap:12,padding:"9px 14px",borderTop:`1px solid ${T.rowB}`,flexWrap:"wrap",fontSize:12,cursor:"pointer" }}>
                          <span style={{ color:T.text,fontWeight:600 }}>{p.name} <span style={{color:T.muted,fontWeight:400,fontFamily:"monospace"}}>{p.sub18}</span></span>
                          <span style={{ color:T.muted }}>{p.platName}</span>
                          <span style={{ color:T.sub }}>трекер: <b style={{color:T.text}}>{p.trackerMgr}</b> · Keitaro: <b style={{color:"#c4b5fd"}}>{p.keitaroMgr}</b></span>
                          {sverkaData.isTL&&<button onClick={e=>{ e.stopPropagation(); ignoreSverkaItem("wrong_mgr",p.sub18,p.platId); }} title="Исключить из сверки" style={{ background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:14,padding:"0 2px",lineHeight:1 }}>✕</button>}
                        </div>
                      ))}
                    </div>
                  )}
                  {sverkaData.statusMismatch&&sverkaData.statusMismatch.length>0&&(
                    <div style={card}>
                      <div style={{ padding:"10px 14px",background:"rgba(34,197,94,.1)",color:"#86efac",fontWeight:700,fontSize:13 }}>✔ Есть деп, но статус не «Да» ({sverkaData.statusMismatch.length})</div>
                      <div style={{ padding:"6px 14px",color:T.muted,fontSize:11 }}>В Keitaro деп подтверждён, а в трекере статус другой — обнови</div>
                      {sverkaData.statusMismatch.map((p,i)=>(
                        <div key={i} onClick={()=>sverkaGoToLead(p.pid,p.mgrId)} className="row-hover" style={{ display:"flex",justifyContent:"space-between",gap:12,padding:"9px 14px",borderTop:`1px solid ${T.rowB}`,flexWrap:"wrap",fontSize:12,cursor:"pointer" }}>
                          <span style={{ color:T.text,fontWeight:600 }}>{p.name} <span style={{ color:"#86efac",fontWeight:400 }}>· {p.mgr}</span></span>
                          <span style={{ color:T.muted }}>{p.platName}</span>
                          <span style={{ color:T.sub }}>статус: <b style={{color:"#fca5a5"}}>{p.status}</b></span>
                          {sverkaData.isTL&&<button onClick={e=>{ e.stopPropagation(); ignoreSverkaItem("status_mismatch",p.sub18,p.platId); }} title="Исключить из сверки" style={{ background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:14,padding:"0 2px",lineHeight:1 }}>✕</button>}
                        </div>
                      ))}
                    </div>
                  )}
                  {sverkaData.isTL&&sverkaData.ignored&&sverkaData.ignored.length>0&&(
                    <div style={{ marginTop:4 }}>
                      <button onClick={()=>setShowIgnored(v=>!v)} className="btn-g" style={{ border:`1px solid ${T.border}`,color:T.muted,padding:"6px 12px",borderRadius:7,cursor:"pointer",fontSize:12 }}>Исключённые ({sverkaData.ignored.length}) {showIgnored?"▲":"▼"}</button>
                      {showIgnored&&(
                        <div style={{ ...card,marginTop:10 }}>
                          {sverkaData.ignored.map((r,i)=>{
                            const lbl={ not_in_tracker:"Не заведён", check_sub:"Проверь sub18", wrong_mgr:"Не на том менеджере", status_mismatch:"Статус не «Да»" }[r.list_type]||r.list_type;
                            return (
                              <div key={i} style={{ display:"flex",justifyContent:"space-between",gap:12,padding:"9px 14px",borderTop:i>0?`1px solid ${T.rowB}`:"none",flexWrap:"wrap",fontSize:12 }}>
                                <span style={{ color:T.muted }}>{lbl}</span>
                                <span style={{ color:T.sub,fontFamily:"monospace" }}>{r.sub18}</span>
                                <span style={{ color:T.muted }}>{platforms.find(pl=>pl.id===r.platform_id)?.name||"—"}</span>
                                <button onClick={()=>restoreSverkaItem(r)} className="btn-g" style={{ border:`1px solid ${T.border}`,color:"#6ee7b7",background:"transparent",padding:"2px 10px",borderRadius:6,cursor:"pointer",fontSize:11 }}>Вернуть</button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

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
                          <td style={{ padding:"7px 8px",borderBottom:`1px solid ${T.rowBorder}` }}><span style={{ background:ok?(dark?"linear-gradient(135deg,#14532d,#166534)":"linear-gradient(135deg,#bbf7d0,#86efac)"):(dark?"linear-gradient(135deg,#7f1d1d,#991b1b)":"linear-gradient(135deg,#fecaca,#f87171)"),color:ok?(dark?"#86efac":"#14532d"):(dark?"#fca5a5":"#7f1d1d"),padding:"2px 7px",borderRadius:5,fontWeight:700,fontSize:11 }}>{newSch.toFixed(1)}€</span></td>
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

      {/* Header */}
      <div style={{ position:"sticky",top:0,zIndex:300,background:T.hdrBg,borderBottom:`1px solid ${T.border}`,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:8,height:8,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#818cf8)",boxShadow:"0 0 8px rgba(99,102,241,.6)" }}/>
          <span style={{ fontWeight:800,fontSize:15,color:T.text,letterSpacing:"0.05em" }}>АРБИТРАЖ</span>
          <span style={{ background:isTeamLead?"linear-gradient(135deg,#0f766e,#14b8a6)":"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",fontSize:10,padding:"1px 7px",borderRadius:4,fontWeight:700 }}>{isTeamLead?"ТИМ ЛИД":"МЕНЕДЖЕР"}</span>
          <span style={{ color:T.muted,fontSize:13 }}>/ {manager.name}</span>
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          <button onClick={()=>{ genAutomation(); setShowAutomation(true); }} className="btn-a" style={{ padding:"7px 14px",fontSize:12,borderRadius:8 }}>⚡ Автоматизация</button>
          <button onClick={runSverka} className="btn-g" style={{ border:`1px solid ${T.border}`,color:T.sub,padding:"7px 14px",borderRadius:8,cursor:"pointer",fontSize:12 }}>🔍 Сверка</button>
          <button onClick={()=>setShowAddLead(true)} className="btn-p" style={{ padding:"7px 16px",fontSize:13,borderRadius:8 }}>+ Добавить лида</button>
          <button onClick={()=>setDark(d=>!d)} className="btn-g" style={{ border:`1px solid ${T.border}`,color:T.sub,padding:"7px 10px",borderRadius:7,cursor:"pointer",fontSize:14 }}>{dark?"☀️":"🌙"}</button>
          <button onClick={onLogout} className="btn-g" style={{ border:`1px solid ${T.border}`,color:T.sub,padding:"7px 14px",borderRadius:7,cursor:"pointer",fontSize:13 }}>Выйти</button>
        </div>
      </div>

      {/* Geo tabs */}
      {myGeos.length>1&&(
        <div style={{ position:"sticky",top:57,zIndex:290,background:T.hdrBg,borderBottom:`1px solid ${T.border}`,padding:"0 20px",display:"flex",gap:4 }}>
          {myGeos.map(g=>(
            <button key={g.id} onClick={()=>setActiveGeo(g.id)} className="geo-tab" style={{ color:activeGeo===g.id?"#6366f1":T.muted,borderBottomColor:activeGeo===g.id?"#6366f1":"transparent" }}>
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Nav */}
      <div style={{ position:"sticky",top:myGeos.length>1?93:57,zIndex:280,background:T.navBg,borderBottom:`1px solid ${T.border}`,padding:"0 20px",display:"flex" }}>
        {[["main","Мои лиды"],["tasks",<span>Задачи{overdueRds.length>0&&<span style={{ color:"#ef4444",fontWeight:700,marginLeft:6 }}>{overdueRds.length}</span>}</span>],["team","Команда"+(myGeos.length>0?"":" ")],["platforms","Платформы"],["report","Отчёт"],["history","История"],["overview","Сводка"],...(isTeamLead?[["activity","Активность"]]:[])]
          .map(([key,label])=>(
          <button key={key} onClick={()=>{ setTab(key); setViewingManager(null); }} className="nb" style={{ background:"transparent",border:"none",color:tab===key?"#6366f1":T.muted,padding:"12px 16px",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:tab===key?"2px solid #6366f1":"2px solid transparent" }}>{label}</button>
        ))}
      </div>

      {/* Sticky platform panel - shown always on main tab */}
      {tab==="main"&&(
        <div style={{ position:"sticky",top:myGeos.length>1?133:93,zIndex:200,background:T.bg,borderBottom:`1px solid ${T.border}`,padding:"8px 20px" }}>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap",alignItems:"stretch" }}>
            {geoPlatforms.filter(p=>pinnedPlatforms.includes(p.id)).map(plat=>{
              const allActive=allPlayers.filter(p=>p&&p.platform_id===plat.id&&p.status==="Да");
              const capCount=allActive.length;
              const capPct=plat.cap?Math.min(100,Math.round(capCount/plat.cap*100)):null;
              const myActive=players.filter(p=>p.platform_id===plat.id&&p.status==="Да");
              const myFactTotal=myActive.reduce((s,p)=>s+calcEffectiveTotal(p),0);
              const avgFact=myActive.length>0?myFactTotal/myActive.length:0;
              const ok=avgFact>=(plat.target_avg_check||0);
              const myPlannedExtra=myActive.reduce((s,p)=>s+plannedRds.filter(r=>r&&r.player_id===p.id).reduce((a,r)=>a+Number(r.amount),0),0);
              const plannedAvg=myActive.length>0?(myFactTotal+myPlannedExtra)/myActive.length:0;
              const needMore=Math.max(0,(plat.target_avg_check||0)*myActive.length-myFactTotal);
              return(
                <div key={plat.id} style={{ background:T.surface,border:`1px solid ${ok?"#166534":T.border}`,borderRadius:10,padding:"8px 14px",minWidth:170,display:"flex",flexDirection:"column",gap:4 }}>
                  <div style={{ fontSize:11,fontWeight:700,color:T.text }}>{plat.name}</div>
                  <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
                    <span style={{ fontSize:12,color:ok?"#86efac":"#fca5a5",fontWeight:700 }}>факт {avgFact.toFixed(1)}€</span>
                    <span style={{ fontSize:11,color:"#a5b4fc",fontWeight:600 }}>план {plannedAvg.toFixed(1)}€</span>
                    <span style={{ fontSize:11,color:T.muted }}>/ {plat.target_avg_check}€</span>
                  </div>
                  {needMore>0&&<div style={{ fontSize:11,color:"#f59e0b" }}>↑ {needMore.toFixed(0)}€</div>}
                  <div style={{ marginTop:2 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:T.muted,marginBottom:2 }}>
                      <span>Капа</span><span>{capCount}{plat.cap?`/${plat.cap}`:""}</span>
                    </div>
                    <div style={{ background:T.border,borderRadius:4,height:4 }}>
                      {capPct!==null&&<div style={{ width:`${capPct}%`,background:capPct>=100?"#ef4444":capPct>=80?"#f59e0b":"#6366f1",borderRadius:4,height:4,transition:"width .3s" }}/>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{ position:"relative" }}>
              <div onClick={()=>setShowPlatformPicker(p=>!p)} style={{ background:T.surface,border:`1px dashed ${T.border}`,borderRadius:10,padding:"8px 14px",minWidth:170,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",gap:4,boxSizing:"border-box" }}>
                <div style={{ fontSize:11,fontWeight:700,color:"transparent" }}>placeholder</div>
                <div style={{ display:"flex",gap:8,alignItems:"center" }}><span style={{ fontSize:11,color:"transparent" }}>placeholder</span></div>
                <div style={{ fontSize:11,color:"transparent" }}>placeholder</div>
                <div style={{ marginTop:2,width:"100%" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:2 }}><span style={{ color:"transparent" }}>x</span><span style={{ color:"transparent" }}>x</span></div>
                  <div style={{ background:T.border,borderRadius:4,height:4 }}/>
                </div>
                <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:4 }}>
                  <span style={{ fontSize:28,color:T.muted,lineHeight:1,fontWeight:300 }}>+</span>
                  <span style={{ fontSize:11,color:T.muted }}>Платформы</span>
                </div>
              </div>
              {showPlatformPicker&&(
                <div style={{ position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:300,background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:10,minWidth:200,boxShadow:"0 8px 24px rgba(0,0,0,.4)" }}>
                  {geoPlatforms.map(p=>(
                    <label key={p.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"5px 4px",cursor:"pointer" }}>
                      <input type="checkbox" checked={pinnedPlatforms.includes(p.id)} onChange={()=>updatePinnedPlatforms(prev=>prev.includes(p.id)?prev.filter(id=>id!==p.id):[...prev,p.id])} style={{ accentColor:"#6366f1",cursor:"pointer" }}/>
                      <span style={{ fontSize:13,color:T.text }}>{p.name}</span>
                    </label>
                  ))}
                  <button onClick={()=>setShowPlatformPicker(false)} style={{ marginTop:8,width:"100%",background:"transparent",border:`1px solid ${T.border}`,color:T.muted,borderRadius:6,padding:"4px 0",cursor:"pointer",fontSize:12 }}>Закрыть</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MAIN */}
      {tab==="main"&&(
        <div style={{ padding:"16px 20px" }}>
          {todayRds.length>0&&(
            <div style={{ background:T.alertBg,border:`1px solid ${T.alertBorder}`,borderRadius:10,padding:"10px 16px",display:"flex",alignItems:"center",gap:8,marginBottom:14,flexWrap:"wrap" }}>
              <span className="alert-pulse" style={{ fontSize:18 }}>🔔</span>
              <span style={{ color:"#d97706",fontWeight:700,fontSize:13,marginRight:2 }}>Сегодня нужно сделать РД:</span>
              {todayRds.flatMap(p=>{
                const plat=platforms.find(pl=>pl.id===p.platform_id);
                return (plannedRds||[]).filter(r=>r&&r.player_id===p.id&&r.date===today).map(r=>(
                  <span key={`${p.id}-${r.rd_number}`} onClick={()=>goToLead(p)} className="row-hover" title="Перейти к лиду" style={{ cursor:"pointer",color:dark?"#fbbf24":"#92400e",fontSize:12,fontWeight:600,background:"rgba(217,119,6,.12)",border:"1px solid rgba(217,119,6,.35)",borderRadius:6,padding:"2px 8px" }}>
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

      {/* TASKS + OVERDUE (объединённая вкладка) */}
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
            <input type="date" value={todoDate} onChange={e=>setTodoDate(e.target.value)} style={{ background:T.surface,border:`1px solid ${T.border}`,color:T.sub,padding:"5px 10px",borderRadius:7,fontSize:12,outline:"none",colorScheme:dark?"dark":"light" }}/>
            {todoDate&&<button onClick={()=>setTodoDate("")} style={{ background:"transparent",border:`1px solid ${T.border}`,color:T.muted,padding:"5px 10px",borderRadius:7,cursor:"pointer",fontSize:12 }}>Сегодня</button>}
            <span style={{ color:T.muted,fontSize:11 }}>Клик по лиду → переход к таблице</span>
          </div>
          <div style={{ display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-start" }}>
            {/* ЛЕВО: задачи на сегодня */}
            <div style={{ flex:"1 1 360px",minWidth:300 }}>
              <h3 style={{ color:"#a5b4fc",fontSize:14,margin:"0 0 10px" }}>📋 Задачи на {todoDate? new Date(todoDate+"T00:00:00").toLocaleDateString("ru",{day:"2-digit",month:"2-digit"}) : "сегодня"}</h3>
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
            {/* ПРАВО: просроченные */}
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
                    <div key={`o-${player.id}`} onClick={()=>goToLead(player)} className="row-hover" style={{ background:dark?"rgba(239,68,68,.06)":"rgba(239,68,68,.04)",border:"1px solid #7f1d1d",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:8,cursor:"pointer" }}>
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

      {/* TODO (legacy, unused) */}
      {false&&(
        <div style={{ padding:"16px 20px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap" }}>
            <h2 style={{ color:T.text,fontSize:18,margin:0 }}>Задачи на сегодня</h2>
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
          </div>
          {(()=>{
            const todayStr=new Date().toISOString().slice(0,10);
            // Тимлид видит задачи всей команды своего гео
            const sourcePlayers=isTeamLead
              ? allPlayers.filter(p=>p&&p.status==="Да"&&userGeos.filter(ug=>ug.geo_id===activeGeo).map(ug=>ug.manager_id).includes(p.manager_id))
              : players.filter(p=>p.status==="Да");
            const tasks=sourcePlayers.flatMap(p=>{
              const factRds=redeposits.filter(r=>r&&r.player_id===p.id);
              const planned=plannedRds.filter(r=>r&&r.player_id===p.id).sort((a,b)=>a.rd_number-b.rd_number);
              const plat=platforms.find(pl=>pl.id===p.platform_id);
              const mgr=allManagers.find(m=>m.id===p.manager_id);
              const results=[];
              planned.forEach(r=>{
                if(r.date===todayStr) results.push({ player:p, plat, mgr, rdNum:r.rd_number, date:r.date, isOverdue:false });
              });
              if(p.next_rd_date&&p.next_rd_date<=todayStr&&results.length===0){
                results.push({ player:p, plat, mgr, rdNum:factRds.length+1, date:p.next_rd_date, isOverdue:p.next_rd_date<todayStr });
              }
              return results;
            });

            if(tasks.length===0) return <div style={{ color:T.muted,fontSize:14,padding:"20px 0" }}>На сегодня задач нет</div>;

            const filtered=tasks.filter(t=>{
              if(todoPlatFilter&&t.plat?.id!==todoPlatFilter) return false;
              if(todoMgrFilter&&t.player?.manager_id!==todoMgrFilter) return false;
              return true;
            });

            return(
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {filtered.length===0&&<div style={{ color:T.muted,fontSize:14,padding:"20px 0" }}>Нет задач по фильтру</div>}
                {filtered.map(({player,plat,mgr,rdNum,date,isOverdue},idx)=>(
                  <div key={`${player.id}-${rdNum}-${idx}`} style={{ background:T.surface,border:`1px solid ${isOverdue?"#7f1d1d":T.border}`,borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",gap:12 }}>
                    <div style={{ width:8,height:8,borderRadius:"50%",background:isOverdue?"#ef4444":"#6366f1",flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:3 }}>
                        <span style={{ fontWeight:700,color:T.text,fontSize:14 }}>{player.name}</span>
                        {player.sub18&&<span onClick={()=>{ navigator.clipboard.writeText(player.sub18); showToast("SUB18 скопирован"); }} style={{ color:T.muted,fontSize:11,fontFamily:"monospace",cursor:"pointer",borderBottom:`1px dashed ${T.border}` }} title="Скопировать SUB18">{player.sub18}</span>}
                        {isTeamLead&&mgr&&<span style={{ fontSize:11,color:"#a5b4fc",background:"rgba(99,102,241,.1)",padding:"1px 6px",borderRadius:4 }}>{mgr.name}</span>}
                      </div>
                      <div style={{ fontSize:12,color:T.muted }}>{plat?.name} · РД{rdNum}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      {(()=>{ const pRd=plannedRds.find(r=>r&&r.player_id===player.id&&r.rd_number===rdNum); return pRd?<div style={{ fontSize:14,fontWeight:700,color:"#a5b4fc",marginBottom:2 }}>{pRd.amount}€</div>:null; })()}
                      <div style={{ fontSize:12,color:isOverdue?"#fca5a5":"#a5b4fc",fontWeight:600 }}>{isOverdue?"Просрочен":date}</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* TEAM */}
      {tab==="team"&&(
        <div style={{ padding:"16px 20px" }}>
          <h2 style={{ color:T.text,marginBottom:16,fontSize:18 }}>Команда</h2>
          {myGeos.length===0&&<p style={{ color:T.muted,fontSize:13 }}>Вы не назначены ни на одно гео. Обратитесь к администратору.</p>}
          {myGeos.filter(geo=>geo&&geo.id===activeGeo).map(geo=>{
            const geoManagerIds=userGeos.filter(ug=>ug&&ug.geo_id===geo.id&&ug.manager_id).map(ug=>ug.manager_id);
            const geoManagers2=allManagers.filter(m=>m&&m.id!==manager.id&&geoManagerIds.includes(m.id));
            const viewing=(viewingManager||{})[geo.id]||null;
            return(
              <div key={geo.id} style={{ marginBottom:28 }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12 }}>
                  <span style={{ background:"linear-gradient(135deg,#1e3a5f,#1e40af)",color:"#93c5fd",padding:"2px 10px",borderRadius:6,fontSize:12,fontWeight:700 }}>{geo.name}</span>
                </div>
                <div style={{ display:"flex",gap:10,flexWrap:"wrap",marginBottom:16 }}>
                  {geoManagers2.map(m=>{
                    const mPlayers=allPlayers.filter(p=>p&&p.id&&p.manager_id===m.id);
                    const mActive=mPlayers.filter(p=>p.status==="Да");
                    const total=mActive.reduce((s,p)=>s+calcEffectiveTotal(p),0);
                    const avg=mActive.length>0?total/mActive.length:0;
                    const isViewing=viewing===m.id;
                    return(
                      <div key={m.id} onClick={()=>setViewingManager(prev=>({...prev,[geo.id]:isViewing?null:m.id}))} style={{ background:isViewing?`linear-gradient(135deg,${dark?"#1e3a5f":"#dbeafe"},${dark?"#1e2235":"#eff6ff"})`:T.surface,border:`1px solid ${isViewing?"#6366f1":T.border}`,borderRadius:10,padding:"12px 16px",cursor:"pointer",transition:"all .2s",minWidth:160 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:6 }}>
                          <div style={{ width:7,height:7,borderRadius:"50%",background:m.role==="team_lead"?"#14b8a6":"#6366f1" }}/>
                          <span style={{ fontWeight:700,color:T.text,fontSize:13 }}>{m.name}</span>
                          {m.role==="team_lead"&&<span style={{ background:"rgba(20,184,166,.15)",color:"#14b8a6",fontSize:9,padding:"1px 5px",borderRadius:4,fontWeight:700 }}>ТЛ</span>}
                        </div>
                        <div style={{ fontSize:11,color:T.muted }}>Лидов: <strong style={{ color:T.text }}>{mPlayers.length}</strong></div>
                        <div style={{ fontSize:11,color:T.muted }}>Депозитов: <strong style={{ color:T.text }}>{mActive.length}</strong></div>
                        <div style={{ fontSize:11,color:T.muted }}>СЧ: <strong style={{ color:avg>0?(avg>=platforms[0]?.target_avg_check?"#86efac":"#fca5a5"):T.muted }}>{avg>0?avg.toFixed(1)+"€":"—"}</strong></div>
                      </div>
                    );
                  })}
                  {geoManagers2.length===0&&<p style={{ color:T.muted,fontSize:13 }}>Нет других менеджеров в этом гео</p>}
                </div>
                {viewing&&(
                  <div>
                    <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12 }}>
                      <span style={{ color:T.text,fontWeight:600,fontSize:14 }}>{allManagers.find(m=>m.id===viewing)?.name}</span>
                      <span style={{ color:T.muted,fontSize:12 }}>— {isTeamLead?"редактирование":"только просмотр"}</span>
                    </div>
                    {/* Platform widgets for viewed manager */}
                    <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:12 }}>
                      {geoPlatforms.map(plat=>{
                        const mActive=allPlayers.filter(p=>p&&p.manager_id===viewing&&p.platform_id===plat.id&&p.status==="Да");
                        if(mActive.length===0) return null;
                        const factTotal=mActive.reduce((s,p)=>s+calcEffectiveTotal(p),0);
                        const avg=mActive.length>0?factTotal/mActive.length:0;
                        const ok=avg>=plat.target_avg_check;
                        const plannedExtra=mActive.reduce((s,p)=>s+plannedRds.filter(r=>r&&r.player_id===p.id).reduce((a,r)=>a+Number(r.amount),0),0);
                        const plannedAvg=mActive.length>0?(factTotal+plannedExtra)/mActive.length:0;
                        const needMore=Math.max(0,(plat.target_avg_check||0)*mActive.length-factTotal);
                        const allActive=allPlayers.filter(p=>p&&p.platform_id===plat.id&&p.status==="Да").length;
                        const capPct=plat.cap?Math.min(100,Math.round(allActive/plat.cap*100)):null;
                        return(
                          <div key={plat.id} style={{ background:T.surface,border:`1px solid ${ok?"#166534":T.border}`,borderRadius:10,padding:"8px 14px",minWidth:170,display:"flex",flexDirection:"column",gap:4 }}>
                            <div style={{ fontSize:11,fontWeight:700,color:T.text }}>{plat.name}</div>
                            <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
                              <span style={{ fontSize:12,color:ok?"#86efac":"#fca5a5",fontWeight:700 }}>факт {avg.toFixed(1)}€</span>
                              <span style={{ fontSize:11,color:"#a5b4fc",fontWeight:600 }}>план {plannedAvg.toFixed(1)}€</span>
                              <span style={{ fontSize:11,color:T.muted }}>/ {plat.target_avg_check}€</span>
                            </div>
                            {needMore>0&&<div style={{ fontSize:11,color:"#f59e0b" }}>↑ {needMore.toFixed(0)}€</div>}
                            <div style={{ marginTop:2 }}>
                              <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:T.muted,marginBottom:2 }}>
                                <span>Капа</span><span>{allActive}{plat.cap?`/${plat.cap}`:""}</span>
                              </div>
                              <div style={{ background:T.border,borderRadius:4,height:4 }}>
                                {capPct!==null&&<div style={{ width:`${capPct}%`,background:capPct>=100?"#ef4444":capPct>=80?"#f59e0b":"#6366f1",borderRadius:4,height:4 }}/>}
                              </div>
                            </div>
                          </div>
                        );
                      }).filter(Boolean)}
                    </div>
                    <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:12,flexWrap:"wrap" }}>
                      <input value={teamSearch} onChange={e=>setTeamSearch(e.target.value)} placeholder="🔍 Поиск по имени / SUB18" style={{ ...IS,width:220 }}/>
                      <select value={teamFilterPlatform} onChange={e=>setTeamFilterPlatform(e.target.value)} style={{ background:T.surface,border:`1px solid ${T.border}`,color:T.sub,padding:"7px 10px",borderRadius:7,fontSize:12,outline:"none" }}>
                        <option value="">Все платформы</option>
                        {geoPlatforms.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <select value={teamFilterStatus} onChange={e=>setTeamFilterStatus(e.target.value)} style={{ background:T.surface,border:`1px solid ${T.border}`,color:T.sub,padding:"7px 10px",borderRadius:7,fontSize:12,outline:"none" }}>
                        <option value="">Все статусы</option>
                        {STATUSES.map(s=><option key={s}>{s}</option>)}
                      </select>
                      {(teamSearch||teamFilterPlatform||teamFilterStatus)&&<button onClick={()=>{ setTeamSearch(""); setTeamFilterPlatform(""); setTeamFilterStatus(""); }} style={{ background:"transparent",border:`1px solid ${T.border}`,color:"#f87171",padding:"7px 12px",borderRadius:7,cursor:"pointer",fontSize:12 }}>Сбросить</button>}
                    </div>
                    <PlayersTable
                      players={allPlayers.filter(p=>p&&p.id&&p.manager_id===viewing&&!hiddenPlatIds.has(p.platform_id)&&(geoPlatforms.some(gp=>gp.id===p.platform_id)||!p.platform_id)).filter(p=>{
                        if(teamFilterPlatform&&p.platform_id!==teamFilterPlatform) return false;
                        if(teamFilterStatus&&p.status!==teamFilterStatus) return false;
                        if(teamSearch){ const q=teamSearch.toLowerCase(); if(!`${p.name||""} ${p.sub18||""}`.toLowerCase().includes(q)) return false; }
                        return true;
                      })}
                      redeposits={redeposits} plannedRds={plannedRds} platforms={platforms}
                      manager={manager} dark={dark}
                      readonly={!isTeamLead}
                      onReload={load} showToast={showToast} highlightId={highlightId}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* OVERDUE */}
      {false&&( /* overdue legacy */
        <div style={{ padding:"16px 20px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap" }}>
            <h2 style={{ color:T.text,fontSize:18,margin:0 }}>Просроченные РД</h2>
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
          </div>
          {(()=>{
            const sourceOverdue=isTeamLead
              ? allPlayers.filter(p=>p&&overdueDatesByPlayer[p.id]&&p.status==="Да"&&userGeos.filter(ug=>ug.geo_id===activeGeo).map(ug=>ug.manager_id).includes(p.manager_id))
              : overdueRds;
            const filtered=sourceOverdue.filter(p=>{
              if(todoPlatFilter&&p.platform_id!==todoPlatFilter) return false;
              if(todoMgrFilter&&p.manager_id!==todoMgrFilter) return false;
              return true;
            }).sort((a,b)=>new Date(overdueDatesByPlayer[a.id])-new Date(overdueDatesByPlayer[b.id]));
            if(filtered.length===0) return <div style={{ textAlign:"center",padding:40,color:T.muted }}>✅ Нет просроченных РД</div>;
            return(
              <div style={{ border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden" }}>
                <table style={{ width:"100%",borderCollapse:"collapse" }}>
                  <thead><tr>{["Лид","Платформа",...(isTeamLead?["Менеджер"]:[]),"SUB18","Последний РД","Просроченная дата","Дней","Статус"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filtered.map(player=>{
                      const plat=platforms.find(p=>p.id===player.platform_id);
                      const mgr=allManagers.find(m=>m.id===player.manager_id);
                      const overdueDate=overdueDatesByPlayer[player.id];
                      const daysDiff=Math.floor((new Date(today)-new Date(overdueDate))/(1000*60*60*24));
                      const rds=getPlayerRds(player.id);
                      const lastRd=rds[rds.length-1];
                      return(
                        <tr key={player.id} className="row-hover" style={{ background:dark?"rgba(239,68,68,.04)":"rgba(239,68,68,.03)" }}>
                          <td style={{ ...S.td,fontWeight:600,color:T.text }}>{player.name}</td>
                          <td style={{ ...S.td,color:T.sub,fontSize:12 }}>{plat?.name||"—"}</td>
                          {isTeamLead&&<td style={{ ...S.td,color:"#a5b4fc",fontSize:12 }}>{mgr?.name||"—"}</td>}
                          <td style={{ ...S.td,color:T.muted,fontSize:11,fontFamily:"monospace",cursor:"pointer" }} onClick={()=>player.sub18&&navigator.clipboard.writeText(player.sub18)}>{player.sub18||"—"}</td>
                          <td style={{ ...S.td,color:T.sub,fontSize:12 }}>{lastRd?`РД${lastRd.rd_number}: ${lastRd.amount}€`:"—"}</td>
                          <td style={S.td}><span style={{ color:"#f87171",fontWeight:700,fontSize:12 }}>⚠ {overdueDate?(([y,m,d])=>`${d}.${m}.${y}`)(overdueDate.split("-")):"—"}</span></td>
                          <td style={S.td}><span style={{ background:"linear-gradient(135deg,#7f1d1d,#991b1b)",color:"#fca5a5",padding:"2px 8px",borderRadius:6,fontWeight:700,fontSize:11 }}>{daysDiff} дн.</span></td>
                          <td style={S.td}><StatusBadge status={player.status} dark={dark}/></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* REPORT */}
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

      {/* HISTORY */}
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

      {showGeoForm&&(
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
          <div className="slide-in" style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:24,width:"100%",maxWidth:380,boxShadow:"0 24px 64px rgba(0,0,0,.7)" }}>
            <h3 style={{ color:T.text,marginBottom:18,fontSize:15,fontWeight:700 }}>Добавить гео</h3>
            <div style={{ marginBottom:12 }}><label style={{ display:"block",fontSize:10,color:T.muted,marginBottom:4,fontWeight:700,textTransform:"uppercase" }}>Название *</label><input value={geoForm.name} onChange={e=>setGeoForm(f=>({...f,name:e.target.value}))} placeholder="Польша" style={IS}/></div>
            <div style={{ marginBottom:18 }}><label style={{ display:"block",fontSize:10,color:T.muted,marginBottom:4,fontWeight:700,textTransform:"uppercase" }}>Код (2 буквы)</label><input value={geoForm.code} onChange={e=>setGeoForm(f=>({...f,code:e.target.value}))} placeholder="PL" maxLength={3} style={IS}/></div>
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={createGeo} className="btn-p" style={{ flex:1,padding:"10px",fontSize:14 }}>Добавить</button>
              <button onClick={()=>setShowGeoForm(false)} className="btn-g" style={{ flex:1,border:`1px solid ${T.border}`,color:T.sub,padding:"10px",borderRadius:8,cursor:"pointer" }}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {showPlatformForm&&(
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
          <div className="slide-in" style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:24,width:"100%",maxWidth:460,boxShadow:"0 24px 64px rgba(0,0,0,.7)" }}>
            <h3 style={{ color:T.text,marginBottom:18,fontSize:15,fontWeight:700 }}>{editingPlatform?"Редактировать":"Добавить"} платформу</h3>
            {[["Название *","name","text"],["Цель СЧ (€) *","target_avg_check","number"],["Мин. депозит (€)","min_deposit","number"],["Мин. депозит BLIK (€)","min_deposit_blik","number"],["Капа","cap","number"],["Дата добавления","date_added","date"]].map(([l,k,t])=>(
              <div key={k} style={{ marginBottom:12 }}><label style={{ display:"block",fontSize:10,color:T.muted,marginBottom:4,fontWeight:700,textTransform:"uppercase" }}>{l}</label><input type={t} value={pForm[k]} onChange={e=>setPForm(f=>({...f,[k]:e.target.value}))} style={IS}/></div>
            ))}
            <div style={{ marginBottom:12 }}>
              <label style={{ display:"block",fontSize:10,color:T.muted,marginBottom:4,fontWeight:700,textTransform:"uppercase" }}>Гео</label>
              <select value={pForm.geo_id} onChange={e=>setPForm(f=>({...f,geo_id:e.target.value}))} style={IS}>
                <option value="">Без гео</option>
                {geos.map(g=><option key={g.id} value={g.id}>{g.name}{g.code?` (${g.code})`:""}</option>)}
              </select>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:18 }}>
              {[["is_active","Платформа активна"],["reset_monthly","Сбрасывать СЧ каждый месяц"]].map(([k,l])=>(
                <label key={k} style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer" }}>
                  <input type="checkbox" checked={pForm[k]} onChange={e=>setPForm(f=>({...f,[k]:e.target.checked}))} style={{ width:14,height:14,accentColor:"#6366f1",cursor:"pointer" }}/>
                  <span style={{ color:T.sub,fontSize:13 }}>{l}</span>
                </label>
              ))}
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={savePlatform} className="btn-p" style={{ flex:1,padding:"10px",fontSize:14 }}>Сохранить</button>
              <button onClick={()=>setShowPlatformForm(false)} className="btn-g" style={{ flex:1,border:`1px solid ${T.border}`,color:T.sub,padding:"10px",borderRadius:8,cursor:"pointer" }}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* PLATFORMS */}
      {tab==="platforms"&&(
        <div style={{ padding:"16px 20px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap" }}>
            <h2 style={{ color:T.text,fontSize:18,margin:0 }}>Платформы</h2>
            <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{ background:T.surface,border:`1px solid ${T.border}`,color:T.sub,padding:"6px 10px",borderRadius:7,fontSize:12,outline:"none" }}>
              <option value="">Все месяцы</option>
              {allMonths.map(mk=>{ const[yr,mo]=mk.split("-"); return<option key={mk} value={mk}>{new Date(Number(yr),Number(mo)-1,1).toLocaleString("ru",{month:"long",year:"numeric"})}</option>; })}
            </select>
            <select value={statPlatform} onChange={e=>setStatPlatform(e.target.value)} style={{ background:T.surface,border:`1px solid ${T.border}`,color:T.sub,padding:"6px 10px",borderRadius:7,fontSize:12,outline:"none" }}>
              <option value="">Все платформы</option>
              {geoPlatforms.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20 }}>
            {[
              ["Всего лидов",getStatPlayers().length,`из ${cardBase.filter(p=>p.status==="Да").length} всего`,"#6366f1"],
              ["Сумма",getStatPlayers().reduce((s,p)=>s+calcEffectiveTotal(p),0).toFixed(0)+"€","деп + редепы","#14b8a6"],
              ["BLIK",getStatPlayers().filter(p=>p.is_blik).length,`${getStatPlayers().length>0?Math.round(getStatPlayers().filter(p=>p.is_blik).length/getStatPlayers().length*100):0}% от активных`,"#d97706"],
              ["Нужно добрать",(statPlatform?(platformStats.find(p=>p.id===statPlatform)?.needMore||0):platformStats.reduce((s,p)=>s+p.needMore,0)).toFixed(0)+"€","до цели СЧ","#f59e0b"],
            ].map(([l,v,s,a])=>(
              <div key={l} style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 16px",borderLeft:`3px solid ${a}` }}>
                <div style={{ fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:22,fontWeight:700,color:T.text }}>{v}</div>
                <div style={{ fontSize:11,color:T.sub,marginTop:2 }}>{s}</div>
              </div>
            ))}
          </div>
          {chartData.length>1&&(
            <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"20px 16px",marginBottom:24 }}>
              <p style={{ color:T.text,fontWeight:600,fontSize:13,marginBottom:16 }}>Динамика СЧ по дням</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                  <XAxis dataKey="date" tick={{ fill:T.muted,fontSize:10 }}/>
                  <YAxis tick={{ fill:T.muted,fontSize:10 }}/>
                  <Tooltip contentStyle={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:8 }} labelStyle={{ color:T.text }} itemStyle={{ color:"#818cf8" }}/>
                  <Line type="monotone" dataKey="sch" stroke="#6366f1" strokeWidth={2} dot={false} name="СЧ"/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {myGeos.filter(geo=>geo.id===activeGeo).map(geo=>{
            const geoPlatStats=platformStats.filter(p=>p.geo_id===geo.id);
            return(
              <div key={geo.id} style={{ marginBottom:28 }}>
              <div style={{ display:"flex",justifyContent:"flex-end",gap:8,marginBottom:10 }}>
                  <span style={{ background:"linear-gradient(135deg,#1e3a5f,#1e40af)",color:"#93c5fd",padding:"3px 12px",borderRadius:6,fontSize:13,fontWeight:700,display:"flex",alignItems:"center" }}>{geo.name}</span>
                  <div style={{ flex:1 }}/>
                  {isTeamLead&&<button onClick={()=>setShowGeoForm(true)} className="btn-a" style={{ padding:"6px 14px",fontSize:13,borderRadius:8,height:34 }}>+ Гео</button>}
                  {isTeamLead&&<button onClick={()=>{ setPForm(f=>({...f,geo_id:geo.id})); openPlatformForm(); }} className="btn-p" style={{ padding:"6px 14px",fontSize:13,borderRadius:8,height:34 }}>+ Добавить</button>}
                </div>
                <div style={{ border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden" }}>
                  <table style={{ width:"100%",borderCollapse:"collapse" }}>
                    <thead><tr>{["Платформа","Дата","Мин. деп","BLIK деп","Цель СЧ","Капа","Лидов","Сумма","СЧ факт","BLIK","Нужно добрать","Статус",...(isTeamLead?["Действия"]:[])].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {geoPlatStats.length===0&&<tr><td colSpan={isTeamLead?13:12} style={{ padding:18,textAlign:"center",color:T.muted,fontSize:13 }}>Нет платформ</td></tr>}
                      {geoPlatStats.map(p=>{
                        const ok=p.avgCheck>=p.target_avg_check;
                        return(
                          <tr key={p.id} className="row-hover" draggable={isTeamLead} onDragStart={()=>setDragPlatId(p.id)} onDragOver={e=>{ if(isTeamLead) e.preventDefault(); }} onDrop={()=>{ reorderPlatforms(dragPlatId,p.id); setDragPlatId(null); }} style={isTeamLead?{ cursor:dragPlatId===p.id?"grabbing":"grab",opacity:dragPlatId===p.id?.5:1 }:undefined}>
                            <td style={{ ...S.td,fontWeight:600,color:T.text }}>
                              {isTeamLead&&<span style={{ color:T.muted,marginRight:8,cursor:"grab",userSelect:"none" }} title="Перетащить">⠿</span>}
                              {p.name}
                            </td>
                            <td style={{ ...S.td,color:T.sub,fontSize:12 }}>{p.date_added||"—"}</td>
                            <td style={{ ...S.td,color:T.sub }}>{p.min_deposit||"—"}€</td>
                            <td style={{ ...S.td,color:"#d97706" }}>{p.min_deposit_blik?p.min_deposit_blik+"€":"—"}</td>
                            <td style={S.td}><span style={{ background:"linear-gradient(135deg,#1e3a5f,#1e40af)",color:"#93c5fd",padding:"2px 9px",borderRadius:6,fontWeight:700,fontSize:11 }}>{p.target_avg_check}€</span></td>
                            <td style={{ ...S.td,color:T.sub }}>{p.cap||"—"}</td>
                            <td style={{ ...S.td,color:dark?"#a5b4fc":"#4f46e5",fontWeight:700 }}>{p.totalCount}</td>
                            <td style={{ ...S.td,color:T.sub }}>{p.totalAmount.toFixed(0)}€</td>
                            <td style={S.td}>{p.totalCount>0?<span style={{ background:ok?(dark?"linear-gradient(135deg,#14532d,#166534)":"linear-gradient(135deg,#bbf7d0,#86efac)"):(dark?"linear-gradient(135deg,#7f1d1d,#991b1b)":"linear-gradient(135deg,#fecaca,#f87171)"),color:ok?(dark?"#86efac":"#14532d"):(dark?"#fca5a5":"#7f1d1d"),padding:"2px 9px",borderRadius:6,fontWeight:700,fontSize:11 }}>{p.avgCheck.toFixed(1)}€</span>:<span style={{ color:T.muted }}>—</span>}</td>
                            <td style={S.td}>{p.totalCount>0?<div style={{ display:"flex",alignItems:"center",gap:5 }}><div style={{ width:44,background:T.rowBorder,borderRadius:3,height:4,overflow:"hidden",display:"flex" }}><div className="progress-bar" style={{ width:`${100-p.blikPct}%`,height:"100%",background:"linear-gradient(90deg,#6366f1,#818cf8)" }}/><div className="progress-bar" style={{ width:`${p.blikPct}%`,height:"100%",background:"linear-gradient(90deg,#d97706,#f59e0b)" }}/></div><span style={{ color:"#d97706",fontSize:11 }}>{p.blikCount}({p.blikPct}%)</span></div>:<span style={{ color:T.muted }}>—</span>}</td>
                            <td style={{ ...S.td,color:"#f59e0b",fontWeight:700 }}>{p.totalCount>0?p.needMore.toFixed(0)+"€":"—"}</td>
                            <td style={S.td}>
                              {p.is_hidden
                                ? <span style={{ background:"rgba(100,116,139,.18)",color:"#94a3b8",padding:"2px 9px",borderRadius:6,fontWeight:700,fontSize:11 }}>Скрыто</span>
                                : p.is_active===false
                                  ? <span style={{ background:"rgba(245,158,11,.15)",color:"#f59e0b",padding:"2px 9px",borderRadius:6,fontWeight:700,fontSize:11 }}>Стоп</span>
                                  : <span style={{ background:"rgba(34,197,94,.15)",color:"#86efac",padding:"2px 9px",borderRadius:6,fontWeight:700,fontSize:11 }}>Активно</span>}
                            </td>
                            {isTeamLead&&<td style={{ ...S.td,display:"flex",gap:6 }}>
                              <button onClick={()=>togglePlatformActive(p)} title={p.is_active===false?"Включить (Активно)":"Поставить на Стоп"} className="btn-g" style={{ border:`1px solid ${T.border}`,color:p.is_active===false?"#f59e0b":"#86efac",width:28,height:28,borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13 }}>{p.is_active===false?"▶":"⏸"}</button>
                              <button onClick={()=>togglePlatformHidden(p)} title={p.is_hidden?"Показать везде":"Скрыть (кроме отчётов)"} className="btn-g" style={{ border:`1px solid ${T.border}`,color:p.is_hidden?"#a5b4fc":T.sub,width:28,height:28,borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                                {p.is_hidden
                                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>}
                              </button>
                              <button onClick={()=>openPlatformForm(p)} className="btn-g" style={{ border:`1px solid ${T.border}`,color:T.sub,width:28,height:28,borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button onClick={()=>deletePlatform(p.id)} className="btn-g btn-danger" style={{ border:"1px solid #7f1d1d",color:"#fca5a5",width:28,height:28,borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                              </button>
                            </td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab==="overview"&&(
        <div style={{ padding:"16px 20px" }}>
          <h2 style={{ color:T.text,marginBottom:20,fontSize:18 }}>Сводка</h2>

          {/* Platform summary - admin style */}
          <h3 style={{ color:T.text,fontSize:14,marginBottom:12,fontWeight:700 }}>Общий СЧ по платформам</h3>
          <div style={{ border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden",marginBottom:28 }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead><tr>{["Платформа","Лидов","Сумма","СЧ факт","СЧ цель","Капа","Нужно добрать"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {geoPlatforms.map(plat=>{
                  const platPlayers=allPlayers.filter(p=>p&&p.platform_id===plat.id&&p.status==="Да"&&geoPlatforms.some(gp=>gp.id===p.platform_id));
                  if(platPlayers.length===0) return null;
                  const total=platPlayers.reduce((s,p)=>s+calcEffectiveTotal(p),0);
                  const avg=platPlayers.length>0?total/platPlayers.length:0;
                  const need=Math.max(0,plat.target_avg_check*platPlayers.length-total);
                  const ok=avg>=plat.target_avg_check;
                  const capCount=platPlayers.length;
                  const capPct=plat.cap?Math.min(100,Math.round(capCount/plat.cap*100)):null;
                  return(
                    <tr key={plat.id} className="row-hover">
                      <td style={{ ...S.td,fontWeight:600,color:T.text }}>{plat.name}</td>
                      <td style={{ ...S.td,color:dark?"#a5b4fc":"#4f46e5",fontWeight:700 }}>{platPlayers.length}</td>
                      <td style={{ ...S.td,color:T.sub }}>{total.toFixed(0)}€</td>
                      <td style={S.td}><span style={{ background:ok?(dark?"linear-gradient(135deg,#14532d,#166534)":"linear-gradient(135deg,#bbf7d0,#86efac)"):(dark?"linear-gradient(135deg,#7f1d1d,#991b1b)":"linear-gradient(135deg,#fecaca,#f87171)"),color:ok?(dark?"#86efac":"#14532d"):(dark?"#fca5a5":"#7f1d1d"),padding:"2px 8px",borderRadius:5,fontWeight:700,fontSize:12 }}>{avg.toFixed(1)}€</span></td>
                      <td style={{ ...S.td,color:T.muted }}>{plat.target_avg_check}€</td>
                      <td style={S.td}>
                        {capPct!==null
                          ?<div style={{ display:"flex",alignItems:"center",gap:6 }}>
                              <div style={{ background:T.border,borderRadius:4,height:4,width:60 }}><div style={{ width:`${capPct}%`,background:capPct>=100?"#ef4444":capPct>=80?"#f59e0b":"#6366f1",borderRadius:4,height:4 }}/></div>
                              <span style={{ fontSize:11,color:capPct>=100?"#ef4444":capPct>=80?"#f59e0b":T.muted }}>{capCount}/{plat.cap}</span>
                            </div>
                          :<span style={{ color:T.muted }}>—</span>}
                      </td>
                      <td style={{ ...S.td,color:"#f59e0b",fontWeight:700 }}>{need>0?need.toFixed(0)+"€":"✓"}</td>
                    </tr>
                  );
                }).filter(Boolean)}
              </tbody>
            </table>
          </div>

          {/* Manager summary - detailed admin style */}
          <h3 style={{ color:T.text,fontSize:14,marginBottom:12,fontWeight:700 }}>По менеджерам</h3>
          <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:28 }}>
            {(()=>{
              const geoManagerIds=userGeos.filter(ug=>ug&&ug.geo_id===activeGeo).map(ug=>ug.manager_id);
              const geoMgrs=allManagers.filter(m=>m&&geoManagerIds.includes(m.id));
              return geoMgrs.map(mgr=>{
                const mPlayers=allPlayers.filter(p=>p&&p.manager_id===mgr.id);
                const active=mPlayers.filter(p=>p.status==="Да"&&geoPlatforms.some(pl=>pl.id===p.platform_id));
                const overdue=active.filter(p=>p.next_rd_date&&p.next_rd_date<today);
                const noPlanned=active.filter(p=>{
                  if(plannedRds.some(r=>r&&r.player_id===p.id)) return false;
                  const plat=platforms.find(pl=>pl.id===p.platform_id);
                  if(!plat) return true;
                  if(plat.cap){ const platActiveAll=allPlayers.filter(ap=>ap&&ap.platform_id===plat.id&&ap.status==="Да").length; if(platActiveAll>=plat.cap) return false; }
                  const mgrPlatActive=active.filter(ap=>ap.platform_id===plat.id);
                  const mgrFactTotal=mgrPlatActive.reduce((s,ap)=>s+calcEffectiveTotal(ap),0);
                  const mgrPlannedExtra=mgrPlatActive.reduce((s,ap)=>s+plannedRds.filter(r=>r&&r.player_id===ap.id).reduce((a,r)=>a+Number(r.amount),0),0);
                  const mgrPlannedAvg=mgrPlatActive.length>0?(mgrFactTotal+mgrPlannedExtra)/mgrPlatActive.length:0;
                  if(mgrPlannedAvg>=(plat.target_avg_check||0)) return false;
                  return true;
                });
                const total=active.reduce((s,p)=>s+calcEffectiveTotal(p),0);
                const avg=active.length>0?total/active.length:0;
                const mgrGeos=userGeos.filter(ug=>ug.manager_id===mgr.id).map(ug=>geos.find(g=>g.id===ug.geo_id)).filter(Boolean);
                return(
                  <div key={mgr.id} style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden" }}>
                    <div style={{ padding:"12px 16px",display:"flex",alignItems:"center",gap:8,borderBottom:active.length>0?`1px solid ${T.border}`:"none" }}>
                      <div style={{ width:7,height:7,borderRadius:"50%",background:mgr.role==="team_lead"?"#14b8a6":"#6366f1",flexShrink:0 }}/>
                      <span style={{ fontWeight:700,color:T.text,fontSize:14 }}>{mgr.name}</span>
                      {mgr.role==="team_lead"&&<span style={{ background:"rgba(20,184,166,.15)",color:"#14b8a6",fontSize:10,padding:"1px 6px",borderRadius:4,fontWeight:700 }}>Тим лид</span>}
                      {mgrGeos.map(g=><span key={g.id} style={{ background:"rgba(99,102,241,.1)",color:"#a5b4fc",fontSize:10,padding:"1px 6px",borderRadius:4 }}>{g.name}</span>)}
                      <div style={{ flex:1 }}/>
                      <span style={{ fontSize:12,color:T.muted }}>Лидов: <strong style={{ color:T.text }}>{active.length}</strong></span>
                      <span style={{ fontSize:12,color:T.muted }}>Сумма: <strong style={{ color:T.text }}>{total.toFixed(0)}€</strong></span>
                      {overdue.length>0&&<span style={{ fontSize:12,color:"#fca5a5" }}>⚠ Просроч: <strong>{overdue.length}</strong></span>}
                      {noPlanned.length>0&&<span style={{ fontSize:12,color:"#f59e0b" }}>📋 Без план РД: <strong>{noPlanned.length}</strong></span>}
                    </div>
                    {active.length>0&&(
                      <table style={{ width:"100%",borderCollapse:"collapse" }}>
                        <thead><tr>{["Платформа","Лидов","Сумма","СЧ цель","СЧ факт"].map(h=><th key={h} style={{ ...S.th,fontSize:10 }}>{h}</th>)}</tr></thead>
                        <tbody>
                          {geoPlatforms.map(plat=>{
                            const pp=active.filter(p=>p.platform_id===plat.id);
                            if(!pp.length) return null;
                            const pt=pp.reduce((s,p)=>s+calcEffectiveTotal(p),0);
                            const pa=pt/pp.length;
                            const ok=pa>=plat.target_avg_check;
                            return(
                              <tr key={plat.id} className="row-hover">
                                <td style={{ ...S.td,color:T.sub,fontSize:12 }}>{plat.name}</td>
                                <td style={{ ...S.td,color:dark?"#a5b4fc":"#4f46e5",fontWeight:700 }}>{pp.length}</td>
                                <td style={{ ...S.td,color:T.sub }}>{pt.toFixed(0)}€</td>
                                <td style={{ ...S.td,color:T.muted }}>{plat.target_avg_check}€</td>
                                <td style={S.td}><span style={{ background:ok?(dark?"linear-gradient(135deg,#14532d,#166534)":"linear-gradient(135deg,#bbf7d0,#86efac)"):(dark?"linear-gradient(135deg,#7f1d1d,#991b1b)":"linear-gradient(135deg,#fecaca,#f87171)"),color:ok?(dark?"#86efac":"#14532d"):(dark?"#fca5a5":"#7f1d1d"),padding:"2px 8px",borderRadius:5,fontWeight:700,fontSize:12 }}>{pa.toFixed(1)}€</span></td>
                              </tr>
                            );
                          }).filter(Boolean)}
                        </tbody>
                      </table>
                    )}
                    {active.length===0&&<div style={{ padding:"10px 16px",color:T.muted,fontSize:12 }}>Нет данных</div>}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {tab==="activity"&&isTeamLead&&(()=>{
        const now=Date.now();
        const byCrm={}; crmActivity.forEach(a=>{ byCrm[String(a.crm_user_id)]=a; });
        const byUser={}; crmUsers.forEach(u=>{ byUser[String(u.crm_user_id)]=u; });
        const crmName=(m)=>{ if(!m.crm_user_id) return null; const k=String(m.crm_user_id); return (byUser[k]&&byUser[k].crm_user_name)||(byCrm[k]&&byCrm[k].crm_user_name)||k; };
        const isToday=presenceDate===P.todayStr();
        const teamMgrs=allManagers.filter(m=>userGeos.some(ug=>ug.geo_id===activeGeo&&ug.manager_id===m.id));
        const fmtAgo=(ts)=>{ if(!ts) return "—"; const min=Math.floor((now-new Date(ts).getTime())/60000); if(min<1) return "только что"; if(min<60) return min+" мин назад"; const h=Math.floor(min/60); if(h<24) return h+" ч "+(min%60)+" мин назад"; return new Date(ts).toLocaleString("ru"); };
        const statusOf=(ts)=>{ if(!ts) return {t:"нет данных",c:T.muted,bg:"rgba(100,116,139,.15)"}; const min=(now-new Date(ts).getTime())/60000; if(min<=15) return {t:"Активен",c:"#16a34a",bg:"rgba(22,163,74,.15)"}; if(min<=60) return {t:"Простой",c:"#d97706",bg:"rgba(217,119,6,.15)"}; return {t:"Офлайн",c:"#dc2626",bg:"rgba(220,38,38,.12)"}; };
        const dataFor=(m)=>{ const a=m.crm_user_id?byCrm[String(m.crm_user_id)]:null; const ev=[...((a&&a.events)||[]), ...((trackerEvents[m.id])||[])]; return { a, sess:P.computeSessions(ev) }; };
        return (
        <div style={{ maxWidth:1040 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:6,flexWrap:"wrap" }}>
            <h2 style={{color:T.text,margin:0,fontSize:18}}>Активность менеджеров</h2>
            <input type="date" value={presenceDate} max={P.todayStr()} onChange={e=>{ setPresenceDate(e.target.value); loadCrmActivity(e.target.value); }} style={{ background:T.inputBg,border:`1px solid ${T.border}`,color:T.text,padding:"6px 10px",borderRadius:8,fontSize:12,outline:"none",colorScheme:dark?"dark":"light" }}/>
            {!isToday&&<button onClick={()=>{ const t=P.todayStr(); setPresenceDate(t); loadCrmActivity(t); }} style={{ background:"transparent",border:`1px solid ${T.border}`,color:T.sub,padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:12 }}>Сегодня</button>}
            <button onClick={()=>loadCrmActivity()} disabled={crmBusy} style={{ background:crmBusy?T.border:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",padding:"7px 14px",borderRadius:8,cursor:crmBusy?"default":"pointer",fontSize:12,fontWeight:700 }}>{crmBusy?"Обновляю…":"Обновить"}</button>
          </div>
          <p style={{ color:T.muted,fontSize:12,marginBottom:4 }}>«Работал» — суммарное активное время за день, «Простой» — разрывы внутри рабочего окна. Источник: KeyCRM (заказы/карточки) + действия в трекере. Статус — по последней активности.</p>
          <p style={{ color:T.muted,fontSize:11,marginBottom:18 }}>Активен — 15 мин · Простой — 15–60 мин · Офлайн — больше часа. {crmRefreshedAt&&<>Обновлено: {fmtAgo(crmRefreshedAt)}.</>}</p>
          {crmError&&<div style={{ background:T.surface,border:"1px solid #dc2626",borderRadius:10,padding:"12px 16px",color:"#dc2626",fontSize:13,marginBottom:16 }}>{crmError}</div>}
          <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead><tr>{["Менеджер","CRM","Первая","Последняя","Работал","Простой","Статус"].map(h=><th key={h} style={{ ...S.th,fontSize:10 }}>{h}</th>)}</tr></thead>
              <tbody>
                {teamMgrs.map(m=>{
                  const { a, sess }=dataFor(m);
                  const st=isToday?statusOf(a?.last_activity_at):{t:sess.count>0?"был":"нет данных",c:T.sub,bg:"rgba(100,116,139,.12)"};
                  return (
                    <tr key={m.id}>
                      <td style={{ ...S.td,fontWeight:600,color:T.text }}>{m.name} {m.role==="team_lead"&&<span style={{ color:T.muted,fontSize:11,fontWeight:400 }}>тимлид</span>}</td>
                      <td style={{ ...S.td,color:m.crm_user_id?T.sub:T.muted,fontSize:12 }}>{crmName(m)||"— не сопоставлен —"}</td>
                      <td style={{ ...S.td,color:T.sub }}>{P.fmtTime(sess.first)}</td>
                      <td style={{ ...S.td,color:T.sub }}>{P.fmtTime(sess.last)}</td>
                      <td style={{ ...S.td,color:"#16a34a",fontWeight:600 }}>{P.fmtDur(sess.activeMin)}</td>
                      <td style={{ ...S.td,color:"#d97706" }}>{P.fmtDur(sess.idleMin)}</td>
                      <td style={S.td}><span style={{ background:st.bg,color:st.c,padding:"3px 10px",borderRadius:6,fontWeight:700,fontSize:12 }}>{st.t}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {teamMgrs.some(m=>!m.crm_user_id)&&<p style={{ color:T.muted,fontSize:11,marginTop:10 }}>Сопоставление CRM-аккаунтов с менеджерами делает админ во вкладке «Активность».</p>}
        </div>
        );
      })()}
    </div>
  );
}
