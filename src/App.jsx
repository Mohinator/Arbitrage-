import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hbmmbjwnnsralaehdamq.supabase.co";
const SUPABASE_KEY = "sb_publishable_vFYq1gSco_1HRtTca4xqpw_agIuIL5T";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const ADMIN_PASSWORD = "admin2026";
const STATUSES = ["Да", "Нет", "Отправил", "Кинул", "Вернул"];

// ── Styles ──────────────────────────────────────────────────────────────────
const CSS = `
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
.btn-primary {
  background: linear-gradient(135deg,#6366f1,#818cf8);
  color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:600;
  transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(99,102,241,0.3);
}
.btn-primary:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(99,102,241,0.5); filter:brightness(1.1); }
.btn-primary:active { transform:translateY(0); }
.btn-auto {
  background: linear-gradient(135deg,#0f766e,#14b8a6);
  color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:600;
  transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(20,184,166,0.3);
}
.btn-auto:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(20,184,166,0.5); filter:brightness(1.1); }
.btn-ghost { background:transparent; transition: all 0.2s ease; }
.btn-ghost:hover { background:rgba(99,102,241,0.08); }
.btn-danger:hover { background:rgba(239,68,68,0.15) !important; color:#f87171 !important; }
.rd-cell { transition: all 0.15s ease; }
.rd-cell:hover { filter:brightness(1.2); }
.rd-plan { animation: fadeIn 0.3s ease; }
.nav-btn { transition: color 0.15s, border-color 0.15s; }
.nav-btn:hover { color:#a5b4fc !important; }
.status-badge { transition: all 0.15s ease; }
.status-badge:hover { filter:brightness(1.15); transform:scale(1.05); }
.month-row { transition: all 0.3s ease; }
.progress-bar { transition: width 0.8s cubic-bezier(.4,0,.2,1); }
.row-hover:hover td { background:rgba(99,102,241,0.04) !important; }
.alert-pulse { animation: pulse 2s infinite; }
`;

function getStatusStyle(status, dark) {
  if (dark) {
    const m = {
      "Да":       { bg:"linear-gradient(135deg,#14532d,#166534)", color:"#86efac", shadow:"rgba(22,101,52,0.4)" },
      "Нет":      { bg:"#1e2235", color:"#64748b", border:"1px solid #2d3148", shadow:"none" },
      "Кинул":    { bg:"linear-gradient(135deg,#7f1d1d,#991b1b)", color:"#fca5a5", shadow:"rgba(127,29,29,0.4)" },
      "Отправил": { bg:"linear-gradient(135deg,#1e3a5f,#1e40af)", color:"#93c5fd", shadow:"rgba(30,58,95,0.4)" },
      "Вернул":   { bg:"linear-gradient(135deg,#422006,#78350f)", color:"#fbbf24", shadow:"rgba(66,32,6,0.4)" },
    };
    return m[status] || m["Нет"];
  } else {
    const m = {
      "Да":       { bg:"linear-gradient(135deg,#bbf7d0,#86efac)", color:"#14532d", shadow:"rgba(134,239,172,0.4)" },
      "Нет":      { bg:"#e2e8f0", color:"#64748b", border:"1px solid #cbd5e1", shadow:"none" },
      "Кинул":    { bg:"linear-gradient(135deg,#fecaca,#f87171)", color:"#7f1d1d", shadow:"rgba(248,113,113,0.4)" },
      "Отправил": { bg:"linear-gradient(135deg,#bfdbfe,#93c5fd)", color:"#1e3a5f", shadow:"rgba(147,197,253,0.4)" },
      "Вернул":   { bg:"linear-gradient(135deg,#fde68a,#fbbf24)", color:"#78350f", shadow:"rgba(251,191,36,0.4)" },
    };
    return m[status] || m["Нет"];
  }
}

function StatusBadge({ status, onClick, dark }) {
  const s = getStatusStyle(status, dark);
  return (
    <span onClick={onClick} className="status-badge" style={{
      background: s.bg, color: s.color, border: s.border||"none",
      padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700,
      cursor:onClick?"pointer":"default", userSelect:"none", display:"inline-block",
      boxShadow: onClick ? `0 2px 8px ${s.shadow}` : "none"
    }}>{status}</span>
  );
}

function StatusPopup({ x, y, onSelect, onClose, dark }) {
  const ref = useRef();
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const T = dark ? { bg:"#1a1d27", border:"#2d3148" } : { bg:"#f1f5f9", border:"#cbd5e1" };
  return (
    <div ref={ref} style={{ position:"fixed", left:x, top:y, background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:6, zIndex:5000, boxShadow:"0 8px 32px rgba(0,0,0,.4)", minWidth:130, animation:"fadeIn 0.15s ease" }}>
      {STATUSES.map(st => (
        <div key={st} onClick={() => onSelect(st)} style={{ padding:"6px 10px", borderRadius:6, cursor:"pointer", transition:"background 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.background = dark?"rgba(99,102,241,0.12)":"rgba(99,102,241,0.08)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <StatusBadge status={st} dark={dark} />
        </div>
      ))}
    </div>
  );
}

function Toast({ msg, type, onUndo }) {
  if (!msg) return null;
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, background:type==="error"?"linear-gradient(135deg,#ef4444,#dc2626)":"linear-gradient(135deg,#1e2235,#1e3a5f)", border:`1px solid ${type==="error"?"#ef4444":"#6366f1"}`, color:"#fff", padding:"12px 20px", borderRadius:12, fontWeight:600, fontSize:14, boxShadow:"0 8px 32px rgba(0,0,0,0.5)", display:"flex", alignItems:"center", gap:14, animation:"fadeIn 0.2s ease" }}>
      <span>{msg}</span>
      {onUndo && <button onClick={onUndo} className="btn-primary" style={{ padding:"4px 12px", fontSize:13 }}>Отменить</button>}
    </div>
  );
}

// ── Login ────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [token, setToken] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const [mode, setMode] = useState("manager");
  const login = async () => {
    setError(""); setLoading(true);
    if (mode==="admin") { if (token===ADMIN_PASSWORD) onLogin({role:"admin"}); else setError("Неверный пароль"); setLoading(false); return; }
    const { data, error:err } = await supabase.from("managers").select("*").eq("token",token.toUpperCase()).eq("is_active",true).single();
    setLoading(false);
    if (err||!data) { setError("Токен не найден"); return; }
    onLogin({role:"manager",manager:data});
  };
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f1117 0%,#1a1d27 100%)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ width:"100%", maxWidth:400, padding:24 }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ display:"inline-flex", gap:8, alignItems:"center", marginBottom:12 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#818cf8)", boxShadow:"0 0 12px rgba(99,102,241,0.6)" }} />
            <span style={{ fontWeight:800, fontSize:22, color:"#fff", letterSpacing:"0.08em" }}>АРБИТРАЖ</span>
          </div>
          <p style={{ color:"#64748b", fontSize:14 }}>Трекер лидов</p>
        </div>
        <div style={{ background:"rgba(26,29,39,0.95)", border:"1px solid #2d3148", borderRadius:16, padding:28, backdropFilter:"blur(10px)" }}>
          <div style={{ display:"flex", background:"#0f1117", borderRadius:8, padding:3, marginBottom:24 }}>
            {[["manager","Менеджер"],["admin","Админ"]].map(([k,l]) => (
              <button key={k} onClick={() => { setMode(k); setToken(""); setError(""); }} style={{ flex:1, background:mode===k?"linear-gradient(135deg,#6366f1,#818cf8)":"transparent", color:mode===k?"#fff":"#64748b", border:"none", padding:"8px", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:13, transition:"all 0.2s" }}>{l}</button>
            ))}
          </div>
          <label style={{ display:"block", fontSize:11, color:"#64748b", marginBottom:8, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>{mode==="admin"?"Пароль":"Токен доступа"}</label>
          <input value={token} onChange={e=>setToken(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder={mode==="admin"?"Пароль":"Введи токен"} type={mode==="admin"?"password":"text"}
            style={{ width:"100%", background:"#0f1117", border:`1px solid ${error?"#ef4444":"#2d3148"}`, color:"#e2e8f0", padding:"12px 14px", borderRadius:8, fontSize:15, outline:"none", marginBottom:8, boxSizing:"border-box", textTransform:mode==="manager"?"uppercase":"none", letterSpacing:mode==="manager"?"0.1em":"normal", transition:"border-color 0.2s" }} />
          {error && <p style={{ color:"#f87171", fontSize:13, marginBottom:12 }}>{error}</p>}
          <button onClick={login} disabled={loading||!token} className={loading||!token?"":"btn-primary"} style={{ width:"100%", background:loading||!token?"#3730a3":undefined, color:"#fff", border:"none", padding:"12px", borderRadius:8, cursor:loading||!token?"not-allowed":"pointer", fontWeight:700, fontSize:15, marginTop:8 }}>
            {loading?"Проверяем...":"Войти"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Manager Page ─────────────────────────────────────────────────────────────
function ManagerPage({ manager, onLogout }) {
  const [dark, setDark] = useState(true);
  const [platforms, setPlatforms] = useState([]);
  const [players, setPlayers] = useState([]);
  const [redeposits, setRedeposits] = useState([]);
  const [plannedRds, setPlannedRds] = useState([]);
  const [tab, setTab] = useState("main");
  const [toast, setToast] = useState(null);
  const [statusPopup, setStatusPopup] = useState(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showAddRd, setShowAddRd] = useState(null);
  const [showEditRd, setShowEditRd] = useState(null);
  const [showAutomation, setShowAutomation] = useState(false);
  const [automationPreview, setAutomationPreview] = useState([]);
  const [excludedIds, setExcludedIds] = useState(new Set());
  const [hiddenMonths, setHiddenMonths] = useState(new Set());
  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [leadForm, setLeadForm] = useState({ date:new Date().toISOString().slice(0,10), platform_id:"", name:"", sub18:"", deposit:"", is_blik:false, status:"Да", next_rd_date:"" });
  const [rdForm, setRdForm] = useState({ amount:"", date:new Date().toISOString().slice(0,10) });

  const showToast = (msg, type="ok", onUndo=null) => { setToast({msg,type,onUndo}); setTimeout(()=>setToast(null),4000); };

  const load = async () => {
    const [{ data:p },{ data:pl },{ data:rd },{ data:prd }] = await Promise.all([
      supabase.from("platforms").select("*").eq("is_active",true).order("sort_order").order("name"),
      supabase.from("players").select("*").eq("manager_id",manager.id).order("date",{ascending:false}),
      supabase.from("redeposits").select("*"),
      supabase.from("planned_redeposits").select("*"),
    ]);
    setPlatforms(p||[]); setPlayers(pl||[]); setRedeposits(rd||[]); setPlannedRds(prd||[]);
  };
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0,10);
  const getPlayerRds = (pid) => redeposits.filter(r=>r.player_id===pid).sort((a,b)=>a.rd_number-b.rd_number);
  const getPlayerPlanned = (pid) => plannedRds.filter(r=>r.player_id===pid).sort((a,b)=>a.rd_number-b.rd_number);
  const getNextRdNumber = (pid) => getPlayerRds(pid).length + 1;
  const calcTotal = (player) => { const rds=getPlayerRds(player.id); return Number(player.deposit)+rds.reduce((s,r)=>s+Number(r.amount),0); };
  const calcEffectiveTotal = (player) => {
    const rds=getPlayerRds(player.id);
    if (player.status==="Кинул"&&rds.length>0) return Number(player.deposit)+rds.slice(0,-1).reduce((s,r)=>s+Number(r.amount),0);
    return Number(player.deposit)+rds.reduce((s,r)=>s+Number(r.amount),0);
  };
  const getRdStatus = (player) => {
    if (!player.next_rd_date) return "none";
    if (player.next_rd_date<today) return "late";
    if (player.next_rd_date===today) return "today";
    return "ok";
  };
  const formatDate = (d) => { if(!d) return "—"; return d.slice(5).replace("-","."); };
  const getMonthKey = (date) => date ? date.slice(0,7) : "";
  const copyToClipboard = (text) => { navigator.clipboard.writeText(text).then(()=>showToast("Скопировано!")); };

  // ── RD amount generator ──
  const genRdAmount = (minDep) => {
    const min = Number(minDep)||10;
    const r = Math.random()*100;
    if (r<65) return Math.round(min + Math.random()*(min*0.38));         // min → min*1.38
    if (r<85) return Math.round(min*1.4 + Math.random()*(min*0.38));     // min*1.4 → min*1.78
    if (r<95) return Math.round(min*1.8 + Math.random()*(min*0.18));     // min*1.8 → min*1.98
    return Math.round(min*2.0 + Math.random()*(min*0.2));                // min*2.0 → min*2.2
  };

  // ── Automation ──
  const genAutomation = () => {
    const preview = [];
    const activePlayers = players.filter(p=>p.status==="Да"&&!excludedIds.has(p.id));
    const byPlatform = {};
    activePlayers.forEach(p => { if (!byPlatform[p.platform_id]) byPlatform[p.platform_id]=[]; byPlatform[p.platform_id].push(p); });

    Object.entries(byPlatform).forEach(([platformId, platPlayers]) => {
      const plat = platforms.find(p=>p.id===platformId);
      if (!plat) return;
      const minDep = plat.min_deposit||10;
      const targetSch = plat.target_avg_check;
      const playerCount = platPlayers.length;
      const currentTotal = platPlayers.reduce((s,p)=>s+calcEffectiveTotal(p),0);
      const needed = Math.max(0, targetSch*playerCount - currentTotal);
      if (needed<=0) return;

      // Build player plan slots
      const playerPlans = platPlayers.map(p => ({
        player:p,
        existingRds:getPlayerRds(p.id),
        slotsLeft: 9-getPlayerRds(p.id).length,
        rdAmounts:[],
      })).filter(pp=>pp.slotsLeft>0);
      if (!playerPlans.length) return;

      // Iteratively distribute needed amount
      let bestPlans = null, bestDiff = Infinity;
      for (let attempt=0; attempt<300; attempt++) {
        playerPlans.forEach(pp=>pp.rdAmounts=[]);
        let remaining = needed;
        for (let round=0; round<9&&remaining>0; round++) {
          for (const pp of playerPlans) {
            if (pp.rdAmounts.length>=pp.slotsLeft||remaining<=0) continue;
            const amt = genRdAmount(minDep);
            pp.rdAmounts.push(amt);
            remaining -= amt;
          }
        }
        const added = playerPlans.reduce((s,pp)=>s+pp.rdAmounts.reduce((a,b)=>a+b,0),0);
        const newSch = (currentTotal+added)/playerCount;
        const diff = Math.abs(newSch-targetSch);
        if (diff<bestDiff) { bestDiff=diff; bestPlans=playerPlans.map(pp=>({...pp,rdAmounts:[...pp.rdAmounts]})); }
        if (newSch>=targetSch&&diff<1.5) break;
      }
      if (!bestPlans) return;

      bestPlans.forEach(pp => {
        if (!pp.rdAmounts.length) return;
        const depDate = new Date(pp.player.date);
        const existingCount = pp.existingRds.length;
        const monthEnd = new Date(depDate.getFullYear(),depDate.getMonth()+1,0);
        const daysLeft = Math.max(14,Math.floor((monthEnd-depDate)/(1000*60*60*24)));
        const rd1Date = new Date(depDate);
        rd1Date.setDate(rd1Date.getDate()+1+Math.floor(Math.random()*3));

        const rdPlan = pp.rdAmounts.map((amt,i) => {
          const rdDate = new Date(rd1Date);
          if (i>0) rdDate.setDate(rdDate.getDate()+Math.floor(daysLeft/pp.rdAmounts.length)*i+Math.floor(Math.random()*2));
          return { rd_number:existingCount+i+1, amount:amt, date:rdDate.toISOString().slice(0,10) };
        });
        const playerTotal = calcEffectiveTotal(pp.player)+pp.rdAmounts.reduce((s,a)=>s+a,0);
        preview.push({ player:pp.player, plat, rdPlan, total:playerTotal });
      });
    });
    setAutomationPreview(preview);
  };

  const applyAutomation = async () => {
    // Save to planned_redeposits (not redeposits)
    for (const item of automationPreview) {
      // Delete old planned for this player
      await supabase.from("planned_redeposits").delete().eq("player_id",item.player.id);
      for (const rd of item.rdPlan) {
        await supabase.from("planned_redeposits").insert({ player_id:item.player.id, rd_number:rd.rd_number, amount:rd.amount, date:rd.date });
      }
      if (item.rdPlan.length>0) {
        await supabase.from("players").update({ next_rd_date:item.rdPlan[0].date }).eq("id",item.player.id);
      }
    }
    setShowAutomation(false); setAutomationPreview([]);
    showToast("Автоматизация применена!"); load();
  };

  const markPlannedAsDone = async (playerId, rdNumber, amount, date) => {
    await supabase.from("redeposits").insert({ player_id:playerId, rd_number:rdNumber, amount:Number(amount), date });
    await supabase.from("planned_redeposits").delete().eq("player_id",playerId).eq("rd_number",rdNumber);
    const nextRd = new Date(new Date(date).setDate(new Date(date).getDate()+7)).toISOString().slice(0,10);
    await supabase.from("players").update({ next_rd_date:nextRd }).eq("id",playerId);
    showToast("РД выполнен!"); load();
  };

  const addLead = async () => {
    if (!leadForm.platform_id||!leadForm.name||!leadForm.deposit) { showToast("Заполни все поля","error"); return; }
    const nextRd = leadForm.next_rd_date||new Date(new Date().setDate(new Date().getDate()+7)).toISOString().slice(0,10);
    await supabase.from("players").insert({ manager_id:manager.id, platform_id:leadForm.platform_id, date:leadForm.date, name:leadForm.name, sub18:leadForm.sub18, deposit:Number(leadForm.deposit), is_blik:leadForm.is_blik, status:leadForm.status, next_rd_date:nextRd });
    showToast("Лид добавлен!"); setShowAddLead(false);
    setLeadForm({ date:new Date().toISOString().slice(0,10), platform_id:"", name:"", sub18:"", deposit:"", is_blik:false, status:"Да", next_rd_date:"" });
    load();
  };

  const addRd = async (playerId) => {
    if (!rdForm.amount) { showToast("Введи сумму","error"); return; }
    const rdNum = getNextRdNumber(playerId);
    if (rdNum>9) { showToast("Максимум 9 РД","error"); return; }
    await supabase.from("redeposits").insert({ player_id:playerId, rd_number:rdNum, amount:Number(rdForm.amount), date:rdForm.date });
    await supabase.from("planned_redeposits").delete().eq("player_id",playerId).eq("rd_number",rdNum);
    const nextRd = new Date(new Date(rdForm.date).setDate(new Date(rdForm.date).getDate()+7)).toISOString().slice(0,10);
    await supabase.from("players").update({ next_rd_date:nextRd }).eq("id",playerId);
    showToast("РД добавлен!"); setShowAddRd(null);
    setRdForm({ amount:"", date:new Date().toISOString().slice(0,10) }); load();
  };

  const editRd = async () => {
    if (!showEditRd||!showEditRd.amount) { showToast("Введи сумму","error"); return; }
    const rd = redeposits.find(r=>r.player_id===showEditRd.playerId&&r.rd_number===showEditRd.rdNumber);
    if (!rd) return;
    const prev = { amount:rd.amount, date:rd.date };
    await supabase.from("redeposits").update({ amount:Number(showEditRd.amount), date:showEditRd.date }).eq("id",rd.id);
    showToast("РД обновлён!","ok",async()=>{ await supabase.from("redeposits").update(prev).eq("id",rd.id); showToast("Отменено"); load(); });
    setShowEditRd(null); load();
  };

  const resetRd = async (playerId, rdNumber) => {
    const rd = redeposits.find(r=>r.player_id===playerId&&r.rd_number===rdNumber);
    if (!rd) return;
    const prev = { amount:rd.amount, date:rd.date };
    await supabase.from("redeposits").delete().eq("id",rd.id);
    showToast("РД сброшен","ok",async()=>{ await supabase.from("redeposits").insert({...prev,player_id:playerId,rd_number:rdNumber}); showToast("Восстановлено"); load(); });
    setShowEditRd(null); load();
  };

  const updateStatus = async (playerId, status) => {
    await supabase.from("players").update({status}).eq("id",playerId);
    setStatusPopup(null); load();
  };

  const toggleExclude = (id) => setExcludedIds(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleMonth = (mk) => setHiddenMonths(prev=>{ const n=new Set(prev); n.has(mk)?n.delete(mk):n.add(mk); return n; });

  const filteredPlayers = players.filter(p => {
    if (filterPlatform&&p.platform_id!==filterPlatform) return false;
    if (filterStatus&&p.status!==filterStatus) return false;
    return true;
  });

  // Group by month
  const playersByMonth = {};
  filteredPlayers.forEach(p => {
    const mk = getMonthKey(p.date);
    if (!playersByMonth[mk]) playersByMonth[mk]=[];
    playersByMonth[mk].push(p);
  });
  const months = Object.keys(playersByMonth).sort().reverse();

  const todayRds = players.filter(p=>getRdStatus(p)==="today"||getRdStatus(p)==="late");
  const platformStats = platforms.map(plat => {
    const active = players.filter(p=>p.platform_id===plat.id&&p.status==="Да");
    const cnt = active.length, amt = active.reduce((s,p)=>s+calcEffectiveTotal(p),0);
    const avg = cnt>0?amt/cnt:0;
    const blik = active.filter(p=>p.is_blik).length;
    const blikPct = cnt>0?Math.round((blik/cnt)*100):0;
    const need = cnt>0?Math.max(0,plat.target_avg_check*cnt-amt):0;
    return { ...plat, totalCount:cnt, totalAmount:amt, avgCheck:avg, blikCount:blik, blikPct, needMore:need };
  });

  // Theme
  const T = dark ? {
    bg:"#0f1117", surface:"#1a1d27", border:"#2d3148", text:"#e2e8f0", muted:"#64748b", sub:"#94a3b8",
    navBg:"#151824", hdrBg:"#1a1d27", inputBg:"#0f1117", alertBg:"#1c160a", alertBorder:"#d97706",
    thBg:"#151824", rowBorder:"#1e2235", rdPlan:"#3d4268", rdFact:"#e2e8f0", monthHdr:"#1e2235",
  } : {
    bg:"#eef0f5", surface:"#f5f6fa", border:"#dde1ea", text:"#1e293b", muted:"#94a3b8", sub:"#64748b",
    navBg:"#f0f2f7", hdrBg:"#f0f2f7", inputBg:"#e8eaf0", alertBg:"#fffbeb", alertBorder:"#fcd34d",
    thBg:"#e8eaf0", rowBorder:"#e2e6ef", rdPlan:"#c4c9d8", rdFact:"#1e293b", monthHdr:"#e2e6ef",
  };

  const IS = { background:T.inputBg, border:`1px solid ${T.border}`, color:T.text, padding:"8px 10px", borderRadius:7, fontSize:13, outline:"none", width:"100%", boxSizing:"border-box", transition:"border-color 0.2s" };
  const S = {
    th: { padding:"8px 10px", textAlign:"left", fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:".07em", borderBottom:`1px solid ${T.border}`, background:T.thBg, whiteSpace:"nowrap" },
    td: { padding:"7px 10px", borderBottom:`1px solid ${T.rowBorder}`, verticalAlign:"middle", whiteSpace:"nowrap" },
    rdTh: { padding:"8px 5px", textAlign:"center", fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", borderBottom:`1px solid ${T.border}`, background:T.thBg, width:44 },
    rdTd: { padding:"6px 5px", textAlign:"center", borderBottom:`1px solid ${T.rowBorder}`, verticalAlign:"middle", width:44 },
  };

  const Modal = ({ children, onClose }) => (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:24, width:"100%", maxWidth:500, maxHeight:"90vh", overflowY:"auto", animation:"fadeIn 0.2s ease", boxShadow:"0 24px 64px rgba(0,0,0,0.6)" }}>
        {children}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"'Inter',sans-serif" }}>
      <style>{CSS}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onUndo={toast.onUndo} />}
      {statusPopup && <StatusPopup x={statusPopup.x} y={statusPopup.y} onSelect={st=>updateStatus(statusPopup.playerId,st)} onClose={()=>setStatusPopup(null)} dark={dark} />}

      {/* Add Lead */}
      {showAddLead && (
        <Modal onClose={()=>setShowAddLead(false)}>
          <h3 style={{ color:T.text, marginBottom:18, fontSize:15, fontWeight:700 }}>Добавить лида</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            {[["Дата","date","date"],["Продукт","platform_id","select"],["Имя лида","name","text"],["SUB18","sub18","text"],["Депозит (€)","deposit","number"]].map(([label,key,type]) => (
              <div key={key} style={{ gridColumn:key==="name"?"1/-1":undefined }}>
                <label style={{ display:"block", fontSize:10, color:T.muted, marginBottom:4, fontWeight:700, textTransform:"uppercase" }}>{label}</label>
                {type==="select" ? (
                  <select value={leadForm[key]} onChange={e=>setLeadForm(f=>({...f,[key]:e.target.value}))} style={IS}>
                    <option value="">Выбери платформу</option>
                    {platforms.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                ) : <input type={type} value={leadForm[key]} onChange={e=>setLeadForm(f=>({...f,[key]:e.target.value}))} style={IS} />}
              </div>
            ))}
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ display:"block", fontSize:10, color:T.muted, marginBottom:6, fontWeight:700, textTransform:"uppercase" }}>Через BLIK?</label>
            <div style={{ display:"flex", background:T.inputBg, borderRadius:7, padding:2, gap:2, width:"fit-content" }}>
              {[["Нет",false],["BLIK",true]].map(([label,val]) => (
                <button key={String(val)} onClick={()=>setLeadForm(f=>({...f,is_blik:val}))} style={{ border:"none", padding:"5px 14px", borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:600, background:leadForm.is_blik===val?(val?"linear-gradient(135deg,#d97706,#f59e0b)":"linear-gradient(135deg,#6366f1,#818cf8)"):"transparent", color:leadForm.is_blik===val?"#fff":T.muted, transition:"all 0.2s" }}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ display:"block", fontSize:10, color:T.muted, marginBottom:6, fontWeight:700, textTransform:"uppercase" }}>Статус</label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {STATUSES.map(st => (
                <span key={st} onClick={()=>setLeadForm(f=>({...f,status:st}))} style={{ cursor:"pointer", outline:leadForm.status===st?"2px solid #6366f1":"none", borderRadius:20, outlineOffset:2 }}>
                  <StatusBadge status={st} dark={dark} />
                </span>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:18 }}>
            <label style={{ display:"block", fontSize:10, color:T.muted, marginBottom:6, fontWeight:700, textTransform:"uppercase" }}>Следующий РД</label>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input type="date" value={leadForm.next_rd_date} onChange={e=>setLeadForm(f=>({...f,next_rd_date:e.target.value}))} style={{ ...IS, flex:1 }} />
              {[7,14].map(d => <button key={d} onClick={()=>{ const dt=new Date(); dt.setDate(dt.getDate()+d); setLeadForm(f=>({...f,next_rd_date:dt.toISOString().slice(0,10)})); }} className="btn-ghost" style={{ border:`1px solid ${T.border}`, color:T.sub, padding:"7px 10px", borderRadius:7, cursor:"pointer", fontSize:11 }}>+{d} дн.</button>)}
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={addLead} className="btn-primary" style={{ flex:1, padding:"10px", fontSize:14 }}>Добавить</button>
            <button onClick={()=>setShowAddLead(false)} className="btn-ghost" style={{ flex:1, border:`1px solid ${T.border}`, color:T.sub, padding:"10px", borderRadius:8, cursor:"pointer" }}>Отмена</button>
          </div>
        </Modal>
      )}

      {/* Add RD */}
      {showAddRd && (
        <Modal onClose={()=>setShowAddRd(null)}>
          <h3 style={{ color:T.text, marginBottom:6, fontSize:15, fontWeight:700 }}>Внести редепозит</h3>
          <p style={{ color:T.muted, fontSize:13, marginBottom:18 }}>{players.find(p=>p.id===showAddRd)?.name} — РД{getNextRdNumber(showAddRd)}</p>
          {[["Сумма (€)","amount","number"],["Дата","date","date"]].map(([label,key,type]) => (
            <div key={key} style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:10, color:T.muted, marginBottom:5, fontWeight:700, textTransform:"uppercase" }}>{label}</label>
              <input type={type} value={rdForm[key]} onChange={e=>setRdForm(f=>({...f,[key]:e.target.value}))} style={IS} />
            </div>
          ))}
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button onClick={()=>addRd(showAddRd)} className="btn-primary" style={{ flex:1, padding:"10px", fontSize:14 }}>Сохранить</button>
            <button onClick={()=>setShowAddRd(null)} className="btn-ghost" style={{ flex:1, border:`1px solid ${T.border}`, color:T.sub, padding:"10px", borderRadius:8, cursor:"pointer" }}>Отмена</button>
          </div>
        </Modal>
      )}

      {/* Edit RD */}
      {showEditRd && (
        <Modal onClose={()=>setShowEditRd(null)}>
          <h3 style={{ color:T.text, marginBottom:6, fontSize:15, fontWeight:700 }}>Редактировать РД{showEditRd.rdNumber}</h3>
          <p style={{ color:T.muted, fontSize:13, marginBottom:18 }}>{players.find(p=>p.id===showEditRd.playerId)?.name}</p>
          {[["Сумма (€)","amount","number"],["Дата","date","date"]].map(([label,key,type]) => (
            <div key={key} style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:10, color:T.muted, marginBottom:5, fontWeight:700, textTransform:"uppercase" }}>{label}</label>
              <input type={type} value={showEditRd[key]} onChange={e=>setShowEditRd(prev=>({...prev,[key]:e.target.value}))} style={IS} />
            </div>
          ))}
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button onClick={editRd} className="btn-primary" style={{ flex:1, padding:"10px", fontSize:14 }}>Сохранить</button>
            <button onClick={()=>resetRd(showEditRd.playerId,showEditRd.rdNumber)} style={{ background:"linear-gradient(135deg,#7f1d1d,#991b1b)", color:"#fca5a5", border:"none", padding:"10px 16px", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:14, transition:"all 0.2s" }}>Сбросить РД</button>
            <button onClick={()=>setShowEditRd(null)} className="btn-ghost" style={{ flex:1, border:`1px solid ${T.border}`, color:T.sub, padding:"10px", borderRadius:8, cursor:"pointer" }}>Отмена</button>
          </div>
        </Modal>
      )}

      {/* Automation */}
      {showAutomation && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:24, width:"100%", maxWidth:760, maxHeight:"85vh", overflowY:"auto", animation:"fadeIn 0.2s ease", boxShadow:"0 24px 64px rgba(0,0,0,0.7)" }}>
            <h3 style={{ color:T.text, marginBottom:4, fontSize:15, fontWeight:700 }}>Предпросмотр автоматизации</h3>
            <p style={{ color:T.muted, fontSize:13, marginBottom:18 }}>РД распределены для достижения целевого СЧ платформы</p>
            {automationPreview.length===0 ? <p style={{ color:T.muted }}>Нет лидов для автоматизации</p> : (
              <div style={{ border:`1px solid ${T.border}`, borderRadius:8, overflow:"hidden", marginBottom:18 }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead><tr style={{ background:T.thBg }}>{["Лид","Платформа","РД1","РД2","РД3","РД4","РД5","РД6","РД7","РД8","РД9","СЧ"].map(h=>(
                    <th key={h} style={{ padding:"8px 8px", textAlign:"left", fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", borderBottom:`1px solid ${T.border}` }}>{h}</th>
                  ))}</tr></thead>
                  <tbody>
                    {automationPreview.map(item => {
                      const rdArr = Array(9).fill(null).map((_,i)=>item.rdPlan.find(r=>r.rd_number===i+1)||null);
                      const platPlayers = automationPreview.filter(x=>x.plat.id===item.plat.id);
                      const platCurrentTotal = platPlayers.reduce((s,x)=>s+calcEffectiveTotal(x.player),0);
                      const platAdded = platPlayers.reduce((s,x)=>s+x.rdPlan.reduce((a,r)=>a+r.amount,0),0);
                      const platCount = platPlayers.length;
                      const newSch = platCount>0?(platCurrentTotal+platAdded)/platCount:0;
                      const ok = newSch>=item.plat.target_avg_check;
                      return (
                        <tr key={item.player.id}>
                          <td style={{ padding:"8px", color:T.text, fontSize:12, fontWeight:500, borderBottom:`1px solid ${T.rowBorder}` }}>{item.player.name}</td>
                          <td style={{ padding:"8px", color:T.sub, fontSize:11, borderBottom:`1px solid ${T.rowBorder}` }}>{item.plat.name}</td>
                          {rdArr.map((rd,i) => (
                            <td key={i} style={{ padding:"6px 4px", textAlign:"center", fontSize:11, borderBottom:`1px solid ${T.rowBorder}`, color:rd?"#818cf8":T.border }}>
                              {rd?<div><div style={{ fontWeight:600 }}>{rd.amount}€</div><div style={{ fontSize:9, color:T.muted }}>{formatDate(rd.date)}</div></div>:"—"}
                            </td>
                          ))}
                          <td style={{ padding:"8px", borderBottom:`1px solid ${T.rowBorder}` }}>
                            <span style={{ background:ok?(dark?"linear-gradient(135deg,#14532d,#166534)":"linear-gradient(135deg,#bbf7d0,#86efac)"):(dark?"linear-gradient(135deg,#7f1d1d,#991b1b)":"linear-gradient(135deg,#fecaca,#f87171)"), color:ok?(dark?"#86efac":"#14532d"):(dark?"#fca5a5":"#7f1d1d"), padding:"2px 7px", borderRadius:5, fontWeight:700, fontSize:11 }}>{newSch.toFixed(1)}€</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={applyAutomation} className="btn-primary" style={{ flex:1, padding:"10px", fontSize:14 }}>Применить</button>
              <button onClick={genAutomation} className="btn-auto" style={{ flex:1, padding:"10px", fontSize:14 }}>Перегенерировать</button>
              <button onClick={()=>setShowAutomation(false)} className="btn-ghost" style={{ flex:1, border:`1px solid ${T.border}`, color:T.sub, padding:"10px", borderRadius:8, cursor:"pointer" }}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background:T.hdrBg, borderBottom:`1px solid ${T.border}`, padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#818cf8)", boxShadow:"0 0 8px rgba(99,102,241,0.6)" }} />
          <span style={{ fontWeight:800, fontSize:15, color:T.text, letterSpacing:"0.05em" }}>АРБИТРАЖ</span>
          <span style={{ background:"linear-gradient(135deg,#6366f1,#818cf8)", color:"#fff", fontSize:10, padding:"1px 7px", borderRadius:4, fontWeight:700 }}>МЕНЕДЖЕР</span>
          <span style={{ color:T.muted, fontSize:13 }}>/ {manager.name}</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={()=>{ genAutomation(); setShowAutomation(true); }} className="btn-auto" style={{ padding:"7px 14px", fontSize:12, fontWeight:600, borderRadius:8 }}>⚡ Автоматизация</button>
          <button onClick={()=>setShowAddLead(true)} className="btn-primary" style={{ padding:"7px 16px", fontSize:13, borderRadius:8 }}>+ Добавить лида</button>
          <button onClick={()=>setDark(d=>!d)} className="btn-ghost" style={{ border:`1px solid ${T.border}`, color:T.sub, padding:"7px 10px", borderRadius:7, cursor:"pointer", fontSize:14 }}>{dark?"☀️":"🌙"}</button>
          <button onClick={onLogout} className="btn-ghost" style={{ border:`1px solid ${T.border}`, color:T.sub, padding:"7px 14px", borderRadius:7, cursor:"pointer", fontSize:13 }}>Выйти</button>
        </div>
      </div>

      {/* Nav */}
      <div style={{ background:T.navBg, borderBottom:`1px solid ${T.border}`, padding:"0 20px", display:"flex" }}>
        {[["main","Главная"],["stats","Статистика"],["platforms","Платформы"]].map(([key,label]) => (
          <button key={key} onClick={()=>setTab(key)} className="nav-btn" style={{ background:"transparent", border:"none", color:tab===key?"#6366f1":T.muted, padding:"12px 16px", cursor:"pointer", fontSize:13, fontWeight:600, borderBottom:tab===key?"2px solid #6366f1":"2px solid transparent" }}>{label}</button>
        ))}
      </div>

      {/* MAIN */}
      {tab==="main" && (
        <div style={{ padding:"16px 20px" }}>
          {todayRds.length>0 && (
            <div style={{ background:T.alertBg, border:`1px solid ${T.alertBorder}`, borderRadius:10, padding:"10px 16px", display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <span className="alert-pulse" style={{ fontSize:18 }}>🔔</span>
              <span style={{ color:"#d97706", fontWeight:700, fontSize:13 }}>Сегодня нужно сделать РД:</span>
              <span style={{ color:dark?"#fbbf24":"#92400e", fontSize:13 }}>{todayRds.map(p=>p.name).join(" · ")}</span>
            </div>
          )}
          <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12, flexWrap:"wrap" }}>
            <select value={filterPlatform} onChange={e=>setFilterPlatform(e.target.value)} style={{ background:T.surface, border:`1px solid ${T.border}`, color:T.sub, padding:"6px 10px", borderRadius:7, fontSize:12, outline:"none" }}>
              <option value="">Все платформы</option>
              {platforms.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ background:T.surface, border:`1px solid ${T.border}`, color:T.sub, padding:"6px 10px", borderRadius:7, fontSize:12, outline:"none" }}>
              <option value="">Все статусы</option>
              {STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
            <span style={{ color:T.muted, fontSize:12, marginLeft:"auto" }}>Показано: <strong style={{ color:T.text }}>{filteredPlayers.length}</strong> лидов</span>
          </div>

          <div style={{ overflowX:"auto", border:`1px solid ${T.border}`, borderRadius:10 }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr><th style={S.th} colSpan={16}>МОИ ЛИДЫ</th></tr>
                <tr>
                  <th style={S.th}></th>
                  <th style={S.th}>Дата</th>
                  <th style={S.th}>Продукт</th>
                  <th style={S.th}>Имя</th>
                  <th style={S.th}>SUB18</th>
                  <th style={S.th}>Деп</th>
                  {Array(9).fill(0).map((_,i)=><th key={i} style={S.rdTh}>Рд{i+1}</th>)}
                  <th style={S.th}>Всего</th>
                  <th style={S.th}>Статус</th>
                  <th style={S.th}>BLIK</th>
                  <th style={S.th}>След. РД</th>
                  <th style={S.th}>Действие</th>
                </tr>
              </thead>
              <tbody>
                {months.map(mk => {
                  const monthPlayers = playersByMonth[mk]||[];
                  const isHidden = hiddenMonths.has(mk);
                  const [yr,mo] = mk.split("-");
                  const monthLabel = new Date(Number(yr),Number(mo)-1,1).toLocaleString("ru",{month:"long",year:"numeric"});
                  return (
                    <>
                      <tr key={`month-${mk}`} className="month-row">
                        <td colSpan={17} style={{ padding:"8px 12px", background:T.monthHdr, borderBottom:`1px solid ${T.border}`, borderTop:`1px solid ${T.border}` }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <button onClick={()=>toggleMonth(mk)} style={{ background:"transparent", border:`1px solid ${T.border}`, color:T.sub, padding:"3px 10px", borderRadius:6, cursor:"pointer", fontSize:11, transition:"all 0.2s", display:"flex", alignItems:"center", gap:4 }}>
                              {isHidden?"▶":"▼"} {isHidden?"Показать":"Скрыть"}
                            </button>
                            <span style={{ color:T.text, fontWeight:600, fontSize:12 }}>{monthLabel}</span>
                            <span style={{ color:T.muted, fontSize:11 }}>{monthPlayers.length} лидов</span>
                          </div>
                        </td>
                      </tr>
                      {!isHidden && monthPlayers.map(player => {
                        const rds = getPlayerRds(player.id);
                        const planned = getPlayerPlanned(player.id);
                        const rdArr = Array(9).fill(null).map((_,i) => {
                          const fact = rds.find(r=>r.rd_number===i+1);
                          const plan = planned.find(r=>r.rd_number===i+1);
                          return fact?{...fact,isFact:true}:plan?{...plan,isFact:false}:null;
                        });
                        const total = calcTotal(player);
                        const rdStatus = getRdStatus(player);
                        const plat = platforms.find(p=>p.id===player.platform_id);
                        const isExcluded = excludedIds.has(player.id);
                        return (
                          <tr key={player.id} className="row-hover" style={{ opacity:isExcluded?0.4:1 }}>
                            <td style={S.td}>
                              <input type="checkbox" checked={isExcluded} onChange={()=>toggleExclude(player.id)} style={{ cursor:"pointer", width:13, height:13, accentColor:"#6366f1" }} />
                            </td>
                            <td style={{ ...S.td, color:T.muted, fontSize:11 }}>{player.date}</td>
                            <td style={{ ...S.td, color:T.text, fontSize:11, maxWidth:140, overflow:"hidden", textOverflow:"ellipsis" }}>{plat?.name||"—"}</td>
                            <td style={{ ...S.td, color:T.text, fontSize:12, fontWeight:500 }}>{player.name}</td>
                            <td style={{ ...S.td, color:T.muted, fontSize:10, fontFamily:"monospace", cursor:"pointer" }} onClick={()=>player.sub18&&copyToClipboard(player.sub18)} title="Скопировать">
                              <span style={{ borderBottom:`1px dashed ${T.border}` }}>{player.sub18||"—"}</span>
                            </td>
                            <td style={{ ...S.td, color:T.text, fontWeight:600 }}>{player.deposit}€</td>
                            {rdArr.map((rd,i) => {
                              const isToday = rd&&!rd.isFact&&rd.date===today;
                              const rdColor = isToday?"#f59e0b":rd?(rd.isFact?T.rdFact:T.rdPlan):T.border;
                              return (
                                <td key={i} className="rd-cell" style={{ ...S.rdTd, color:rdColor, fontWeight:rd?.isFact?700:400, cursor:rd?"pointer":"default", lineHeight:1.3 }}
                                  onClick={() => {
                                    if (!rd) return;
                                    if (rd.isFact) setShowEditRd({ playerId:player.id, rdNumber:rd.rd_number, amount:rd.amount, date:rd.date });
                                    else markPlannedAsDone(player.id,rd.rd_number,rd.amount,rd.date);
                                  }}
                                  title={rd?.isFact?"Изменить":rd?"Отметить выполненным":""}>
                                  {rd ? (
                                    <div>
                                      <div style={{ fontSize:11 }}>{rd.amount}€</div>
                                      <div style={{ fontSize:9, color:isToday?"#f59e0b":T.muted, marginTop:1 }}>{formatDate(rd.date)}</div>
                                    </div>
                                  ) : "—"}
                                </td>
                              );
                            })}
                            <td style={{ ...S.td, color:T.text, fontWeight:700 }}>{total}€</td>
                            <td style={S.td}>
                              <StatusBadge status={player.status} dark={dark} onClick={e=>setStatusPopup({playerId:player.id,x:e.clientX-10,y:e.clientY+8})} />
                            </td>
                            <td style={S.td}>
                              {player.is_blik && <span style={{ background:dark?"linear-gradient(135deg,#451a03,#78350f)":"linear-gradient(135deg,#fef3c7,#fde68a)", color:dark?"#d97706":"#92400e", padding:"2px 6px", borderRadius:4, fontSize:10, fontWeight:700 }}>BLIK</span>}
                            </td>
                            <td style={S.td}>
                              {rdStatus==="today"&&<span style={{ color:"#f59e0b", fontWeight:700, fontSize:11 }}>⚠ {formatDate(player.next_rd_date)}</span>}
                              {rdStatus==="late"&&<span style={{ color:"#f87171", fontWeight:700, fontSize:11 }}>⚠ {formatDate(player.next_rd_date)}</span>}
                              {rdStatus==="ok"&&<span style={{ color:T.sub, fontSize:11 }}>{formatDate(player.next_rd_date)}</span>}
                              {rdStatus==="none"&&<span style={{ color:T.border, fontSize:11 }}>—</span>}
                            </td>
                            <td style={S.td}>
                              <button onClick={()=>setShowAddRd(player.id)} className={rdStatus==="today"||rdStatus==="late"?"btn-primary":"btn-ghost"} style={{ padding:"3px 10px", fontSize:11, borderRadius:6, border:rdStatus==="today"||rdStatus==="late"?undefined:`1px solid ${T.border}`, color:rdStatus==="today"||rdStatus==="late"?undefined:T.sub, cursor:"pointer" }}>
                                Внести РД
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })}
                {filteredPlayers.length===0&&<tr><td colSpan={17} style={{ padding:24, textAlign:"center", color:T.muted }}>Нет лидов</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STATS */}
      {tab==="stats" && (
        <div style={{ padding:"16px 20px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
            {[
              ["Всего лидов",players.length,`активных: ${players.filter(p=>p.status==="Да").length}`,"#6366f1"],
              ["Общая сумма",players.filter(p=>p.status==="Да").reduce((s,p)=>s+calcEffectiveTotal(p),0).toFixed(0)+"€","деп + редепы","#14b8a6"],
              ["BLIK",players.filter(p=>p.is_blik&&p.status==="Да").length,`${players.filter(p=>p.status==="Да").length>0?Math.round(players.filter(p=>p.is_blik&&p.status==="Да").length/players.filter(p=>p.status==="Да").length*100):0}% от активных`,"#d97706"],
              ["Нужно добрать",platformStats.reduce((s,p)=>s+p.needMore,0).toFixed(0)+"€","до цели СЧ","#f59e0b"],
            ].map(([label,val,sub,accent]) => (
              <div key={label} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"14px 16px", borderLeft:`3px solid ${accent}`, transition:"all 0.2s" }}>
                <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:22, fontWeight:700, color:T.text }}>{val}</div>
                <div style={{ fontSize:11, color:T.sub, marginTop:2 }}>{sub}</div>
              </div>
            ))}
          </div>
          <div style={{ border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>{["Платформа","Лидов","Сумма","BLIK","СЧ цель","СЧ факт","Нужно добрать"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {platformStats.map(p => {
                  const ok = p.avgCheck>=p.target_avg_check;
                  const pct = p.target_avg_check>0?Math.min(100,Math.round((p.avgCheck/p.target_avg_check)*100)):0;
                  return (
                    <tr key={p.id} className="row-hover">
                      <td style={{ ...S.td, fontWeight:600, color:T.text }}>{p.name}</td>
                      <td style={{ ...S.td, color:T.sub }}>{p.totalCount}</td>
                      <td style={{ ...S.td, color:T.sub }}>{p.totalAmount.toFixed(0)}€</td>
                      <td style={S.td}>
                        {p.totalCount>0?<div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <div style={{ width:44, background:T.rowBorder, borderRadius:3, height:5, overflow:"hidden", display:"flex" }}>
                            <div className="progress-bar" style={{ width:`${100-p.blikPct}%`, height:"100%", background:"linear-gradient(90deg,#6366f1,#818cf8)" }} />
                            <div className="progress-bar" style={{ width:`${p.blikPct}%`, height:"100%", background:"linear-gradient(90deg,#d97706,#f59e0b)" }} />
                          </div>
                          <span style={{ color:"#d97706", fontSize:11 }}>{p.blikCount} ({p.blikPct}%)</span>
                        </div>:<span style={{ color:T.muted }}>—</span>}
                      </td>
                      <td style={{ ...S.td, color:T.sub }}>{p.target_avg_check}€</td>
                      <td style={S.td}>
                        {p.totalCount>0?<span style={{ background:ok?(dark?"linear-gradient(135deg,#14532d,#166534)":"linear-gradient(135deg,#bbf7d0,#86efac)"):(dark?"linear-gradient(135deg,#7f1d1d,#991b1b)":"linear-gradient(135deg,#fecaca,#f87171)"), color:ok?(dark?"#86efac":"#14532d"):(dark?"#fca5a5":"#7f1d1d"), padding:"2px 9px", borderRadius:6, fontWeight:700, fontSize:11 }}>{p.avgCheck.toFixed(1)}€</span>:<span style={{ color:T.muted }}>—</span>}
                      </td>
                      <td style={{ ...S.td, color:"#f59e0b", fontWeight:700 }}>{p.totalCount>0?p.needMore.toFixed(0)+"€":"—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PLATFORMS */}
      {tab==="platforms" && (
        <div style={{ padding:"16px 20px" }}>
          <div style={{ border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>{["Платформа","Дата","Мин. деп","Цель СЧ","Капа","Мои лиды","Статус"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {platformStats.map(p => (
                  <tr key={p.id} className="row-hover">
                    <td style={{ ...S.td, fontWeight:600, color:T.text }}>{p.name}</td>
                    <td style={{ ...S.td, color:T.sub, fontSize:12 }}>{p.date_added||"—"}</td>
                    <td style={{ ...S.td, color:T.sub }}>{p.min_deposit||"—"}€</td>
                    <td style={S.td}><span style={{ background:"linear-gradient(135deg,#1e3a5f,#1e40af)", color:"#93c5fd", padding:"2px 9px", borderRadius:6, fontWeight:700, fontSize:11 }}>{p.target_avg_check}€</span></td>
                    <td style={{ ...S.td, color:T.sub }}>{p.cap||"—"}</td>
                    <td style={{ ...S.td, color:dark?"#a5b4fc":"#4f46e5", fontWeight:700 }}>{p.totalCount}</td>
                    <td style={S.td}><span style={{ background:"linear-gradient(135deg,#14532d,#166534)", color:"#86efac", padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:600 }}>Активна</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Page ───────────────────────────────────────────────────────────────
function AdminPage({ onLogout }) {
  const [managers, setManagers] = useState([]); const [platforms, setPlatforms] = useState([]); const [players, setPlayers] = useState([]); const [redeposits, setRedeposits] = useState([]);
  const [tab, setTab] = useState("overview"); const [toast, setToast] = useState(null); const [newName, setNewName] = useState("");
  const [showPlatformForm, setShowPlatformForm] = useState(false); const [editingPlatform, setEditingPlatform] = useState(null);
  const [pForm, setPForm] = useState({ name:"", target_avg_check:"", min_deposit:"", cap:"", date_added:"", is_active:true, reset_monthly:false });

  const showToast = (msg,type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const load = async () => {
    const [{ data:m },{ data:p },{ data:pl },{ data:rd }] = await Promise.all([
      supabase.from("managers").select("*").order("created_at"),
      supabase.from("platforms").select("*").order("sort_order").order("name"),
      supabase.from("players").select("*"),
      supabase.from("redeposits").select("*"),
    ]);
    setManagers(m||[]); setPlatforms(p||[]); setPlayers(pl||[]); setRedeposits(rd||[]);
  };
  useEffect(()=>{load();},[]);

  const createManager = async () => {
    if (!newName.trim()) return;
    const token = Math.random().toString(36).substring(2,10).toUpperCase();
    await supabase.from("managers").insert({name:newName.trim(),token});
    showToast(`Создан! Токен: ${token}`); setNewName(""); load();
  };
  const deleteManager = async (id) => { if (!confirm("Удалить?")) return; await supabase.from("managers").delete().eq("id",id); load(); };
  const toggleManager = async (m) => { await supabase.from("managers").update({is_active:!m.is_active}).eq("id",m.id); load(); };

  const openPlatformForm = (p=null) => {
    setEditingPlatform(p);
    setPForm(p?{name:p.name,target_avg_check:p.target_avg_check,min_deposit:p.min_deposit||"",cap:p.cap||"",date_added:p.date_added||"",is_active:p.is_active!==false,reset_monthly:p.reset_monthly||false}:{name:"",target_avg_check:"",min_deposit:"",cap:"",date_added:new Date().toISOString().slice(0,10),is_active:true,reset_monthly:false});
    setShowPlatformForm(true);
  };
  const savePlatform = async () => {
    if (!pForm.name||!pForm.target_avg_check) { showToast("Заполни обязательные поля","error"); return; }
    const data = {name:pForm.name,target_avg_check:Number(pForm.target_avg_check),min_deposit:Number(pForm.min_deposit)||0,cap:pForm.cap?Number(pForm.cap):null,date_added:pForm.date_added||null,is_active:pForm.is_active,reset_monthly:pForm.reset_monthly};
    if (editingPlatform) { await supabase.from("platforms").update(data).eq("id",editingPlatform.id); showToast("Обновлено!"); }
    else { await supabase.from("platforms").insert(data); showToast("Добавлено!"); }
    setShowPlatformForm(false); load();
  };
  const deletePlatform = async (id) => { if (!confirm("Удалить?")) return; await supabase.from("platforms").delete().eq("id",id); load(); };

  const getPlayerRds = (pid) => redeposits.filter(r=>r.player_id===pid);
  const calcEffectiveTotal = (player) => {
    const rds = getPlayerRds(player.id).sort((a,b)=>a.rd_number-b.rd_number);
    if (player.status==="Кинул"&&rds.length>0) return Number(player.deposit)+rds.slice(0,-1).reduce((s,r)=>s+Number(r.amount),0);
    return Number(player.deposit)+rds.reduce((s,r)=>s+Number(r.amount),0);
  };

  const platformStats = platforms.map(plat => {
    const active = players.filter(p=>p.platform_id===plat.id&&p.status==="Да");
    const cnt=active.length, amt=active.reduce((s,p)=>s+calcEffectiveTotal(p),0);
    const avg=cnt>0?amt/cnt:0, blik=active.filter(p=>p.is_blik).length;
    const blikPct=cnt>0?Math.round((blik/cnt)*100):0;
    return {...plat,totalCount:cnt,totalAmount:amt,avgCheck:avg,blikCount:blik,blikPct,allCount:players.filter(p=>p.platform_id===plat.id).length};
  });

  const managerStats = managers.map(m => {
    const mp = players.filter(p=>p.manager_id===m.id&&p.status==="Да");
    const cnt=mp.length, amt=mp.reduce((s,p)=>s+calcEffectiveTotal(p),0);
    const byPlatform = platforms.map(plat => {
      const pp=mp.filter(p=>p.platform_id===plat.id), c=pp.length, a=pp.reduce((s,p)=>s+calcEffectiveTotal(p),0);
      const blik=pp.filter(p=>p.is_blik).length, blikPct=c>0?Math.round((blik/c)*100):0;
      return {...plat,cnt:c,amt:a,avg:c>0?a/c:0,blik,blikPct};
    }).filter(p=>p.cnt>0);
    return {...m,totalCount:cnt,totalAmount:amt,byPlatform};
  });

  const S = {
    th:{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:"1px solid #2d3148",background:"#151824"},
    td:{padding:"12px 12px",borderBottom:"1px solid #1a1d27"},
  };
  const IS = {background:"#0f1117",border:"1px solid #2d3148",color:"#e2e8f0",padding:"8px 10px",borderRadius:7,fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"};

  return (
    <div style={{minHeight:"100vh",background:"#0f1117",color:"#e2e8f0",fontFamily:"'Inter',sans-serif"}}>
      <style>{CSS}</style>
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}

      {showPlatformForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#1a1d27",border:"1px solid #2d3148",borderRadius:14,padding:24,width:"100%",maxWidth:460,animation:"fadeIn 0.2s ease",boxShadow:"0 24px 64px rgba(0,0,0,0.7)"}}>
            <h3 style={{color:"#fff",marginBottom:18,fontSize:15,fontWeight:700}}>{editingPlatform?"Редактировать":"Добавить"} платформу</h3>
            {[["Название *","name","text"],["Цель СЧ (€) *","target_avg_check","number"],["Мин. депозит (€)","min_deposit","number"],["Капа","cap","number"],["Дата добавления","date_added","date"]].map(([label,key,type])=>(
              <div key={key} style={{marginBottom:12}}>
                <label style={{display:"block",fontSize:10,color:"#64748b",marginBottom:4,fontWeight:700,textTransform:"uppercase"}}>{label}</label>
                <input type={type} value={pForm[key]} onChange={e=>setPForm(f=>({...f,[key]:e.target.value}))} style={IS}/>
              </div>
            ))}
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}>
              {[["is_active","Платформа активна"],["reset_monthly","Сбрасывать СЧ каждый месяц"]].map(([key,label])=>(
                <label key={key} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                  <input type="checkbox" checked={pForm[key]} onChange={e=>setPForm(f=>({...f,[key]:e.target.checked}))} style={{width:14,height:14,accentColor:"#6366f1",cursor:"pointer"}}/>
                  <span style={{color:"#94a3b8",fontSize:13}}>{label}</span>
                  {key==="reset_monthly"&&<span style={{color:"#64748b",fontSize:11}}>(каждый месяц статистика начинается заново)</span>}
                </label>
              ))}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={savePlatform} className="btn-primary" style={{flex:1,padding:"10px",fontSize:14}}>Сохранить</button>
              <button onClick={()=>setShowPlatformForm(false)} className="btn-ghost" style={{flex:1,border:"1px solid #2d3148",color:"#94a3b8",padding:"10px",borderRadius:8,cursor:"pointer"}}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      <div style={{background:"#1a1d27",borderBottom:"1px solid #2d3148",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#818cf8)",boxShadow:"0 0 8px rgba(99,102,241,0.6)"}}/>
          <span style={{fontWeight:800,fontSize:15,color:"#fff",letterSpacing:"0.05em"}}>АРБИТРАЖ</span>
          <span style={{background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",fontSize:10,padding:"1px 7px",borderRadius:4,fontWeight:700}}>ADMIN</span>
        </div>
        <button onClick={onLogout} className="btn-ghost" style={{border:"1px solid #3d4268",color:"#94a3b8",padding:"6px 14px",borderRadius:6,cursor:"pointer",fontSize:13}}>Выйти</button>
      </div>

      <div style={{background:"#1a1d27",borderBottom:"1px solid #2d3148",padding:"0 24px",display:"flex"}}>
        {[["overview","Сводка"],["managers","Менеджеры"],["platforms","Платформы"]].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} className="nav-btn" style={{background:"transparent",border:"none",color:tab===key?"#6366f1":"#64748b",padding:"12px 18px",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:tab===key?"2px solid #6366f1":"2px solid transparent"}}>{label}</button>
        ))}
      </div>

      <div style={{padding:"24px",maxWidth:1300,margin:"0 auto"}}>
        {tab==="overview"&&(
          <div>
            <h2 style={{color:"#fff",marginBottom:20,fontSize:18}}>Общий СЧ по платформам</h2>
            <div style={{border:"1px solid #2d3148",borderRadius:10,overflow:"hidden",marginBottom:32}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Платформа","Лидов","Сумма","СЧ факт","СЧ цель","Капа","Выполнено","BLIK","Период"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {platformStats.map(p=>{
                    const ok=p.avgCheck>=p.target_avg_check;
                    const pct=p.cap?Math.min(100,Math.round((p.allCount/p.cap)*100)):0;
                    return(
                      <tr key={p.id} className="row-hover">
                        <td style={{...S.td,fontWeight:600,color:"#e2e8f0"}}>{p.name}{p.date_added&&<span style={{display:"block",fontSize:10,color:"#475569"}}>{p.date_added}</span>}</td>
                        <td style={{...S.td,color:"#94a3b8"}}>{p.totalCount}</td>
                        <td style={{...S.td,color:"#94a3b8"}}>{p.totalAmount.toFixed(0)}€</td>
                        <td style={S.td}><span style={{background:p.totalCount===0?"#1e2235":ok?"linear-gradient(135deg,#14532d,#166534)":"linear-gradient(135deg,#7f1d1d,#991b1b)",color:p.totalCount===0?"#64748b":ok?"#86efac":"#fca5a5",padding:"3px 9px",borderRadius:6,fontWeight:700,fontSize:12}}>{p.totalCount===0?"—":p.avgCheck.toFixed(1)+"€"}</span></td>
                        <td style={{...S.td,color:"#94a3b8"}}>{p.target_avg_check}€</td>
                        <td style={{...S.td,color:"#94a3b8"}}>{p.cap??"—"}</td>
                        <td style={S.td}>{p.cap?<div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:40,background:"#0f1117",borderRadius:4,height:5,overflow:"hidden"}}><div className="progress-bar" style={{width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,#6366f1,#818cf8)"}}/></div><span style={{color:pct>=100?"#86efac":"#f59e0b",fontSize:12}}>{p.allCount}/{p.cap}</span></div>:"—"}</td>
                        <td style={S.td}>{p.totalCount>0?<div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:44,background:"#0f1117",borderRadius:3,height:4,overflow:"hidden",display:"flex"}}><div className="progress-bar" style={{width:`${100-p.blikPct}%`,height:"100%",background:"linear-gradient(90deg,#6366f1,#818cf8)"}}/><div className="progress-bar" style={{width:`${p.blikPct}%`,height:"100%",background:"linear-gradient(90deg,#d97706,#f59e0b)"}}/></div><span style={{color:"#6366f1",fontSize:11}}>{100-p.blikPct}%</span><span style={{color:"#475569",fontSize:11}}>/</span><span style={{color:"#d97706",fontSize:11}}>{p.blikPct}% ({p.blikCount})</span></div>:<span style={{color:"#475569"}}>—</span>}</td>
                        <td style={S.td}><span style={{background:p.reset_monthly?"linear-gradient(135deg,#1e3a5f,#1e40af)":"linear-gradient(135deg,#1e2235,#151824)",color:p.reset_monthly?"#93c5fd":"#64748b",padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600}}>{p.reset_monthly?"Помесячно":"Накопительно"}</span></td>
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
                    <span style={{fontWeight:700,color:"#fff",fontSize:14}}>{m.name}</span>
                    <div style={{display:"flex",gap:20}}>
                      <span style={{color:"#64748b",fontSize:12}}>Лидов: <strong style={{color:"#94a3b8"}}>{m.totalCount}</strong></span>
                      <span style={{color:"#64748b",fontSize:12}}>Сумма: <strong style={{color:"#94a3b8"}}>{m.totalAmount.toFixed(0)}€</strong></span>
                    </div>
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
                              <td style={{padding:"9px 18px",borderBottom:"1px solid #1e2235"}}>{p.cnt>0?<div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:36,background:"#0f1117",borderRadius:3,height:4,overflow:"hidden",display:"flex"}}><div style={{width:`${100-p.blikPct}%`,height:"100%",background:"linear-gradient(90deg,#6366f1,#818cf8)"}}/><div style={{width:`${p.blikPct}%`,height:"100%",background:"linear-gradient(90deg,#d97706,#f59e0b)"}}/></div><span style={{color:"#d97706",fontSize:11}}>{p.blik} ({p.blikPct}%)</span></div>:"—"}</td>
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
            <div style={{background:"#1a1d27",border:"1px solid #2d3148",borderRadius:10,padding:20,marginBottom:24,display:"flex",gap:10}}>
              <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createManager()} placeholder="Имя менеджера" style={{flex:1,background:"#0f1117",border:"1px solid #2d3148",color:"#e2e8f0",padding:"9px 12px",borderRadius:8,fontSize:13,outline:"none"}}/>
              <button onClick={createManager} className="btn-primary" style={{padding:"9px 20px",fontSize:13,borderRadius:8}}>+ Создать</button>
            </div>
            <div style={{border:"1px solid #2d3148",borderRadius:10,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Имя","Токен","Статус","Лидов","Действия"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {managers.map(m=>(
                    <tr key={m.id} className="row-hover">
                      <td style={{...S.td,fontWeight:600,color:"#e2e8f0"}}>{m.name}</td>
                      <td style={S.td}><code style={{background:"#0f1117",border:"1px solid #2d3148",padding:"3px 8px",borderRadius:5,fontSize:12,color:"#a5b4fc",letterSpacing:"0.1em"}}>{m.token}</code></td>
                      <td style={S.td}><span style={{background:m.is_active?"linear-gradient(135deg,#14532d,#166534)":"#1e2235",color:m.is_active?"#86efac":"#64748b",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600}}>{m.is_active?"Активен":"Отключён"}</span></td>
                      <td style={{...S.td,color:"#94a3b8"}}>{players.filter(p=>p.manager_id===m.id).length}</td>
                      <td style={{...S.td,display:"flex",gap:6}}>
                        <button onClick={()=>toggleManager(m)} className="btn-ghost" style={{border:"1px solid #2d3148",color:"#94a3b8",padding:"5px 10px",borderRadius:6,cursor:"pointer",fontSize:11}}>{m.is_active?"Отключить":"Включить"}</button>
                        <button onClick={()=>deleteManager(m.id)} className="btn-danger btn-ghost" style={{border:"1px solid #2d3148",color:"#94a3b8",padding:"5px 10px",borderRadius:6,cursor:"pointer",fontSize:11}}>Удалить</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab==="platforms"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{color:"#fff",fontSize:18,margin:0}}>Платформы</h2>
              <button onClick={()=>openPlatformForm()} className="btn-primary" style={{padding:"8px 18px",fontSize:13,borderRadius:8}}>+ Добавить</button>
            </div>
            <div style={{border:"1px solid #2d3148",borderRadius:10,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Платформа","Дата","Мин. деп","Цель СЧ","Капа","Период","Статус","Действия"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {platforms.map(p=>{
                    const isActive=p.is_active!==false;
                    return(
                      <tr key={p.id} className="row-hover" style={{opacity:isActive?1:0.5}}>
                        <td style={{...S.td,fontWeight:600,color:"#e2e8f0"}}>{p.name}</td>
                        <td style={{...S.td,color:"#94a3b8",fontSize:12}}>{p.date_added||"—"}</td>
                        <td style={{...S.td,color:"#94a3b8"}}>{p.min_deposit||"—"}€</td>
                        <td style={S.td}><span style={{background:"linear-gradient(135deg,#1e3a5f,#1e40af)",color:"#93c5fd",padding:"2px 8px",borderRadius:6,fontWeight:700,fontSize:11}}>{p.target_avg_check}€</span></td>
                        <td style={{...S.td,color:"#94a3b8"}}>{p.cap||"—"}</td>
                        <td style={S.td}><span style={{background:p.reset_monthly?"linear-gradient(135deg,#1e3a5f,#1e40af)":"#1e2235",color:p.reset_monthly?"#93c5fd":"#64748b",padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600}}>{p.reset_monthly?"Помесячно":"Накопительно"}</span></td>
                        <td style={S.td}><span style={{background:isActive?"linear-gradient(135deg,#14532d,#166534)":"#1e2235",color:isActive?"#86efac":"#64748b",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600}}>{isActive?"Активна":"Скрыта"}</span></td>
                        <td style={{...S.td,display:"flex",gap:6}}>
                          <button onClick={()=>openPlatformForm(p)} className="btn-ghost" style={{border:"1px solid #2d3148",color:"#94a3b8",width:28,height:28,borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={()=>deletePlatform(p.id)} className="btn-danger btn-ghost" style={{border:"1px solid #7f1d1d",color:"#fca5a5",width:28,height:28,borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
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
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  useEffect(()=>{ const s=localStorage.getItem("arbi_v2"); if(s) setSession(JSON.parse(s)); },[]);
  const login=(s)=>{ localStorage.setItem("arbi_v2",JSON.stringify(s)); setSession(s); };
  const logout=()=>{ localStorage.removeItem("arbi_v2"); setSession(null); };
  if (!session) return <LoginPage onLogin={login}/>;
  if (session.role==="admin") return <AdminPage onLogout={logout}/>;
  return <ManagerPage manager={session.manager} onLogout={logout}/>;
}
