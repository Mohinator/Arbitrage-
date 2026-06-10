import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hbmmbjwnnsralaehdamq.supabase.co";
const SUPABASE_KEY = "sb_publishable_vFYq1gSco_1HRtTca4xqpw_agIuIL5T";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const ADMIN_PASSWORD = "admin2026";

const STATUSES = ["Да", "Нет", "Отправил", "Кинул", "Вернул"];

function getStatusStyle(status, dark) {
  if (dark) {
    const map = { "Да": { bg:"#14532d", color:"#86efac" }, "Нет": { bg:"#1e2235", color:"#64748b", border:"1px solid #2d3148" }, "Кинул": { bg:"#7f1d1d", color:"#fca5a5" }, "Отправил": { bg:"#1e3a5f", color:"#93c5fd" }, "Вернул": { bg:"#422006", color:"#fbbf24" } };
    return map[status] || map["Нет"];
  } else {
    const map = { "Да": { bg:"#dcfce7", color:"#166534" }, "Нет": { bg:"#f1f5f9", color:"#64748b", border:"1px solid #e2e8f0" }, "Кинул": { bg:"#fee2e2", color:"#991b1b" }, "Отправил": { bg:"#dbeafe", color:"#1e40af" }, "Вернул": { bg:"#fef3c7", color:"#92400e" } };
    return map[status] || map["Нет"];
  }
}

function Toast({ msg, type, onUndo }) {
  if (!msg) return null;
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, background: type==="error"?"#ef4444":"#1e2235", border:"1px solid "+(type==="error"?"#ef4444":"#3d4268"), color:"#fff", padding:"12px 20px", borderRadius:10, fontWeight:600, fontSize:14, boxShadow:"0 4px 20px rgba(0,0,0,0.4)", display:"flex", alignItems:"center", gap:14 }}>
      <span>{msg}</span>
      {onUndo && <button onClick={onUndo} style={{ background:"#6366f1", border:"none", color:"#fff", padding:"4px 12px", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:700 }}>Отменить</button>}
    </div>
  );
}

function StatusBadge({ status, onClick, dark }) {
  const s = getStatusStyle(status, dark);
  return (
    <span onClick={onClick} style={{ background:s.bg, color:s.color, border:s.border||"none", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:700, cursor:onClick?"pointer":"default", userSelect:"none", display:"inline-block" }}>
      {status}
    </span>
  );
}

function StatusPopup({ x, y, onSelect, onClose, dark }) {
  const ref = useRef();
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} style={{ position:"fixed", left:x, top:y, background:dark?"#1a1d27":"#fff", border:`1px solid ${dark?"#2d3148":"#e2e8f0"}`, borderRadius:8, padding:6, zIndex:5000, boxShadow:"0 8px 24px rgba(0,0,0,.3)", minWidth:130 }}>
      {STATUSES.map(st => (
        <div key={st} onClick={() => onSelect(st)} style={{ padding:"6px 10px", borderRadius:5, cursor:"pointer" }}
          onMouseEnter={e => e.currentTarget.style.background = dark?"#0f1117":"#f8fafc"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <StatusBadge status={st} dark={dark} />
        </div>
      ))}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("manager");

  const login = async () => {
    setError(""); setLoading(true);
    if (mode === "admin") {
      if (token === ADMIN_PASSWORD) onLogin({ role:"admin" });
      else setError("Неверный пароль");
      setLoading(false); return;
    }
    const { data, error:err } = await supabase.from("managers").select("*").eq("token", token.toUpperCase()).eq("is_active", true).single();
    setLoading(false);
    if (err || !data) { setError("Токен не найден"); return; }
    onLogin({ role:"manager", manager:data });
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0f1117", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter', sans-serif" }}>
      <div style={{ width:"100%", maxWidth:400, padding:24 }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ display:"inline-flex", gap:8, alignItems:"center", marginBottom:12 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:"#6366f1" }} />
            <span style={{ fontWeight:800, fontSize:22, color:"#fff", letterSpacing:"0.08em" }}>АРБИТРАЖ</span>
          </div>
          <p style={{ color:"#64748b", fontSize:14 }}>Трекер лидов</p>
        </div>
        <div style={{ background:"#1a1d27", border:"1px solid #2d3148", borderRadius:14, padding:28 }}>
          <div style={{ display:"flex", background:"#0f1117", borderRadius:8, padding:3, marginBottom:24 }}>
            {[["manager","Менеджер"],["admin","Админ"]].map(([key,label]) => (
              <button key={key} onClick={() => { setMode(key); setToken(""); setError(""); }} style={{ flex:1, background:mode===key?"#6366f1":"transparent", color:mode===key?"#fff":"#64748b", border:"none", padding:"8px", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:13 }}>{label}</button>
            ))}
          </div>
          <label style={{ display:"block", fontSize:11, color:"#64748b", marginBottom:8, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>{mode==="admin"?"Пароль":"Токен доступа"}</label>
          <input value={token} onChange={e => setToken(e.target.value)} onKeyDown={e => e.key==="Enter" && login()}
            placeholder={mode==="admin"?"Пароль":"Введи токен"} type={mode==="admin"?"password":"text"}
            style={{ width:"100%", background:"#0f1117", border:`1px solid ${error?"#ef4444":"#2d3148"}`, color:"#e2e8f0", padding:"12px 14px", borderRadius:8, fontSize:15, outline:"none", marginBottom:8, boxSizing:"border-box", textTransform:mode==="manager"?"uppercase":"none", letterSpacing:mode==="manager"?"0.1em":"normal" }} />
          {error && <p style={{ color:"#f87171", fontSize:13, marginBottom:12 }}>{error}</p>}
          <button onClick={login} disabled={loading||!token} style={{ width:"100%", background:loading||!token?"#3730a3":"#6366f1", color:"#fff", border:"none", padding:"12px", borderRadius:8, cursor:loading||!token?"not-allowed":"pointer", fontWeight:700, fontSize:15, marginTop:8 }}>
            {loading?"Проверяем...":"Войти"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MANAGER PAGE ─────────────────────────────────────────────────────────────
function ManagerPage({ manager, onLogout }) {
  const [dark, setDark] = useState(true);
  const [platforms, setPlatforms] = useState([]);
  const [players, setPlayers] = useState([]);
  const [redeposits, setRedeposits] = useState([]);
  const [plannedRds, setPlannedRds] = useState({}); // { playerId: [{rd_number, amount, date}] }
  const [tab, setTab] = useState("main");
  const [toast, setToast] = useState(null);
  const [statusPopup, setStatusPopup] = useState(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showAddRd, setShowAddRd] = useState(null);
  const [showEditRd, setShowEditRd] = useState(null); // { playerId, rdNumber, amount, date }
  const [showAutomation, setShowAutomation] = useState(false);
  const [automationPreview, setAutomationPreview] = useState([]);
  const [excludedIds, setExcludedIds] = useState(new Set());
  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [leadForm, setLeadForm] = useState({ date:new Date().toISOString().slice(0,10), platform_id:"", name:"", sub18:"", deposit:"", is_blik:false, status:"Да", next_rd_date:"" });
  const [rdForm, setRdForm] = useState({ amount:"", date:new Date().toISOString().slice(0,10) });

  const showToast = (msg, type="ok", onUndo=null) => { setToast({ msg, type, onUndo }); setTimeout(() => setToast(null), 4000); };

  const load = async () => {
    const [{ data:p }, { data:pl }, { data:rd }] = await Promise.all([
      supabase.from("platforms").select("*").eq("is_active", true).order("sort_order").order("name"),
      supabase.from("players").select("*").eq("manager_id", manager.id).order("date", { ascending:false }),
      supabase.from("redeposits").select("*"),
    ]);
    setPlatforms(p||[]); setPlayers(pl||[]); setRedeposits(rd||[]);
  };

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0,10);

  const getPlayerRds = (playerId) => redeposits.filter(r => r.player_id===playerId).sort((a,b) => a.rd_number-b.rd_number);
  const getNextRdNumber = (playerId) => getPlayerRds(playerId).length + 1;
  const calcTotal = (player) => { const rds = getPlayerRds(player.id); return Number(player.deposit) + rds.reduce((s,r) => s+Number(r.amount), 0); };
  const calcEffectiveTotal = (player) => {
    const rds = getPlayerRds(player.id);
    if (player.status==="Кинул" && rds.length>0) return Number(player.deposit) + rds.slice(0,-1).reduce((s,r) => s+Number(r.amount), 0);
    return Number(player.deposit) + rds.reduce((s,r) => s+Number(r.amount), 0);
  };
  const getRdStatus = (player) => {
    if (!player.next_rd_date) return "none";
    if (player.next_rd_date < today) return "late";
    if (player.next_rd_date === today) return "today";
    return "ok";
  };

  const formatDate = (d) => { if (!d) return "—"; return d.slice(5).replace("-","."); };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text).then(() => showToast("Скопировано!")); };

  // ── Automation logic ──
  const genRdAmount = (minDep) => {
    const r = Math.random() * 100;
    const min = Number(minDep) || 10;
    if (r < 65) return Math.round(min + Math.random() * (min * 0.4));
    if (r < 85) return Math.round(min * 1.5 + Math.random() * (min * 0.3));
    if (r < 95) return Math.round(min * 1.9 + Math.random() * (min * 0.2));
    return Math.round(min * 2.2 + Math.random() * (min * 0.3));
  };

  const genAutomation = () => {
    const preview = [];

    // Group active non-excluded players by platform
    const activePlayers = players.filter(p => p.status==="Да" && !excludedIds.has(p.id));
    const byPlatform = {};
    activePlayers.forEach(p => {
      if (!byPlatform[p.platform_id]) byPlatform[p.platform_id] = [];
      byPlatform[p.platform_id].push(p);
    });

    Object.entries(byPlatform).forEach(([platformId, platPlayers]) => {
      const plat = platforms.find(p => p.id===platformId);
      if (!plat) return;

      const minDep = plat.min_deposit || 10;
      const targetSch = plat.target_avg_check;
      const playerCount = platPlayers.length;

      // Current total across all platform players
      const currentTotal = platPlayers.reduce((s, p) => s + calcEffectiveTotal(p), 0);

      // How much we need to add in total across all players
      const needed = Math.max(0, targetSch * playerCount - currentTotal);

      if (needed <= 0) return;

      // Distribute needed amount randomly across players
      // Each player gets random share, respecting max 9 RDs
      const playerPlans = platPlayers.map(player => {
        const existingRds = getPlayerRds(player.id);
        return { player, existingRds, slotsLeft: 9 - existingRds.length, rdPlan: [] };
      }).filter(p => p.slotsLeft > 0);

      if (playerPlans.length === 0) return;

      // Distribute needed amount - generate until platform SCH is met
      let attempts = 0;
      const MAX_ATTEMPTS = 500;
      let bestPlans = null;
      let bestDiff = Infinity;

      while (attempts < MAX_ATTEMPTS) {
        attempts++;

        // Reset plans
        playerPlans.forEach(pp => pp.rdPlan = []);

        let remaining = needed;
        let totalAdded = 0;

        // Distribute remaining across players randomly
        for (let round = 0; round < 9 && remaining > 0; round++) {
          for (const pp of playerPlans) {
            if (pp.rdPlan.length >= pp.slotsLeft || remaining <= 0) continue;
            const amt = genRdAmount(minDep);
            pp.rdPlan.push(amt);
            totalAdded += amt;
            remaining -= amt;
          }
        }

        const newTotal = currentTotal + totalAdded;
        const newSch = newTotal / playerCount;
        const diff = Math.abs(newSch - targetSch);

        if (diff < bestDiff) {
          bestDiff = diff;
          bestPlans = playerPlans.map(pp => ({ ...pp, rdPlan: [...pp.rdPlan] }));
          if (newSch >= targetSch && diff < 2) break;
        }
      }

      if (!bestPlans) return;

      // Assign dates
      bestPlans.forEach(pp => {
        if (pp.rdPlan.length === 0) return;
        const depDate = new Date(pp.player.date);
        const existingCount = pp.existingRds.length;
        const monthEnd = new Date(depDate.getFullYear(), depDate.getMonth()+1, 0);
        const daysInMonth = Math.max(14, Math.floor((monthEnd - depDate) / (1000*60*60*24)));

        const rd1Date = new Date(depDate);
        rd1Date.setDate(rd1Date.getDate() + 1 + Math.floor(Math.random() * 3));

        const rdPlanWithDates = pp.rdPlan.map((amt, i) => {
          let rdDate;
          if (i === 0) {
            rdDate = new Date(rd1Date);
          } else {
            const spread = Math.floor(daysInMonth / pp.rdPlan.length);
            rdDate = new Date(rd1Date);
            rdDate.setDate(rdDate.getDate() + spread * i + Math.floor(Math.random() * 3 - 1));
          }
          return {
            rd_number: existingCount + i + 1,
            amount: amt,
            date: rdDate.toISOString().slice(0,10),
          };
        });

        const playerTotal = calcEffectiveTotal(pp.player) + pp.rdPlan.reduce((s,a) => s+a, 0);
        preview.push({ player:pp.player, plat, rdPlan:rdPlanWithDates, total:playerTotal });
      });
    });

    setAutomationPreview(preview);
  };

  const applyAutomation = async () => {
    for (const item of automationPreview) {
      for (const rd of item.rdPlan) {
        await supabase.from("redeposits").insert({ player_id: item.player.id, rd_number: rd.rd_number, amount: rd.amount, date: rd.date });
      }
      if (item.rdPlan.length > 0) {
        const lastDate = item.rdPlan[item.rdPlan.length-1].date;
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + 7);
        await supabase.from("players").update({ next_rd_date: item.rdPlan[0].date }).eq("id", item.player.id);
      }
    }
    setShowAutomation(false);
    setAutomationPreview([]);
    showToast("Автоматизация применена!");
    load();
  };

  const addLead = async () => {
    if (!leadForm.platform_id || !leadForm.name || !leadForm.deposit) { showToast("Заполни все поля", "error"); return; }
    const nextRd = leadForm.next_rd_date || new Date(new Date().setDate(new Date().getDate()+7)).toISOString().slice(0,10);
    await supabase.from("players").insert({ manager_id:manager.id, platform_id:leadForm.platform_id, date:leadForm.date, name:leadForm.name, sub18:leadForm.sub18, deposit:Number(leadForm.deposit), is_blik:leadForm.is_blik, status:leadForm.status, next_rd_date:nextRd });
    showToast("Лид добавлен!");
    setShowAddLead(false);
    setLeadForm({ date:new Date().toISOString().slice(0,10), platform_id:"", name:"", sub18:"", deposit:"", is_blik:false, status:"Да", next_rd_date:"" });
    load();
  };

  const addRd = async (playerId) => {
    if (!rdForm.amount) { showToast("Введи сумму", "error"); return; }
    const rdNum = getNextRdNumber(playerId);
    if (rdNum > 9) { showToast("Максимум 9 РД", "error"); return; }
    await supabase.from("redeposits").insert({ player_id:playerId, rd_number:rdNum, amount:Number(rdForm.amount), date:rdForm.date });
    const nextRd = new Date(new Date(rdForm.date).setDate(new Date(rdForm.date).getDate()+7)).toISOString().slice(0,10);
    await supabase.from("players").update({ next_rd_date:nextRd }).eq("id", playerId);
    showToast("РД добавлен!");
    setShowAddRd(null);
    setRdForm({ amount:"", date:new Date().toISOString().slice(0,10) });
    load();
  };

  const markRdDone = async (playerId, rdNumber, amount, date) => {
    // Check if rd already exists as fact
    const existing = redeposits.find(r => r.player_id===playerId && r.rd_number===rdNumber);
    if (existing) {
      // Already fact, open edit
      setShowEditRd({ playerId, rdNumber, amount:existing.amount, date:existing.date });
      return;
    }
    // Mark planned as done - insert as fact
    await supabase.from("redeposits").insert({ player_id:playerId, rd_number:rdNumber, amount:Number(amount), date:date });
    const nextRd = new Date(new Date(date).setDate(new Date(date).getDate()+7)).toISOString().slice(0,10);
    await supabase.from("players").update({ next_rd_date:nextRd }).eq("id", playerId);
    showToast("РД отмечен как выполненный!");
    load();
  };

  const editRd = async () => {
    if (!showEditRd || !showEditRd.amount) { showToast("Введи сумму", "error"); return; }
    const rd = redeposits.find(r => r.player_id===showEditRd.playerId && r.rd_number===showEditRd.rdNumber);
    if (!rd) return;
    await supabase.from("redeposits").update({ amount:Number(showEditRd.amount), date:showEditRd.date }).eq("id", rd.id);
    showToast("РД обновлён!");
    setShowEditRd(null);
    load();
  };

  const updateStatus = async (playerId, status) => {
    await supabase.from("players").update({ status }).eq("id", playerId);
    setStatusPopup(null); load();
  };

  const toggleExclude = (id) => {
    setExcludedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const filteredPlayers = players.filter(p => {
    if (filterPlatform && p.platform_id!==filterPlatform) return false;
    if (filterStatus && p.status!==filterStatus) return false;
    return true;
  });

  const todayRds = players.filter(p => getRdStatus(p)==="today" || getRdStatus(p)==="late");

  const platformStats = platforms.map(plat => {
    const activePlayers = players.filter(p => p.platform_id===plat.id && p.status==="Да");
    const totalCount = activePlayers.length;
    const totalAmount = activePlayers.reduce((s,p) => s+calcEffectiveTotal(p), 0);
    const avgCheck = totalCount>0 ? totalAmount/totalCount : 0;
    const blikCount = activePlayers.filter(p => p.is_blik).length;
    const blikPct = totalCount>0 ? Math.round((blikCount/totalCount)*100) : 0;
    const needMore = totalCount>0 ? Math.max(0, (plat.target_avg_check*totalCount)-totalAmount) : 0;
    return { ...plat, totalCount, totalAmount, avgCheck, blikCount, blikPct, needMore };
  });

  // Theme colors
  const T = dark ? {
    bg:"#0f1117", surface:"#1a1d27", border:"#2d3148", text:"#e2e8f0", muted:"#64748b", sub:"#94a3b8",
    navBg:"#151824", hdrBg:"#1a1d27", inputBg:"#0f1117", alertBg:"#1c160a", alertBorder:"#d97706",
    thBg:"#151824", rowBorder:"#1e2235", rdPlan:"#475569", rdFact:"#e2e8f0",
  } : {
    bg:"#f8f9fb", surface:"#fff", border:"#e2e8f0", text:"#1e293b", muted:"#94a3b8", sub:"#64748b",
    navBg:"#fff", hdrBg:"#fff", inputBg:"#f8fafc", alertBg:"#fffbeb", alertBorder:"#fcd34d",
    thBg:"#f1f5f9", rowBorder:"#f1f5f9", rdPlan:"#cbd5e1", rdFact:"#1e293b",
  };

  const inputStyle = { background:T.inputBg, border:`1px solid ${T.border}`, color:T.text, padding:"8px 10px", borderRadius:7, fontSize:13, outline:"none", width:"100%", boxSizing:"border-box" };

  const S = {
    th: { padding:"8px 10px", textAlign:"left", fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:".07em", borderBottom:`1px solid ${T.border}`, background:T.thBg, whiteSpace:"nowrap" },
    td: { padding:"7px 10px", borderBottom:`1px solid ${T.rowBorder}`, verticalAlign:"middle", whiteSpace:"nowrap" },
    rdTh: { padding:"8px 5px", textAlign:"center", fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", borderBottom:`1px solid ${T.border}`, background:T.thBg, width:42 },
    rdTd: { padding:"7px 5px", textAlign:"center", borderBottom:`1px solid ${T.rowBorder}`, verticalAlign:"middle", fontSize:11, width:42 },
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"'Inter', sans-serif" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onUndo={toast.onUndo} />}
      {statusPopup && <StatusPopup x={statusPopup.x} y={statusPopup.y} onSelect={st => updateStatus(statusPopup.playerId, st)} onClose={() => setStatusPopup(null)} dark={dark} />}

      {/* Add Lead Modal */}
      {showAddLead && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:24, width:"100%", maxWidth:500, maxHeight:"90vh", overflowY:"auto" }}>
            <h3 style={{ color:T.text, marginBottom:18, fontSize:15 }}>Добавить лида</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              {[["Дата","date","date"],["Продукт","platform_id","select"],["Имя лида","name","text"],["SUB18","sub18","text"],["Депозит (€)","deposit","number"]].map(([label,key,type]) => (
                <div key={key} style={{ gridColumn:key==="name"?"1/-1":undefined }}>
                  <label style={{ display:"block", fontSize:10, color:T.muted, marginBottom:4, fontWeight:700, textTransform:"uppercase" }}>{label}</label>
                  {type==="select" ? (
                    <select value={leadForm[key]} onChange={e => setLeadForm(f=>({...f,[key]:e.target.value}))} style={inputStyle}>
                      <option value="">Выбери платформу</option>
                      {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : (
                    <input type={type} value={leadForm[key]} onChange={e => setLeadForm(f=>({...f,[key]:e.target.value}))} style={inputStyle} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ display:"block", fontSize:10, color:T.muted, marginBottom:6, fontWeight:700, textTransform:"uppercase" }}>Через BLIK?</label>
              <div style={{ display:"flex", background:T.inputBg, borderRadius:7, padding:2, gap:2, width:"fit-content" }}>
                {[["Нет",false],["BLIK",true]].map(([label,val]) => (
                  <button key={label} onClick={() => setLeadForm(f=>({...f,is_blik:val}))} style={{ border:"none", padding:"5px 14px", borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:600, background:leadForm.is_blik===val?(val?"#d97706":"#6366f1"):"transparent", color:leadForm.is_blik===val?"#fff":T.muted }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ display:"block", fontSize:10, color:T.muted, marginBottom:6, fontWeight:700, textTransform:"uppercase" }}>Статус</label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {STATUSES.map(st => (
                  <span key={st} onClick={() => setLeadForm(f=>({...f,status:st}))} style={{ cursor:"pointer", outline:leadForm.status===st?"2px solid #6366f1":"none", borderRadius:20, outlineOffset:2 }}>
                    <StatusBadge status={st} dark={dark} />
                  </span>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:18 }}>
              <label style={{ display:"block", fontSize:10, color:T.muted, marginBottom:6, fontWeight:700, textTransform:"uppercase" }}>Следующий РД</label>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input type="date" value={leadForm.next_rd_date} onChange={e => setLeadForm(f=>({...f,next_rd_date:e.target.value}))} style={{ ...inputStyle, flex:1 }} />
                <button onClick={() => { const d=new Date(); d.setDate(d.getDate()+7); setLeadForm(f=>({...f,next_rd_date:d.toISOString().slice(0,10)})); }} style={{ background:T.navBg, border:`1px solid ${T.border}`, color:T.sub, padding:"8px 10px", borderRadius:7, cursor:"pointer", fontSize:11 }}>+7 дней</button>
                <button onClick={() => { const d=new Date(); d.setDate(d.getDate()+14); setLeadForm(f=>({...f,next_rd_date:d.toISOString().slice(0,10)})); }} style={{ background:T.navBg, border:`1px solid ${T.border}`, color:T.sub, padding:"8px 10px", borderRadius:7, cursor:"pointer", fontSize:11 }}>+14 дней</button>
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={addLead} style={{ flex:1, background:"#6366f1", color:"#fff", border:"none", padding:"10px", borderRadius:8, cursor:"pointer", fontWeight:700 }}>Добавить</button>
              <button onClick={() => setShowAddLead(false)} style={{ flex:1, background:T.navBg, color:T.sub, border:`1px solid ${T.border}`, padding:"10px", borderRadius:8, cursor:"pointer" }}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Add RD Modal */}
      {showAddRd && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:24, width:"100%", maxWidth:340 }}>
            <h3 style={{ color:T.text, marginBottom:6, fontSize:15 }}>Внести редепозит</h3>
            <p style={{ color:T.muted, fontSize:13, marginBottom:18 }}>{players.find(p=>p.id===showAddRd)?.name} — РД{getNextRdNumber(showAddRd)}</p>
            {[["Сумма (€)","amount","number"],["Дата","date","date"]].map(([label,key,type]) => (
              <div key={key} style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:10, color:T.muted, marginBottom:5, fontWeight:700, textTransform:"uppercase" }}>{label}</label>
                <input type={type} value={rdForm[key]} onChange={e => setRdForm(f=>({...f,[key]:e.target.value}))} style={inputStyle} />
              </div>
            ))}
            <div style={{ display:"flex", gap:10, marginTop:4 }}>
              <button onClick={() => addRd(showAddRd)} style={{ flex:1, background:"#6366f1", color:"#fff", border:"none", padding:"10px", borderRadius:8, cursor:"pointer", fontWeight:700 }}>Сохранить</button>
              <button onClick={() => setShowAddRd(null)} style={{ flex:1, background:T.navBg, color:T.sub, border:`1px solid ${T.border}`, padding:"10px", borderRadius:8, cursor:"pointer" }}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit RD Modal */}
      {showEditRd && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:24, width:"100%", maxWidth:340 }}>
            <h3 style={{ color:T.text, marginBottom:6, fontSize:15 }}>Редактировать РД{showEditRd.rdNumber}</h3>
            <p style={{ color:T.muted, fontSize:13, marginBottom:18 }}>{players.find(p=>p.id===showEditRd.playerId)?.name}</p>
            {[["Сумма (€)","amount","number"],["Дата","date","date"]].map(([label,key,type]) => (
              <div key={key} style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:10, color:T.muted, marginBottom:5, fontWeight:700, textTransform:"uppercase" }}>{label}</label>
                <input type={type} value={showEditRd[key]} onChange={e => setShowEditRd(prev=>({...prev,[key]:e.target.value}))} style={inputStyle} />
              </div>
            ))}
            <div style={{ display:"flex", gap:10, marginTop:4 }}>
              <button onClick={editRd} style={{ flex:1, background:"#6366f1", color:"#fff", border:"none", padding:"10px", borderRadius:8, cursor:"pointer", fontWeight:700 }}>Сохранить</button>
              <button onClick={() => setShowEditRd(null)} style={{ flex:1, background:T.navBg, color:T.sub, border:`1px solid ${T.border}`, padding:"10px", borderRadius:8, cursor:"pointer" }}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Automation Modal */}
      {showAutomation && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:24, width:"100%", maxWidth:700, maxHeight:"85vh", overflowY:"auto" }}>
            <h3 style={{ color:T.text, marginBottom:6, fontSize:15 }}>Предпросмотр автоматизации</h3>
            <p style={{ color:T.muted, fontSize:13, marginBottom:18 }}>Система сгенерировала план РД для достижения целевого СЧ</p>
            {automationPreview.length === 0 ? (
              <p style={{ color:T.muted, fontSize:13 }}>Нет лидов для автоматизации</p>
            ) : (
              <div style={{ border:`1px solid ${T.border}`, borderRadius:8, overflow:"hidden", marginBottom:18 }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ background:T.thBg }}>
                      {["Лид","Платформа","РД1","РД2","РД3","РД4","РД5","РД6","РД7","РД8","РД9","Итого","СЧ"].map(h => (
                        <th key={h} style={{ padding:"8px 10px", textAlign:"left", fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", borderBottom:`1px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {automationPreview.map(item => {
                      const rdArr = Array(9).fill(null).map((_,i) => item.rdPlan.find(r=>r.rd_number===i+1)||null);
                      const platPreviewPlayers = automationPreview.filter(x => x.plat.id === item.plat.id);
                      const platTotal = platPreviewPlayers.reduce((s,x) => {
                        const existing = players.filter(p => p.platform_id===item.plat.id&&p.status==="Да");
                        return s;
                      }, 0);
                      const schFact = item.total;
                      const ok = schFact >= item.plat.target_avg_check;
                      return (
                        <tr key={item.player.id}>
                          <td style={{ padding:"8px 10px", color:T.text, fontSize:12, fontWeight:500, borderBottom:`1px solid ${T.rowBorder}` }}>{item.player.name}</td>
                          <td style={{ padding:"8px 10px", color:T.sub, fontSize:11, borderBottom:`1px solid ${T.rowBorder}` }}>{item.plat.name}</td>
                          {rdArr.map((rd,i) => (
                            <td key={i} style={{ padding:"8px 6px", textAlign:"center", fontSize:11, borderBottom:`1px solid ${T.rowBorder}`, color:rd?"#6366f1":T.border }}>
                              {rd ? <div><div style={{ fontWeight:600 }}>{rd.amount}€</div><div style={{ fontSize:9, color:T.muted }}>{formatDate(rd.date)}</div></div> : "—"}
                            </td>
                          ))}
                          <td style={{ padding:"8px 10px", color:T.text, fontWeight:600, fontSize:12, borderBottom:`1px solid ${T.rowBorder}` }}>{schFact.toFixed(0)}€</td>
                          <td style={{ padding:"8px 10px", borderBottom:`1px solid ${T.rowBorder}` }}>
                            <span style={{ background:ok?(dark?"#166534":"#dcfce7"):(dark?"#7f1d1d":"#fee2e2"), color:ok?(dark?"#86efac":"#166534"):(dark?"#fca5a5":"#991b1b"), padding:"2px 7px", borderRadius:5, fontWeight:700, fontSize:11 }}>{schFact.toFixed(1)}€</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={applyAutomation} style={{ flex:1, background:"#6366f1", color:"#fff", border:"none", padding:"10px", borderRadius:8, cursor:"pointer", fontWeight:700 }}>Применить</button>
              <button onClick={genAutomation} style={{ flex:1, background:dark?"#1e3a5f":"#dbeafe", color:dark?"#93c5fd":"#1e40af", border:"none", padding:"10px", borderRadius:8, cursor:"pointer", fontWeight:700 }}>Перегенерировать</button>
              <button onClick={() => setShowAutomation(false)} style={{ flex:1, background:T.navBg, color:T.sub, border:`1px solid ${T.border}`, padding:"10px", borderRadius:8, cursor:"pointer" }}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background:T.hdrBg, borderBottom:`1px solid ${T.border}`, padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#6366f1" }} />
          <span style={{ fontWeight:800, fontSize:15, color:T.text, letterSpacing:"0.05em" }}>АРБИТРАЖ</span>
          <span style={{ background:"#6366f1", color:"#fff", fontSize:10, padding:"1px 7px", borderRadius:4, fontWeight:700 }}>МЕНЕДЖЕР</span>
          <span style={{ color:T.muted, fontSize:13 }}>/ {manager.name}</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={() => { genAutomation(); setShowAutomation(true); }} style={{ background:dark?"#1e3a5f":"#dbeafe", color:dark?"#93c5fd":"#1e40af", border:"none", padding:"7px 14px", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:600 }}>⚡ Автоматизация</button>
          <button onClick={() => setShowAddLead(true)} style={{ background:"#6366f1", color:"#fff", border:"none", padding:"7px 16px", borderRadius:7, cursor:"pointer", fontSize:13, fontWeight:600 }}>+ Добавить лида</button>
          <button onClick={() => setDark(d=>!d)} style={{ background:T.navBg, border:`1px solid ${T.border}`, color:T.sub, padding:"7px 10px", borderRadius:7, cursor:"pointer", fontSize:13 }}>{dark?"☀️":"🌙"}</button>
          <button onClick={onLogout} style={{ background:"transparent", border:`1px solid ${dark?"#3d4268":T.border}`, color:T.sub, padding:"7px 14px", borderRadius:7, cursor:"pointer", fontSize:13 }}>Выйти</button>
        </div>
      </div>

      {/* Nav */}
      <div style={{ background:T.navBg, borderBottom:`1px solid ${T.border}`, padding:"0 20px", display:"flex" }}>
        {[["main","Главная"],["stats","Статистика"],["platforms","Платформы"]].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ background:"transparent", border:"none", color:tab===key?"#6366f1":T.muted, padding:"12px 16px", cursor:"pointer", fontSize:13, fontWeight:600, borderBottom:tab===key?"2px solid #6366f1":"2px solid transparent" }}>{label}</button>
        ))}
      </div>

      {/* MAIN TAB */}
      {tab==="main" && (
        <div style={{ padding:"16px 20px" }}>
          {todayRds.length>0 && (
            <div style={{ background:T.alertBg, border:`1px solid ${T.alertBorder}`, borderRadius:8, padding:"9px 14px", display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <span>🔔</span>
              <span style={{ color:"#d97706", fontWeight:600, fontSize:13 }}>Сегодня нужно сделать РД:</span>
              <span style={{ color:dark?"#fbbf24":"#92400e", fontSize:13 }}>{todayRds.map(p=>p.name).join(" · ")}</span>
            </div>
          )}
          <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12, flexWrap:"wrap" }}>
            <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} style={{ background:T.surface, border:`1px solid ${T.border}`, color:T.sub, padding:"6px 10px", borderRadius:7, fontSize:12, outline:"none" }}>
              <option value="">Все платформы</option>
              {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ background:T.surface, border:`1px solid ${T.border}`, color:T.sub, padding:"6px 10px", borderRadius:7, fontSize:12, outline:"none" }}>
              <option value="">Все статусы</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <span style={{ color:T.muted, fontSize:12, marginLeft:"auto" }}>Показано: <strong style={{ color:T.text }}>{filteredPlayers.length}</strong> лидов</span>
          </div>

          <div style={{ overflowX:"auto", border:`1px solid ${T.border}`, borderRadius:8 }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  <th style={S.th} colSpan={15}>МОИ ЛИДЫ</th>
                </tr>
                <tr>
                  <th style={S.th}></th>
                  <th style={S.th}>Дата</th>
                  <th style={S.th}>Продукт</th>
                  <th style={S.th}>Имя</th>
                  <th style={S.th}>SUB18</th>
                  <th style={S.th}>Деп</th>
                  <th style={S.rdTh}>Рд1</th><th style={S.rdTh}>Рд2</th><th style={S.rdTh}>Рд3</th><th style={S.rdTh}>Рд4</th><th style={S.rdTh}>Рд5</th><th style={S.rdTh}>Рд6</th><th style={S.rdTh}>Рд7</th><th style={S.rdTh}>Рд8</th><th style={S.rdTh}>Рд9</th>
                  <th style={S.th}>Всего</th>
                  <th style={S.th}>Статус</th>
                  <th style={S.th}>BLIK</th>
                  <th style={S.th}>След. РД</th>
                  <th style={S.th}>Действие</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map(player => {
                  const rds = getPlayerRds(player.id);
                  const planned = plannedRds[player.id] || [];
                  const rdArr = Array(9).fill(null).map((_,i) => {
                    const fact = rds.find(r => r.rd_number===i+1);
                    const plan = planned.find(r => r.rd_number===i+1);
                    return fact ? { ...fact, isFact:true } : plan ? { ...plan, isFact:false } : null;
                  });
                  const total = calcTotal(player);
                  const rdStatus = getRdStatus(player);
                  const plat = platforms.find(p => p.id===player.platform_id);
                  const isExcluded = excludedIds.has(player.id);

                  return (
                    <tr key={player.id} style={{ opacity:isExcluded?0.45:1 }}>
                      <td style={S.td}>
                        <input type="checkbox" checked={isExcluded} onChange={() => toggleExclude(player.id)}
                          style={{ cursor:"pointer", width:13, height:13, accentColor:"#6366f1" }} />
                      </td>
                      <td style={{ ...S.td, color:T.muted, fontSize:11 }}>{player.date}</td>
                      <td style={{ ...S.td, color:T.text, fontSize:11 }}>{plat?.name||"—"}</td>
                      <td style={{ ...S.td, color:T.text, fontSize:12 }}>{player.name}</td>
                      <td style={{ ...S.td, color:T.muted, fontSize:10, fontFamily:"monospace", cursor:"pointer" }}
                        onClick={() => player.sub18 && copyToClipboard(player.sub18)}
                        title="Нажми чтобы скопировать">
                        <span style={{ borderBottom:`1px dashed ${T.border}` }}>{player.sub18||"—"}</span>
                      </td>
                      <td style={{ ...S.td, color:T.text, fontWeight:600 }}>{player.deposit}€</td>
                      {rdArr.map((rd,i) => {
                        const isToday = rd && !rd.isFact && rd.date===today;
                        const rdColor = isToday ? "#f59e0b" : rd ? (rd.isFact ? T.rdFact : T.rdPlan) : T.border;
                        return (
                          <td key={i} style={{ ...S.rdTd, color:rdColor, fontWeight:rd?.isFact?600:400, cursor:rd?"pointer":"default", lineHeight:1.2 }}
                            onClick={() => {
                              if (!rd) return;
                              if (rd.isFact) setShowEditRd({ playerId:player.id, rdNumber:rd.rd_number, amount:rd.amount, date:rd.date });
                              else markRdDone(player.id, rd.rd_number, rd.amount, rd.date);
                            }}
                            title={rd?.isFact?"Нажми чтобы изменить":"Нажми чтобы отметить как выполненный"}>
                            {rd ? (
                              <div>
                                <div>{rd.amount}€</div>
                                <div style={{ fontSize:9, color:isToday?"#f59e0b":rd.isFact?T.muted:T.rdPlan, marginTop:1 }}>{formatDate(rd.date)}</div>
                              </div>
                            ) : "—"}
                          </td>
                        );
                      })}
                      <td style={{ ...S.td, color:T.text, fontWeight:600 }}>{total}€</td>
                      <td style={S.td}>
                        <StatusBadge status={player.status} dark={dark} onClick={e => setStatusPopup({ playerId:player.id, x:e.clientX-10, y:e.clientY+8 })} />
                      </td>
                      <td style={S.td}>
                        {player.is_blik && <span style={{ background:dark?"#451a03":"#fef3c7", color:dark?"#d97706":"#92400e", padding:"2px 6px", borderRadius:4, fontSize:10, fontWeight:700 }}>BLIK</span>}
                      </td>
                      <td style={S.td}>
                        {rdStatus==="today" && <span style={{ color:"#f59e0b", fontWeight:700, fontSize:11 }}>⚠ {formatDate(player.next_rd_date)}</span>}
                        {rdStatus==="late" && <span style={{ color:"#f87171", fontWeight:700, fontSize:11 }}>⚠ {formatDate(player.next_rd_date)}</span>}
                        {rdStatus==="ok" && <span style={{ color:T.sub, fontSize:11 }}>{formatDate(player.next_rd_date)}</span>}
                        {rdStatus==="none" && <span style={{ color:T.border, fontSize:11 }}>—</span>}
                      </td>
                      <td style={S.td}>
                        {(rdStatus==="today"||rdStatus==="late") ? (
                          <button onClick={() => setShowAddRd(player.id)} style={{ background:"#6366f1", color:"#fff", border:"none", padding:"3px 10px", borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:600 }}>Внести РД</button>
                        ) : (
                          <button onClick={() => setShowAddRd(player.id)} style={{ background:"transparent", border:`1px solid ${T.border}`, color:T.sub, padding:"3px 10px", borderRadius:6, cursor:"pointer", fontSize:11 }}>Внести РД</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredPlayers.length===0 && <tr><td colSpan={26} style={{ padding:24, textAlign:"center", color:T.muted }}>Нет лидов</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STATS TAB */}
      {tab==="stats" && (
        <div style={{ padding:"16px 20px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
            {[
              ["Всего лидов",players.length,`активных: ${players.filter(p=>p.status==="Да").length}`],
              ["Общая сумма",players.filter(p=>p.status==="Да").reduce((s,p)=>s+calcEffectiveTotal(p),0).toFixed(0)+"€","деп + редепы"],
              ["BLIK",players.filter(p=>p.is_blik&&p.status==="Да").length,`${players.filter(p=>p.status==="Да").length>0?Math.round(players.filter(p=>p.is_blik&&p.status==="Да").length/players.filter(p=>p.status==="Да").length*100):0}% от активных`],
              ["Нужно добрать",platformStats.reduce((s,p)=>s+p.needMore,0).toFixed(0)+"€","до цели СЧ"],
            ].map(([label,val,sub]) => (
              <div key={label} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:"14px 16px" }}>
                <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:22, fontWeight:700, color:T.text }}>{val}</div>
                <div style={{ fontSize:11, color:T.sub, marginTop:2 }}>{sub}</div>
              </div>
            ))}
          </div>
          <div style={{ border:`1px solid ${T.border}`, borderRadius:8, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>{["Платформа","Лидов","Сумма","BLIK","СЧ цель","СЧ факт","Нужно добрать"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {platformStats.map(p => {
                  const ok = p.avgCheck>=p.target_avg_check;
                  return (
                    <tr key={p.id}>
                      <td style={{ ...S.td, fontWeight:600, color:T.text }}>{p.name}</td>
                      <td style={{ ...S.td, color:T.sub }}>{p.totalCount}</td>
                      <td style={{ ...S.td, color:T.sub }}>{p.totalAmount.toFixed(0)}€</td>
                      <td style={S.td}>
                        {p.totalCount>0?<div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <div style={{ width:44, background:T.rowBorder, borderRadius:3, height:4, overflow:"hidden", display:"flex" }}>
                            <div style={{ width:`${100-p.blikPct}%`, height:"100%", background:"#6366f1" }} />
                            <div style={{ width:`${p.blikPct}%`, height:"100%", background:"#d97706" }} />
                          </div>
                          <span style={{ color:"#d97706", fontSize:11 }}>{p.blikCount} ({p.blikPct}%)</span>
                        </div>:<span style={{ color:T.muted }}>—</span>}
                      </td>
                      <td style={{ ...S.td, color:T.sub }}>{p.target_avg_check}€</td>
                      <td style={S.td}>
                        {p.totalCount>0?<span style={{ background:ok?(dark?"#166534":"#dcfce7"):(dark?"#7f1d1d":"#fee2e2"), color:ok?(dark?"#86efac":"#166534"):(dark?"#fca5a5":"#991b1b"), padding:"2px 8px", borderRadius:6, fontWeight:700, fontSize:11 }}>{p.avgCheck.toFixed(1)}€</span>:<span style={{ color:T.muted }}>—</span>}
                      </td>
                      <td style={{ ...S.td, color:"#f59e0b", fontWeight:600 }}>{p.totalCount>0?p.needMore.toFixed(0)+"€":"—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PLATFORMS TAB */}
      {tab==="platforms" && (
        <div style={{ padding:"16px 20px" }}>
          <div style={{ border:`1px solid ${T.border}`, borderRadius:8, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>{["Платформа","Дата","Мин. деп","Цель СЧ","Капа","Мои лиды","Статус"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {platformStats.map(p => (
                  <tr key={p.id}>
                    <td style={{ ...S.td, fontWeight:600, color:T.text }}>{p.name}</td>
                    <td style={{ ...S.td, color:T.sub, fontSize:12 }}>{p.date_added||"—"}</td>
                    <td style={{ ...S.td, color:T.sub }}>{p.min_deposit||"—"}€</td>
                    <td style={S.td}><span style={{ background:dark?"#1e3a5f":"#dbeafe", color:dark?"#93c5fd":"#1e40af", padding:"2px 8px", borderRadius:6, fontWeight:700, fontSize:11 }}>{p.target_avg_check}€</span></td>
                    <td style={{ ...S.td, color:T.sub }}>{p.cap||"—"}</td>
                    <td style={{ ...S.td, color:dark?"#a5b4fc":"#4f46e5", fontWeight:600 }}>{p.totalCount}</td>
                    <td style={S.td}><span style={{ background:dark?"#14532d":"#dcfce7", color:dark?"#86efac":"#166534", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600 }}>Активна</span></td>
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

// ─── ADMIN PAGE ───────────────────────────────────────────────────────────────
function AdminPage({ onLogout }) {
  const [managers, setManagers] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [players, setPlayers] = useState([]);
  const [redeposits, setRedeposits] = useState([]);
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState(null);
  const [newName, setNewName] = useState("");
  const [showPlatformForm, setShowPlatformForm] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [pForm, setPForm] = useState({ name:"", target_avg_check:"", min_deposit:"", cap:"", date_added:"", is_active:true });

  const showToast = (msg, type="ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = async () => {
    const [{ data:m },{ data:p },{ data:pl },{ data:rd }] = await Promise.all([
      supabase.from("managers").select("*").order("created_at"),
      supabase.from("platforms").select("*").order("sort_order").order("name"),
      supabase.from("players").select("*"),
      supabase.from("redeposits").select("*"),
    ]);
    setManagers(m||[]); setPlatforms(p||[]); setPlayers(pl||[]); setRedeposits(rd||[]);
  };

  useEffect(() => { load(); }, []);

  const createManager = async () => {
    if (!newName.trim()) return;
    const token = Math.random().toString(36).substring(2,10).toUpperCase();
    await supabase.from("managers").insert({ name:newName.trim(), token });
    showToast(`Создан! Токен: ${token}`);
    setNewName(""); load();
  };

  const deleteManager = async (id) => { if (!confirm("Удалить менеджера?")) return; await supabase.from("managers").delete().eq("id",id); load(); };
  const toggleManager = async (m) => { await supabase.from("managers").update({ is_active:!m.is_active }).eq("id",m.id); load(); };

  const openPlatformForm = (p=null) => {
    setEditingPlatform(p);
    setPForm(p ? { name:p.name, target_avg_check:p.target_avg_check, min_deposit:p.min_deposit||"", cap:p.cap||"", date_added:p.date_added||"", is_active:p.is_active!==false } : { name:"", target_avg_check:"", min_deposit:"", cap:"", date_added:new Date().toISOString().slice(0,10), is_active:true });
    setShowPlatformForm(true);
  };

  const savePlatform = async () => {
    if (!pForm.name||!pForm.target_avg_check) { showToast("Заполни обязательные поля","error"); return; }
    const data = { name:pForm.name, target_avg_check:Number(pForm.target_avg_check), min_deposit:Number(pForm.min_deposit)||0, cap:pForm.cap?Number(pForm.cap):null, date_added:pForm.date_added||null, is_active:pForm.is_active };
    if (editingPlatform) { await supabase.from("platforms").update(data).eq("id",editingPlatform.id); showToast("Обновлено!"); }
    else { await supabase.from("platforms").insert(data); showToast("Добавлено!"); }
    setShowPlatformForm(false); load();
  };

  const deletePlatform = async (id) => { if (!confirm("Удалить платформу?")) return; await supabase.from("platforms").delete().eq("id",id); load(); };

  const getPlayerRds = (playerId) => redeposits.filter(r => r.player_id===playerId);
  const calcEffectiveTotal = (player) => {
    const rds = getPlayerRds(player.id).sort((a,b)=>a.rd_number-b.rd_number);
    if (player.status==="Кинул"&&rds.length>0) return Number(player.deposit)+rds.slice(0,-1).reduce((s,r)=>s+Number(r.amount),0);
    return Number(player.deposit)+rds.reduce((s,r)=>s+Number(r.amount),0);
  };

  const platformStats = platforms.map(plat => {
    const activePlayers = players.filter(p=>p.platform_id===plat.id&&p.status==="Да");
    const totalCount = activePlayers.length;
    const totalAmount = activePlayers.reduce((s,p)=>s+calcEffectiveTotal(p),0);
    const avgCheck = totalCount>0?totalAmount/totalCount:0;
    const blikCount = activePlayers.filter(p=>p.is_blik).length;
    const blikPct = totalCount>0?Math.round((blikCount/totalCount)*100):0;
    const allCount = players.filter(p=>p.platform_id===plat.id).length;
    return { ...plat, totalCount, totalAmount, avgCheck, blikCount, blikPct, allCount };
  });

  const managerStats = managers.map(m => {
    const mPlayers = players.filter(p=>p.manager_id===m.id&&p.status==="Да");
    const totalCount = mPlayers.length;
    const totalAmount = mPlayers.reduce((s,p)=>s+calcEffectiveTotal(p),0);
    const byPlatform = platforms.map(plat => {
      const pp = mPlayers.filter(p=>p.platform_id===plat.id);
      const cnt = pp.length;
      const amt = pp.reduce((s,p)=>s+calcEffectiveTotal(p),0);
      const avg = cnt>0?amt/cnt:0;
      const blik = pp.filter(p=>p.is_blik).length;
      const blikPct = cnt>0?Math.round((blik/cnt)*100):0;
      return { ...plat, cnt, amt, avg, blik, blikPct };
    }).filter(p=>p.cnt>0);
    return { ...m, totalCount, totalAmount, byPlatform };
  });

  const S = {
    th: { padding:"9px 12px", textAlign:"left", fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.07em", borderBottom:"1px solid #2d3148", background:"#151824" },
    td: { padding:"12px 12px", borderBottom:"1px solid #1a1d27" },
  };

  const inputStyle = { background:"#0f1117", border:"1px solid #2d3148", color:"#e2e8f0", padding:"8px 10px", borderRadius:7, fontSize:13, outline:"none", width:"100%", boxSizing:"border-box" };

  return (
    <div style={{ minHeight:"100vh", background:"#0f1117", color:"#e2e8f0", fontFamily:"'Inter', sans-serif" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {showPlatformForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#1a1d27", border:"1px solid #2d3148", borderRadius:14, padding:24, width:"100%", maxWidth:440 }}>
            <h3 style={{ color:"#fff", marginBottom:18, fontSize:15 }}>{editingPlatform?"Редактировать":"Добавить"} платформу</h3>
            {[["Название *","name","text"],["Цель СЧ (€) *","target_avg_check","number"],["Мин. депозит (€)","min_deposit","number"],["Капа","cap","number"],["Дата добавления","date_added","date"]].map(([label,key,type]) => (
              <div key={key} style={{ marginBottom:12 }}>
                <label style={{ display:"block", fontSize:10, color:"#64748b", marginBottom:4, fontWeight:700, textTransform:"uppercase" }}>{label}</label>
                <input type={type} value={pForm[key]} onChange={e=>setPForm(f=>({...f,[key]:e.target.value}))} style={inputStyle} />
              </div>
            ))}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18 }}>
              <input type="checkbox" id="isActive" checked={pForm.is_active} onChange={e=>setPForm(f=>({...f,is_active:e.target.checked}))} />
              <label htmlFor="isActive" style={{ color:"#94a3b8", fontSize:13 }}>Платформа активна</label>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={savePlatform} style={{ flex:1, background:"#6366f1", color:"#fff", border:"none", padding:"10px", borderRadius:8, cursor:"pointer", fontWeight:700 }}>Сохранить</button>
              <button onClick={()=>setShowPlatformForm(false)} style={{ flex:1, background:"#1e2235", color:"#94a3b8", border:"1px solid #2d3148", padding:"10px", borderRadius:8, cursor:"pointer" }}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background:"#1a1d27", borderBottom:"1px solid #2d3148", padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#6366f1" }} />
          <span style={{ fontWeight:800, fontSize:15, color:"#fff", letterSpacing:"0.05em" }}>АРБИТРАЖ</span>
          <span style={{ background:"#6366f1", color:"#fff", fontSize:10, padding:"1px 7px", borderRadius:4, fontWeight:700 }}>ADMIN</span>
        </div>
        <button onClick={onLogout} style={{ background:"transparent", border:"1px solid #3d4268", color:"#94a3b8", padding:"6px 14px", borderRadius:6, cursor:"pointer", fontSize:13 }}>Выйти</button>
      </div>

      <div style={{ background:"#1a1d27", borderBottom:"1px solid #2d3148", padding:"0 24px", display:"flex" }}>
        {[["overview","Сводка"],["managers","Менеджеры"],["platforms","Платформы"]].map(([key,label]) => (
          <button key={key} onClick={()=>setTab(key)} style={{ background:"transparent", border:"none", color:tab===key?"#6366f1":"#64748b", padding:"12px 18px", cursor:"pointer", fontSize:13, fontWeight:600, borderBottom:tab===key?"2px solid #6366f1":"2px solid transparent" }}>{label}</button>
        ))}
      </div>

      <div style={{ padding:"24px", maxWidth:1300, margin:"0 auto" }}>
        {tab==="overview" && (
          <div>
            <h2 style={{ color:"#fff", marginBottom:20, fontSize:18 }}>Общий СЧ по платформам</h2>
            <div style={{ border:"1px solid #2d3148", borderRadius:8, overflow:"hidden", marginBottom:32 }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>{["Платформа","Лидов (акт.)","Сумма","СЧ факт","СЧ цель","Капа","Выполнено","BLIK"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {platformStats.map(p => {
                    const ok = p.avgCheck>=p.target_avg_check;
                    const pct = p.cap?Math.min(100,Math.round((p.allCount/p.cap)*100)):0;
                    return (
                      <tr key={p.id}>
                        <td style={{ ...S.td, fontWeight:600, color:"#e2e8f0" }}>{p.name}{p.date_added&&<span style={{ display:"block", fontSize:10, color:"#475569" }}>{p.date_added}</span>}</td>
                        <td style={{ ...S.td, color:"#94a3b8" }}>{p.totalCount}</td>
                        <td style={{ ...S.td, color:"#94a3b8" }}>{p.totalAmount.toFixed(0)}€</td>
                        <td style={S.td}><span style={{ background:p.totalCount===0?"#1e2235":ok?"#166534":"#7f1d1d", color:p.totalCount===0?"#64748b":ok?"#86efac":"#fca5a5", padding:"3px 9px", borderRadius:6, fontWeight:700, fontSize:12 }}>{p.totalCount===0?"—":p.avgCheck.toFixed(1)+"€"}</span></td>
                        <td style={{ ...S.td, color:"#94a3b8" }}>{p.target_avg_check}€</td>
                        <td style={{ ...S.td, color:"#94a3b8" }}>{p.cap??"—"}</td>
                        <td style={S.td}>{p.cap?<div style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:40, background:"#0f1117", borderRadius:4, height:5, overflow:"hidden" }}><div style={{ width:`${pct}%`, height:"100%", background:"#6366f1" }} /></div><span style={{ color:pct>=100?"#86efac":"#f59e0b", fontSize:12 }}>{p.allCount}/{p.cap}</span></div>:"—"}</td>
                        <td style={S.td}>{p.totalCount>0?<div style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:44, background:"#0f1117", borderRadius:3, height:4, overflow:"hidden", display:"flex" }}><div style={{ width:`${100-p.blikPct}%`, height:"100%", background:"#6366f1" }} /><div style={{ width:`${p.blikPct}%`, height:"100%", background:"#d97706" }} /></div><span style={{ color:"#6366f1", fontSize:11 }}>{100-p.blikPct}%</span><span style={{ color:"#475569", fontSize:11 }}>/</span><span style={{ color:"#d97706", fontSize:11 }}>{p.blikPct}% ({p.blikCount})</span></div>:<span style={{ color:"#475569" }}>—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h2 style={{ color:"#fff", marginBottom:20, fontSize:18 }}>По менеджерам</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {managerStats.map(m => (
                <div key={m.id} style={{ border:"1px solid #2d3148", borderRadius:10, overflow:"hidden" }}>
                  <div style={{ padding:"12px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:m.byPlatform.length>0?"1px solid #2d3148":"none", background:"#1a1d27" }}>
                    <span style={{ fontWeight:700, color:"#fff", fontSize:14 }}>{m.name}</span>
                    <div style={{ display:"flex", gap:20 }}>
                      <span style={{ color:"#64748b", fontSize:12 }}>Лидов: <strong style={{ color:"#94a3b8" }}>{m.totalCount}</strong></span>
                      <span style={{ color:"#64748b", fontSize:12 }}>Сумма: <strong style={{ color:"#94a3b8" }}>{m.totalAmount.toFixed(0)}€</strong></span>
                    </div>
                  </div>
                  {m.byPlatform.length>0 && (
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead><tr>{["Платформа","Лидов","Сумма","BLIK","СЧ цель","СЧ факт"].map(h=><th key={h} style={{ ...S.th, padding:"7px 18px" }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {m.byPlatform.map(p => {
                          const ok = p.avg>=p.target_avg_check;
                          return (
                            <tr key={p.id}>
                              <td style={{ padding:"9px 18px", color:"#cbd5e1", fontSize:12, borderBottom:"1px solid #1e2235" }}>{p.name}</td>
                              <td style={{ padding:"9px 18px", color:"#94a3b8", fontSize:12, borderBottom:"1px solid #1e2235" }}>{p.cnt}</td>
                              <td style={{ padding:"9px 18px", color:"#94a3b8", fontSize:12, borderBottom:"1px solid #1e2235" }}>{p.amt.toFixed(0)}€</td>
                              <td style={{ padding:"9px 18px", borderBottom:"1px solid #1e2235" }}>{p.cnt>0?<div style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:36, background:"#0f1117", borderRadius:3, height:4, overflow:"hidden", display:"flex" }}><div style={{ width:`${100-p.blikPct}%`, height:"100%", background:"#6366f1" }} /><div style={{ width:`${p.blikPct}%`, height:"100%", background:"#d97706" }} /></div><span style={{ color:"#d97706", fontSize:11 }}>{p.blik} ({p.blikPct}%)</span></div>:"—"}</td>
                              <td style={{ padding:"9px 18px", color:"#94a3b8", fontSize:12, borderBottom:"1px solid #1e2235" }}>{p.target_avg_check}€</td>
                              <td style={{ padding:"9px 18px", borderBottom:"1px solid #1e2235" }}><span style={{ background:ok?"#166534":"#7f1d1d", color:ok?"#86efac":"#fca5a5", padding:"2px 8px", borderRadius:6, fontWeight:700, fontSize:11 }}>{p.avg.toFixed(1)}€</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  {m.byPlatform.length===0 && <div style={{ padding:"12px 18px", color:"#475569", fontSize:12 }}>Нет данных</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="managers" && (
          <div>
            <h2 style={{ color:"#fff", marginBottom:20, fontSize:18 }}>Менеджеры</h2>
            <div style={{ background:"#1a1d27", border:"1px solid #2d3148", borderRadius:10, padding:20, marginBottom:24, display:"flex", gap:10 }}>
              <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createManager()} placeholder="Имя менеджера" style={{ flex:1, background:"#0f1117", border:"1px solid #2d3148", color:"#e2e8f0", padding:"9px 12px", borderRadius:8, fontSize:13, outline:"none" }} />
              <button onClick={createManager} style={{ background:"#6366f1", color:"#fff", border:"none", padding:"9px 20px", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13 }}>+ Создать</button>
            </div>
            <div style={{ border:"1px solid #2d3148", borderRadius:8, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>{["Имя","Токен","Статус","Лидов","Действия"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {managers.map(m => (
                    <tr key={m.id}>
                      <td style={{ ...S.td, fontWeight:600, color:"#e2e8f0" }}>{m.name}</td>
                      <td style={S.td}><code style={{ background:"#0f1117", border:"1px solid #2d3148", padding:"3px 8px", borderRadius:5, fontSize:12, color:"#a5b4fc", letterSpacing:"0.1em" }}>{m.token}</code></td>
                      <td style={S.td}><span style={{ background:m.is_active?"#14532d":"#1e2235", color:m.is_active?"#86efac":"#64748b", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600 }}>{m.is_active?"Активен":"Отключён"}</span></td>
                      <td style={{ ...S.td, color:"#94a3b8" }}>{players.filter(p=>p.manager_id===m.id).length}</td>
                      <td style={{ ...S.td, display:"flex", gap:6 }}>
                        <button onClick={()=>toggleManager(m)} style={{ background:"#1e2235", border:"1px solid #2d3148", color:"#94a3b8", padding:"5px 10px", borderRadius:6, cursor:"pointer", fontSize:11 }}>{m.is_active?"Отключить":"Включить"}</button>
                        <button onClick={()=>deleteManager(m.id)} style={{ background:"#7f1d1d", border:"none", color:"#fca5a5", padding:"5px 10px", borderRadius:6, cursor:"pointer", fontSize:11 }}>Удалить</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab==="platforms" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ color:"#fff", fontSize:18, margin:0 }}>Платформы</h2>
              <button onClick={()=>openPlatformForm()} style={{ background:"#6366f1", color:"#fff", border:"none", padding:"8px 18px", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13 }}>+ Добавить</button>
            </div>
            <div style={{ border:"1px solid #2d3148", borderRadius:8, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>{["Платформа","Дата","Мин. деп","Цель СЧ","Капа","Статус","Действия"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {platforms.map(p => {
                    const isActive = p.is_active!==false;
                    return (
                      <tr key={p.id} style={{ opacity:isActive?1:0.5 }}>
                        <td style={{ ...S.td, fontWeight:600, color:"#e2e8f0" }}>{p.name}</td>
                        <td style={{ ...S.td, color:"#94a3b8", fontSize:12 }}>{p.date_added||"—"}</td>
                        <td style={{ ...S.td, color:"#94a3b8" }}>{p.min_deposit||"—"}€</td>
                        <td style={S.td}><span style={{ background:"#1e3a5f", color:"#93c5fd", padding:"2px 8px", borderRadius:6, fontWeight:700, fontSize:11 }}>{p.target_avg_check}€</span></td>
                        <td style={{ ...S.td, color:"#94a3b8" }}>{p.cap||"—"}</td>
                        <td style={S.td}><span style={{ background:isActive?"#14532d":"#1e2235", color:isActive?"#86efac":"#64748b", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600 }}>{isActive?"Активна":"Скрыта"}</span></td>
                        <td style={{ ...S.td, display:"flex", gap:6 }}>
                          <button onClick={()=>openPlatformForm(p)} style={{ background:"transparent", border:"1px solid #2d3148", color:"#94a3b8", width:28, height:28, borderRadius:6, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={()=>deletePlatform(p.id)} style={{ background:"transparent", border:"1px solid #7f1d1d", color:"#fca5a5", width:28, height:28, borderRadius:6, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
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
  useEffect(() => { const s = localStorage.getItem("arbi_v2"); if (s) setSession(JSON.parse(s)); }, []);
  const login = (s) => { localStorage.setItem("arbi_v2", JSON.stringify(s)); setSession(s); };
  const logout = () => { localStorage.removeItem("arbi_v2"); setSession(null); };
  if (!session) return <LoginPage onLogin={login} />;
  if (session.role==="admin") return <AdminPage onLogout={logout} />;
  return <ManagerPage manager={session.manager} onLogout={logout} />;
}
