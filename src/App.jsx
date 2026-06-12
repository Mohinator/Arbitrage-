import { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const SUPABASE_URL = "https://hbmmbjwnnsralaehdamq.supabase.co";
const SUPABASE_KEY = "sb_publishable_vFYq1gSco_1HRtTca4xqpw_agIuIL5T";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const ADMIN_PASSWORD = "admin2026";
const STATUSES = ["Да", "Нет", "Отправил", "Кинул", "Вернул"];
const LEAD_COLORS = [
  { key:"none", label:"Нет", dot:"#475569" },
  { key:"hot", label:"Кидок", dot:"#ef4444", bg:"rgba(239,68,68,.06)" },
  { key:"warm", label:"Постоянник", dot:"#22c55e", bg:"rgba(34,197,94,.06)" },
  { key:"cold", label:"Не активный", dot:"#6366f1", bg:"rgba(99,102,241,.06)" },
  { key:"problem", label:"Проблемный", dot:"#a855f7", bg:"rgba(168,85,247,.06)" },
];

const CSS = `
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}
input[type=number]{-moz-appearance:textfield;}
.btn-p{background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;transition:all .2s;box-shadow:0 2px 8px rgba(99,102,241,.3);}
.btn-p:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(99,102,241,.5);filter:brightness(1.1);}
.btn-a{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;transition:all .2s;box-shadow:0 2px 8px rgba(20,184,166,.3);}
.btn-a:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(20,184,166,.5);filter:brightness(1.1);}
.btn-g{background:transparent;transition:all .15s;border-radius:8px;}
.btn-g:hover{background:rgba(99,102,241,.08);}
.btn-danger:hover{background:rgba(239,68,68,.15)!important;color:#f87171!important;}
.nb{transition:color .15s,border-color .15s;}
.nb:hover{color:#a5b4fc!important;}
.sb{transition:all .15s;cursor:pointer;}
.sb:hover{filter:brightness(1.15);transform:scale(1.05);}
.row-hover:hover>td{background:rgba(99,102,241,.03)!important;}
.rd-cell{transition:background .15s;cursor:pointer;}
.rd-cell:hover{background:rgba(99,102,241,.08)!important;}
.rd-input{background:#0f1117;border:1.5px solid #6366f1;color:#e2e8f0;padding:3px 6px;border-radius:5px;font-size:11px;width:52px;outline:none;text-align:center;}
.drag-handle{cursor:grab;color:#3d4268;font-size:14px;padding:0 4px;transition:color .15s;user-select:none;}
.drag-handle:hover{color:#6366f1;}
.alert-pulse{animation:pulse 2s infinite;}
.progress-bar{transition:width .8s cubic-bezier(.4,0,.2,1);}
.fade-in{animation:fadeIn .2s ease;}
.slide-in{animation:slideIn .2s ease;}
.row-hover:hover .del-btn{opacity:1!important;color:#ef4444!important;}
.geo-tab{transition:all .15s;border-bottom:2px solid transparent;padding:10px 16px;cursor:pointer;font-size:13px;font-weight:600;border:none;background:transparent;}
.geo-tab.active{border-bottom-color:#6366f1;color:#6366f1;}
`;

function getStatusStyle(status, dark) {
  const dm = { "Да":{bg:"linear-gradient(135deg,#14532d,#166534)",color:"#86efac"}, "Нет":{bg:"#1e2235",color:"#64748b",border:"1px solid #2d3148"}, "Кинул":{bg:"linear-gradient(135deg,#7f1d1d,#991b1b)",color:"#fca5a5"}, "Отправил":{bg:"linear-gradient(135deg,#1e3a5f,#1e40af)",color:"#93c5fd"}, "Вернул":{bg:"linear-gradient(135deg,#422006,#78350f)",color:"#fbbf24"} };
  const lm = { "Да":{bg:"linear-gradient(135deg,#bbf7d0,#86efac)",color:"#14532d"}, "Нет":{bg:"#e2e8f0",color:"#64748b",border:"1px solid #cbd5e1"}, "Кинул":{bg:"linear-gradient(135deg,#fecaca,#f87171)",color:"#7f1d1d"}, "Отправил":{bg:"linear-gradient(135deg,#bfdbfe,#93c5fd)",color:"#1e3a5f"}, "Вернул":{bg:"linear-gradient(135deg,#fde68a,#fbbf24)",color:"#78350f"} };
  return (dark ? dm : lm)[status] || (dark ? dm : lm)["Нет"];
}

function StatusBadge({ status, onClick, dark }) {
  const s = getStatusStyle(status, dark);
  return <span onClick={onClick} className={onClick?"sb":""} style={{ background:s.bg, color:s.color, border:s.border||"none", padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700, cursor:onClick?"pointer":"default", userSelect:"none", display:"inline-block" }}>{status}</span>;
}

function StatusPopup({ x, y, onSelect, onClose, dark }) {
  const ref = useRef();
  useEffect(() => { const h=e=>{ if(ref.current&&!ref.current.contains(e.target)) onClose(); }; document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h); }, []);
  const T = dark?{bg:"#1a1d27",border:"#2d3148"}:{bg:"#f1f5f9",border:"#cbd5e1"};
  const popupH = STATUSES.length * 36 + 12;
  const openUp = y + popupH > window.innerHeight - 20;
  return (
    <div ref={ref} className="fade-in" style={{ position:"fixed",left:x,top:openUp?y-popupH:y,background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,padding:6,zIndex:5000,boxShadow:"0 8px 32px rgba(0,0,0,.4)",minWidth:130 }}>
      {STATUSES.map(st=><div key={st} onClick={()=>onSelect(st)} style={{ padding:"6px 10px",borderRadius:6,cursor:"pointer",transition:"background .15s" }} onMouseEnter={e=>e.currentTarget.style.background=dark?"rgba(99,102,241,.12)":"rgba(99,102,241,.08)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><StatusBadge status={st} dark={dark}/></div>)}
    </div>
  );
}

function ColorPopup({ x, y, onSelect, onClose, dark }) {
  const ref = useRef();
  useEffect(() => { const h=e=>{ if(ref.current&&!ref.current.contains(e.target)) onClose(); }; document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h); }, []);
  const T = dark?{bg:"#1a1d27",border:"#2d3148",text:"#e2e8f0"}:{bg:"#f1f5f9",border:"#cbd5e1",text:"#1e293b"};
  const popupH = LEAD_COLORS.length * 34 + 16;
  const openUp = y + popupH > window.innerHeight - 20;
  return (
    <div ref={ref} className="fade-in" style={{ position:"fixed",left:x,top:openUp?y-popupH:y,background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,padding:8,zIndex:5000,boxShadow:"0 8px 32px rgba(0,0,0,.4)",minWidth:140 }}>
      {LEAD_COLORS.map(c=><div key={c.key} onClick={()=>onSelect(c.key)} style={{ padding:"6px 10px",borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"background .15s" }} onMouseEnter={e=>e.currentTarget.style.background=dark?"rgba(99,102,241,.12)":"rgba(99,102,241,.08)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><div style={{ width:10,height:10,borderRadius:"50%",background:c.dot,flexShrink:0 }}/><span style={{ fontSize:12,color:T.text }}>{c.label}</span></div>)}
    </div>
  );
}

function Toast({ msg, type, onUndo }) {
  if (!msg) return null;
  return (
    <div className="fade-in" style={{ position:"fixed",bottom:24,right:24,zIndex:9999,background:type==="error"?"linear-gradient(135deg,#ef4444,#dc2626)":"linear-gradient(135deg,#1e2235,#1e3a5f)",border:`1px solid ${type==="error"?"#ef4444":"#6366f1"}`,color:"#fff",padding:"12px 20px",borderRadius:12,fontWeight:600,fontSize:14,boxShadow:"0 8px 32px rgba(0,0,0,.5)",display:"flex",alignItems:"center",gap:14 }}>
      <span>{msg}</span>
      {onUndo&&<button onClick={onUndo} className="btn-p" style={{ padding:"4px 12px",fontSize:13 }}>Отменить</button>}
    </div>
  );
}

// ── Players Table (shared between manager/team_lead views) ───────────────────
function PlayersTable({ players, redeposits, plannedRds, platforms, manager, dark, readonly, onReload, showToast, excludedIds: _excludedIds, setExcludedIds: _setExcludedIds, isPoland=true }) {
  const [_localExcluded, _setLocalExcluded] = useState(new Set());
  const excludedIds = _excludedIds || _localExcluded;
  const setExcludedIds = _setExcludedIds || _setLocalExcluded;
  const [platformPopup, setPlatformPopup] = useState(null);
  const [dateEdit, setDateEdit] = useState(null);
  const [statusPopup, setStatusPopup] = useState(null);
  const [colorPopup, setColorPopup] = useState(null);
  const [showEditRd, setShowEditRd] = useState(null);
  const [inlineEdit, setInlineEdit] = useState(null);
  const [inlineVal, setInlineVal] = useState("");
  const [inlineDate, setInlineDate] = useState("");
  const [rdInputPopup, setRdInputPopup] = useState(null); // {playerId, rdNumber, x, y}
  const [rdInputVal, setRdInputVal] = useState("");
  const [rdInputDate, setRdInputDate] = useState("");
  const rdInputRef = useRef();
  const rdInputPopupRef = useRef(null);
  const [rdDateEdit, setRdDateEdit] = useState(null); // {playerId, rdNumber}
  const [commentEdit, setCommentEdit] = useState(null);
  const [commentVal, setCommentVal] = useState("");
  const [hiddenMonths, setHiddenMonths] = useState(new Set());
  const [localPlayers, setLocalPlayers] = useState(players);
  const [dragIdx, setDragIdx] = useState(null);

  useEffect(() => { setLocalPlayers((players||[]).filter(p=>p&&p.id)); }, [players]);

  const today = new Date().toISOString().slice(0,10);
  const getPlayerRds = (pid) => (redeposits||[]).filter(r=>r&&r.player_id===pid).sort((a,b)=>a.rd_number-b.rd_number);
  const getPlayerPlanned = (pid) => (plannedRds||[]).filter(r=>r&&r.player_id===pid).sort((a,b)=>a.rd_number-b.rd_number);
  const calcTotal = (player) => { const rds=getPlayerRds(player.id); return Number(player.deposit)+rds.reduce((s,r)=>s+Number(r.amount),0); };
  const formatDate = (d) => { if(!d) return "—"; const [y,m,day]=d.split("-"); return `${day}.${m}`; };
  const getMonthKey = (date) => date?date.slice(0,7):"";
  const copyToClipboard = (text) => { navigator.clipboard.writeText(text).then(()=>showToast("Скопировано!")); };

  const logAction = async (action, playerId=null, details={}) => {
    // Логируем от имени владельца лида, а не текущего менеджера (тимлида)
    let managerId = manager?.id;
    if(playerId) {
      const player = (players||[]).find(p=>p.id===playerId) || localPlayers?.find(p=>p.id===playerId);
      if(player?.manager_id) managerId = player.manager_id;
    }
    if(managerId) await supabase.from("activity_log").insert({ manager_id:managerId, player_id:playerId, action, details });
  };

  const markPlannedAsDone = async (playerId, rdNumber, amount, date) => {
    if (readonly) return;
    await supabase.from("redeposits").insert({ player_id:playerId, rd_number:rdNumber, amount:Number(amount), date });
    await supabase.from("planned_redeposits").delete().eq("player_id",playerId).eq("rd_number",rdNumber);
    const nextRd=new Date(new Date(date).setDate(new Date(date).getDate()+7)).toISOString().slice(0,10);
    await supabase.from("players").update({ next_rd_date:nextRd }).eq("id",playerId);
    await logAction("rd_marked_done",playerId,{rd_number:rdNumber,amount,date});
    showToast("РД выполнен!"); onReload();
  };

  const saveRdPopup = async () => {
    const popup=rdInputPopupRef.current;
    const val=rdInputRef.current?.querySelector('input[type="text"]')?.value||rdInputVal;
    const dateVal=rdInputRef.current?.querySelector('input[type="date"]')?.value||rdInputDate;
    if(!popup||!val||readonly) { setRdInputPopup(null); rdInputPopupRef.current=null; return; }
    const {playerId,rdNumber}=popup;
    const amount=parseFloat(val);
    if(!amount||amount<=0){ setRdInputPopup(null); rdInputPopupRef.current=null; setRdInputVal(""); setRdInputDate(""); return; }
    const rdDate=dateVal||today;
    await supabase.from("planned_redeposits").delete().eq("player_id",playerId).eq("rd_number",rdNumber);
    await supabase.from("planned_redeposits").insert({player_id:playerId,rd_number:rdNumber,amount,date:rdDate});
    await logAction("rd_planned",playerId,{rd_number:rdNumber,amount,date:rdDate});
    setRdInputPopup(null); rdInputPopupRef.current=null; setRdInputVal(""); setRdInputDate(""); showToast("РД запланирован"); onReload();
  };

  const revertRdToPlanned = async (playerId, rdNumber, amount, date) => {
    if(readonly) return;
    if(!confirm("Вернуть РД в плановый?")) return;
    await supabase.from("redeposits").delete().eq("player_id",playerId).eq("rd_number",rdNumber);
    await supabase.from("planned_redeposits").insert({player_id:playerId,rd_number:rdNumber,amount,date});
    showToast("РД возвращён в плановые"); onReload();
  };

  const saveInlineRd = async () => {
    if (!inlineEdit||!inlineVal||readonly) { setInlineEdit(null); setInlineDate(""); return; }
    const { playerId, rdNumber } = inlineEdit;
    const amount = parseFloat(inlineVal);
    if (!amount||amount<=0) { setInlineEdit(null); setInlineVal(""); setInlineDate(""); return; }
    const rdDate = inlineDate || today;
    await supabase.from("planned_redeposits").delete().eq("player_id",playerId).eq("rd_number",rdNumber);
    await supabase.from("planned_redeposits").insert({ player_id:playerId, rd_number:rdNumber, amount, date:rdDate });
    setInlineEdit(null); setInlineVal(""); setInlineDate(""); showToast("РД запланирован — нажми чтобы подтвердить"); onReload();
  };

  const confirmPlannedRd = async (playerId, rdNumber, amount) => {
    if (readonly) return;
    await supabase.from("redeposits").insert({ player_id:playerId, rd_number:rdNumber, amount, date:today });
    await supabase.from("planned_redeposits").delete().eq("player_id",playerId).eq("rd_number",rdNumber);
    const nextRd=new Date(new Date(today).setDate(new Date(today).getDate()+7)).toISOString().slice(0,10);
    await supabase.from("players").update({ next_rd_date:nextRd }).eq("id",playerId);
    await logAction("rd_added",playerId,{rd_number:rdNumber,amount,date:today});
    showToast("РД подтверждён!"); onReload();
  };

  const editRd = async () => {
    if (!showEditRd||!showEditRd.amount||readonly) return;
    const rd=redeposits.find(r=>r.player_id===showEditRd.playerId&&r.rd_number===showEditRd.rdNumber); if (!rd) return;
    const prev={amount:rd.amount,date:rd.date};
    await supabase.from("redeposits").update({ amount:Number(showEditRd.amount), date:showEditRd.date }).eq("id",rd.id);
    showToast("РД обновлён!","ok",async()=>{ await supabase.from("redeposits").update(prev).eq("id",rd.id); showToast("Отменено"); onReload(); });
    setShowEditRd(null); onReload();
  };

  const resetRd = async (playerId, rdNumber) => {
    if (readonly) return;
    const rd=redeposits.find(r=>r.player_id===playerId&&r.rd_number===rdNumber); if (!rd) return;
    const prev={amount:rd.amount,date:rd.date,player_id:playerId,rd_number:rdNumber};
    await supabase.from("redeposits").delete().eq("id",rd.id);
    showToast("РД сброшен","ok",async()=>{ await supabase.from("redeposits").insert(prev); showToast("Восстановлено"); onReload(); });
    setShowEditRd(null); onReload();
  };

  const updateStatus = async (playerId, status) => {
    if (readonly) return;
    await supabase.from("players").update({status}).eq("id",playerId);
    await logAction("status_changed",playerId,{status});
    setStatusPopup(null); onReload();
  };

  const updateColor = async (playerId, color) => {
    if (readonly) return;
    const player = (players||[]).find(p=>p&&p.id===playerId);
    if (player?.sub18) {
      await supabase.from("players").update({color}).eq("sub18", player.sub18);
    } else if (player?.name) {
      await supabase.from("players").update({color}).eq("name", player.name);
    } else {
      await supabase.from("players").update({color}).eq("id", playerId);
    }
    setColorPopup(null); onReload();
  };

  const updatePlatform = async (playerId, platformId) => {
    if(readonly) return;
    await supabase.from("players").update({platform_id:platformId}).eq("id",playerId);
    setPlatformPopup(null); onReload();
  };

  const saveComment = async (playerId) => {
    if (readonly) return;
    await supabase.from("players").update({ comment:commentVal }).eq("id",playerId);
    setCommentEdit(null); onReload();
  };

  useEffect(() => {
    if(!rdInputPopup) return;
    const h=(e)=>{ if(rdInputRef.current&&!rdInputRef.current.contains(e.target)) setRdInputPopup(null); };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[rdInputPopup]);

  useEffect(() => {
    if(!platformPopup) return;
    const h=()=>setPlatformPopup(null);
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[platformPopup]);

  const handleDragStart = (idx) => { if (readonly) return; setDragIdx(idx); };
  const handleDragOver = (e, idx) => {
    if (readonly) return;
    e.preventDefault();
    if (dragIdx===null||dragIdx===idx) return;
    const reordered=[...localPlayers];
    const [moved]=reordered.splice(dragIdx,1);
    reordered.splice(idx,0,moved);
    setLocalPlayers(reordered); setDragIdx(idx);
  };
  const handleDragEnd = async () => {
    if (readonly) return;
    setDragIdx(null);
    await Promise.all(localPlayers.filter(p=>p&&p.id).map((p,i)=>supabase.from("players").update({sort_order:i}).eq("id",p.id)));
  };

  const toggleMonth = (mk) => setHiddenMonths(prev=>{ const n=new Set(prev); n.has(mk)?n.delete(mk):n.add(mk); return n; });

  const playersByMonth = {};
  localPlayers.filter(p=>p&&p.id).forEach(p=>{ const mk=getMonthKey(p.date); if(!playersByMonth[mk]) playersByMonth[mk]=[]; playersByMonth[mk].push(p); });
  const months = Object.keys(playersByMonth).sort().reverse();

  const T = dark ? { border:"#2d3148",text:"#e2e8f0",muted:"#64748b",sub:"#94a3b8",inputBg:"#0f1117",thBg:"#151824",rowBorder:"#1e2235",rdPlan:"#3d4268",rdFact:"#e2e8f0",monthHdr:"#1a1d27",surface:"#1a1d27" }
    : { border:"#dde1ea",text:"#1e293b",muted:"#94a3b8",sub:"#64748b",inputBg:"#e8eaf0",thBg:"#e8eaf0",rowBorder:"#e2e6ef",rdPlan:"#b0b8cc",rdFact:"#1e293b",monthHdr:"#e8eaf0",surface:"#f5f6fa" };
  const IS = { background:T.inputBg,border:`1px solid ${T.border}`,color:T.text,padding:"8px 10px",borderRadius:7,fontSize:13,outline:"none",width:"100%",boxSizing:"border-box" };
  const S = {
    th:{ padding:"8px 8px",textAlign:"left",fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".07em",borderBottom:`1px solid ${T.border}`,background:T.thBg,whiteSpace:"nowrap" },
    td:{ padding:"7px 8px",borderBottom:`1px solid ${T.rowBorder}`,verticalAlign:"middle",whiteSpace:"nowrap" },
    rdTh:{ padding:"8px 4px",textAlign:"center",fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",borderBottom:`1px solid ${T.border}`,background:T.thBg,width:52 },
    rdTd:{ padding:"5px 4px",textAlign:"center",borderBottom:`1px solid ${T.rowBorder}`,verticalAlign:"middle",width:52 },
  };

  return (
    <>
      {statusPopup && <StatusPopup x={statusPopup.x} y={statusPopup.y} onSelect={st=>updateStatus(statusPopup.playerId,st)} onClose={()=>setStatusPopup(null)} dark={dark}/>}
      {colorPopup && <ColorPopup x={colorPopup.x} y={colorPopup.y} onSelect={c=>updateColor(colorPopup.playerId,c)} onClose={()=>setColorPopup(null)} dark={dark}/>}

      {rdInputPopup&&(()=>{
        const openUp=rdInputPopup.y+100>window.innerHeight-20;
        const Tb=dark?{bg:"#1a1d27",border:"#2d3148",text:"#e2e8f0",muted:"#64748b"}:{bg:"#f1f5f9",border:"#cbd5e1",text:"#1e293b",muted:"#64748b"};
        return(
          <div ref={rdInputRef} className="fade-in" style={{ position:"fixed",left:Math.min(rdInputPopup.x-10,window.innerWidth-160),top:openUp?rdInputPopup.y-90:rdInputPopup.y+8,background:Tb.bg,border:`1px solid ${Tb.border}`,borderRadius:8,padding:"8px 10px",zIndex:5000,boxShadow:"0 4px 20px rgba(0,0,0,.5)",width:150 }}
            onMouseDown={e=>e.stopPropagation()}>
            <input autoFocus type="text" inputMode="numeric" placeholder="Сумма €" value={rdInputVal} onChange={e=>setRdInputVal(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"){ saveRdPopup(); } if(e.key==="Escape") setRdInputPopup(null); }}
              onBlur={()=>{ setTimeout(()=>{ if(!rdInputRef.current?.contains(document.activeElement)) saveRdPopup(); },150); }}
              style={{ background:"transparent",border:"none",borderBottom:`1px solid ${Tb.border}`,color:Tb.text,padding:"2px 0",fontSize:14,outline:"none",width:"100%",marginBottom:6,fontWeight:600 }}/>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <span style={{ fontSize:10,color:Tb.muted }}>📅</span>
              <input type="date" value={rdInputDate} onChange={e=>setRdInputDate(e.target.value)}
                style={{ background:"transparent",border:"none",color:Tb.muted,fontSize:11,outline:"none",flex:1,cursor:"pointer" }}/>
            </div>
          </div>
        );
      })()}
      {platformPopup && (()=>{
        const popupH=platforms.length*32+16;
        const openUp=platformPopup.y+popupH>window.innerHeight-20;
        const Tb=dark?{bg:"#1a1d27",border:"#2d3148",text:"#e2e8f0",muted:"#64748b"}:{bg:"#f1f5f9",border:"#cbd5e1",text:"#1e293b",muted:"#64748b"};
        return(
          <div className="fade-in" style={{ position:"fixed",left:platformPopup.x,top:openUp?platformPopup.y-popupH:platformPopup.y,background:Tb.bg,border:`1px solid ${Tb.border}`,borderRadius:10,padding:6,zIndex:5000,boxShadow:"0 8px 32px rgba(0,0,0,.4)",minWidth:180,maxHeight:280,overflowY:"auto" }}
            onMouseDown={e=>e.stopPropagation()}>
            <div style={{ fontSize:10,color:Tb.muted,padding:"4px 10px 6px",fontWeight:700,textTransform:"uppercase" }}>Сменить платформу</div>
            {platforms.map(p=><div key={p.id} onClick={()=>updatePlatform(platformPopup.playerId,p.id)} style={{ padding:"6px 10px",borderRadius:6,cursor:"pointer",fontSize:12,color:Tb.text,transition:"background .15s" }} onMouseEnter={e=>e.currentTarget.style.background=dark?"rgba(99,102,241,.12)":"rgba(99,102,241,.08)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{p.name}</div>)}
          </div>
        );
      })()}

      {showEditRd && !readonly && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }} onClick={e=>e.target===e.currentTarget&&setShowEditRd(null)}>
          <div className="slide-in" style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:24,width:"100%",maxWidth:340,boxShadow:"0 24px 64px rgba(0,0,0,.6)" }}>
            <h3 style={{ color:T.text,marginBottom:6,fontSize:15,fontWeight:700 }}>РД{showEditRd.rdNumber}</h3>
            <p style={{ color:T.muted,fontSize:13,marginBottom:18 }}>{localPlayers.find(p=>p.id===showEditRd.playerId)?.name}</p>
            {[["Сумма (€)","amount","number"],["Дата","date","date"]].map(([l,k,t])=>(
              <div key={k} style={{ marginBottom:14 }}>
                <label style={{ display:"block",fontSize:10,color:T.muted,marginBottom:5,fontWeight:700,textTransform:"uppercase" }}>{l}</label>
                <input type={t} value={showEditRd[k]} onChange={e=>setShowEditRd(prev=>({...prev,[k]:e.target.value}))} style={IS}/>
              </div>
            ))}
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={editRd} className="btn-p" style={{ flex:1,padding:"10px",fontSize:14 }}>Сохранить</button>
              <button onClick={()=>resetRd(showEditRd.playerId,showEditRd.rdNumber)} style={{ background:"linear-gradient(135deg,#7f1d1d,#991b1b)",color:"#fca5a5",border:"none",padding:"10px 14px",borderRadius:8,cursor:"pointer",fontWeight:700 }}>Сбросить</button>
              <button onClick={()=>setShowEditRd(null)} className="btn-g" style={{ flex:1,border:`1px solid ${T.border}`,color:T.sub,padding:"10px",borderRadius:8,cursor:"pointer" }}>Отмена</button>
            </div>
            <button onClick={()=>{ revertRdToPlanned(showEditRd.playerId,showEditRd.rdNumber,showEditRd.amount,showEditRd.date); setShowEditRd(null); }} style={{ marginTop:10,width:"100%",background:"transparent",border:`1px solid ${T.border}`,color:T.muted,padding:"7px",borderRadius:8,cursor:"pointer",fontSize:12 }}>↩ Вернуть в плановый</button>
          </div>
        </div>
      )}

      <div style={{ overflowX:"auto",border:`1px solid ${T.border}`,borderRadius:10 }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr><th style={{ ...S.th,padding:"6px 8px" }} colSpan={(readonly?0:2)+17+(isPoland?1:0)}>ЛИДЫ{readonly?" (только просмотр)":""}</th></tr>
            <tr>
              {!readonly && <th style={{ ...S.th,width:20 }}></th>}
              {!readonly && <th style={{ ...S.th,width:24 }}></th>}
              <th style={S.th}>Дата</th>
              <th style={S.th}>Продукт</th>
              <th style={S.th}>Имя</th>
              <th style={S.th}>SUB18</th>
              <th style={S.th}>Деп</th>
              {Array(9).fill(0).map((_,i)=><th key={i} style={S.rdTh}>Рд{i+1}</th>)}
              <th style={S.th}>Всего</th>
              <th style={S.th}>Статус</th>
              {isPoland&&<th style={S.th}>BLIK</th>}
              <th style={S.th}>Заметка</th>
            </tr>
          </thead>
          <tbody>
            {months.map(mk=>{
              const mPlayers=playersByMonth[mk]||[];
              const isHidden=hiddenMonths.has(mk);
              const [yr,mo]=mk.split("-");
              const monthLabel=new Date(Number(yr),Number(mo)-1,1).toLocaleString("ru",{month:"long",year:"numeric"});
              return (
                <>
                  <tr key={`m-${mk}`}>
                    <td colSpan={(readonly?0:2)+17+(isPoland?1:0)} style={{ padding:"7px 12px",background:T.monthHdr,borderBottom:`1px solid ${T.border}`,borderTop:`2px solid ${T.border}` }}>
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <button onClick={()=>toggleMonth(mk)} className="btn-g" style={{ border:`1px solid ${T.border}`,color:T.sub,padding:"2px 10px",borderRadius:6,cursor:"pointer",fontSize:11 }}>
                          {isHidden?"▶ Показать":"▼ Скрыть"}
                        </button>
                        <span style={{ color:T.text,fontWeight:600,fontSize:12 }}>{monthLabel}</span>
                        <span style={{ color:T.muted,fontSize:11 }}>{mPlayers.length} лидов</span>
                      </div>
                    </td>
                  </tr>
                  {!isHidden && mPlayers.map((player,idx)=>{
                    const rds=getPlayerRds(player.id);
                    const planned=getPlayerPlanned(player.id);
                    const rdArr=Array(9).fill(null).map((_,i)=>{ const f=rds.find(r=>r.rd_number===i+1); const p=planned.find(r=>r.rd_number===i+1); return f?{...f,isFact:true}:p?{...p,isFact:false}:null; });
                    const total=calcTotal(player);
                    const plat=platforms.find(p=>p.id===player.platform_id);
                    const colorInfo=LEAD_COLORS.find(c=>c.key===player.color)||LEAD_COLORS[0];
                    const globalIdx=localPlayers.indexOf(player);
                    return (
                      <tr key={player.id} className="row-hover"
                        draggable={!readonly} onDragStart={()=>handleDragStart(globalIdx)} onDragOver={e=>handleDragOver(e,globalIdx)} onDragEnd={handleDragEnd}
                        style={{ background:colorInfo.bg||"transparent" }}>
                        {!readonly && <td style={S.td}><span className="drag-handle" title="Перетащи">⠿</span></td>}
                        {!readonly && <td style={{ ...S.td,textAlign:"center" }}>
                          <input type="checkbox" checked={excludedIds.has(player.id)} onChange={()=>setExcludedIds(s=>{ const n=new Set(s); n.has(player.id)?n.delete(player.id):n.add(player.id); return n; })} title="Исключить из автоматизации" style={{ width:13,height:13,accentColor:"#6366f1",cursor:"pointer" }}/>
                        </td>}
                        <td style={{ ...S.td,color:T.muted,fontSize:11,cursor:readonly?"default":"pointer" }} onClick={readonly?undefined:()=>setDateEdit(player.id)}>
                          {dateEdit===player.id&&!readonly
                            ?<input autoFocus type="date" defaultValue={player.date} onBlur={async e=>{ await supabase.from("players").update({date:e.target.value}).eq("id",player.id); setDateEdit(null); onReload(); }} onKeyDown={e=>{ if(e.key==="Escape") setDateEdit(null); }} style={{ ...IS,fontSize:11,padding:"2px 4px",width:120 }}/>
                            :<span style={{ borderBottom:readonly?"none":`1px dashed ${T.border}` }}>{player.date?(([y,m,d])=>`${d}.${m}.${y}`)(player.date.split("-")):"—"}</span>}
                        </td>
                        <td style={{ ...S.td,color:T.text,fontSize:11,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",cursor:readonly?"default":"pointer" }} onClick={readonly?undefined:e=>setPlatformPopup({playerId:player.id,x:e.clientX-10,y:e.clientY+8})} title={readonly?"":plat?.name}>{plat?.name||"—"}</td>
                        <td style={{ ...S.td,fontSize:12,fontWeight:500 }}>
                          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                            {!readonly && <div onClick={e=>setColorPopup({playerId:player.id,x:e.clientX-10,y:e.clientY+8})} style={{ width:8,height:8,borderRadius:"50%",background:colorInfo.dot,cursor:"pointer",flexShrink:0 }} title="Цвет"/>}
                            {readonly && <div style={{ width:8,height:8,borderRadius:"50%",background:colorInfo.dot,flexShrink:0 }}/>}
                            <span style={{ color:T.text }}>{player.name}</span>
                          </div>
                        </td>
                        <td style={{ ...S.td,color:T.muted,fontSize:10,fontFamily:"monospace",cursor:"pointer" }} onClick={()=>player.sub18&&copyToClipboard(player.sub18)} title="Скопировать">
                          <span style={{ borderBottom:`1px dashed ${T.border}` }}>{player.sub18||"—"}</span>
                        </td>
                        <td style={{ ...S.td,color:T.text,fontWeight:600 }}>{player.deposit}€</td>
                        {rdArr.map((rd,i)=>{
                          const isToday=rd&&!rd.isFact&&rd.date===today;
                          const rdColor=rd?(rd.isFact?T.rdFact:T.rdPlan):T.border;
                          return (
                            <td key={i} className="rd-cell" style={{ ...S.rdTd,color:rdColor,fontWeight:rd?.isFact?700:400,lineHeight:1.3 }}
                              onClick={e=>{
                                if (readonly) return;
                                if (!rd) { const popup={playerId:player.id,rdNumber:i+1,x:e.clientX,y:e.clientY}; rdInputPopupRef.current=popup; setRdInputPopup(popup); setRdInputVal(""); setRdInputDate(today); return; }
                                if (rd.isFact) setShowEditRd({playerId:player.id,rdNumber:rd.rd_number,amount:rd.amount,date:rd.date,canRevert:true});
                                else markPlannedAsDone(player.id,rd.rd_number,rd.amount,rd.date);
                              }}
                              title={readonly?"":!rd?"Ввести РД":rd.isFact?"Изменить":"Нажми для подтверждения"}>
                              {rd?<div>
                                <div style={{ fontSize:11 }}>{rd.amount}€</div>
                                {rd.isFact
                                  ?<div style={{ fontSize:9,color:T.muted,marginTop:1 }}>{formatDate(rd.date)}</div>
                                  :(rdDateEdit?.playerId===player.id&&rdDateEdit?.rdNumber===rd.rd_number&&!readonly)
                                    ?<input autoFocus type="date" defaultValue={rd.date} style={{ fontSize:9,padding:"1px 2px",width:90,background:T.inputBg,border:`1px solid ${T.border}`,color:T.text,borderRadius:3 }}
                                        onBlur={async e=>{ await supabase.from("planned_redeposits").update({date:e.target.value}).eq("player_id",player.id).eq("rd_number",rd.rd_number); setRdDateEdit(null); onReload(); }}
                                        onKeyDown={e=>{ if(e.key==="Escape") setRdDateEdit(null); }}
                                        onClick={e=>e.stopPropagation()}/>
                                    :<div style={{ fontSize:9,color:T.muted,marginTop:1,cursor:readonly?"default":"pointer" }}
                                        onClick={e=>{ e.stopPropagation(); if(!readonly) setRdDateEdit({playerId:player.id,rdNumber:rd.rd_number}); }}
                                        title="Изменить дату">
                                        {formatDate(rd.date)}
                                      </div>
                                }
                              </div>:<span style={{ fontSize:16,opacity:.2 }}>+</span>}
                            </td>
                          );
                        })}
                        <td style={{ ...S.td,color:T.text,fontWeight:700 }}>{total}€</td>
                        <td style={S.td}><StatusBadge status={player.status} dark={dark} onClick={readonly?undefined:e=>setStatusPopup({playerId:player.id,x:e.clientX-10,y:e.clientY+8})}/></td>
                        {isPoland&&<td style={S.td}>{player.is_blik&&<span style={{ background:dark?"linear-gradient(135deg,#451a03,#78350f)":"linear-gradient(135deg,#fef3c7,#fde68a)",color:dark?"#d97706":"#92400e",padding:"2px 6px",borderRadius:4,fontSize:10,fontWeight:700 }}>BLIK</span>}</td>}
                        <td style={{ ...S.td,maxWidth:140 }}>
                          <div style={{ display:"flex",alignItems:"center",gap:4 }}>
                          {commentEdit===player.id&&!readonly?(
                            <input autoFocus value={commentVal} onChange={e=>setCommentVal(e.target.value)}
                              onBlur={()=>saveComment(player.id)} onKeyDown={e=>{ if(e.key==="Enter") saveComment(player.id); if(e.key==="Escape") setCommentEdit(null); }}
                              style={{ ...IS,fontSize:11,padding:"3px 6px",width:130 }}/>
                          ):(
                            <span onClick={readonly?undefined:()=>{ setCommentEdit(player.id); setCommentVal(player.comment||""); }} style={{ color:player.comment?T.sub:T.border,fontSize:11,cursor:readonly?"default":"pointer",fontStyle:player.comment?"normal":"italic" }}>
                              {player.comment||(readonly?"—":"+ заметка")}
                            </span>
                          )}
                          {!readonly&&<button onClick={async()=>{ if(!confirm(`Удалить лида "${player.name}"?`)) return; await supabase.from("redeposits").delete().eq("player_id",player.id); await supabase.from("planned_redeposits").delete().eq("player_id",player.id); await supabase.from("players").delete().eq("id",player.id); onReload(); }} className="del-btn" style={{ marginLeft:"auto",background:"transparent",border:"none",color:"#7f1d1d",cursor:"pointer",fontSize:14,opacity:0,transition:"opacity .2s",padding:"2px 4px",borderRadius:4 }} title="Удалить лида">✕</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </>
              );
            })}
            {localPlayers.length===0&&<tr><td colSpan={(readonly?0:2)+17+(isPoland?1:0)} style={{ padding:24,textAlign:"center",color:T.muted }}>Нет лидов</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Manager Page ─────────────────────────────────────────────────────────────
function AddLeadForm({ dark, T, IS, leadForm, setLeadForm, geoPlatforms, myGeos, activeGeo, onSubmit, onClose }) {
  const isPoland = myGeos.find(g=>g.id===activeGeo)?.code==='PL';
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="slide-in" style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:24,width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,.6)" }}>
        <h3 style={{ color:T.text,marginBottom:18,fontSize:15,fontWeight:700 }}>Добавить лида</h3>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12 }}>
          {[["Дата","date","date"],["Продукт","platform_id","select"],["Имя лида","name","text"],["SUB18","sub18","text"],["Депозит (€)","deposit","number"]].map(([l,k,t])=>(
            <div key={k} style={{ gridColumn:k==="name"?"1/-1":undefined }}>
              <label style={{ display:"block",fontSize:10,color:T.muted,marginBottom:4,fontWeight:700,textTransform:"uppercase" }}>{l}</label>
              {t==="select"
                ?<select value={leadForm[k]} onChange={e=>setLeadForm(f=>({...f,[k]:e.target.value}))} style={IS}><option value="">— Без платформы</option>{geoPlatforms.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
                :<input type={t==="number"?"text":t} inputMode={t==="number"?"numeric":undefined} value={leadForm[k]} onChange={e=>setLeadForm(f=>({...f,[k]:e.target.value}))} style={IS}/>}
            </div>
          ))}
        </div>
        {isPoland&&(
          <div style={{ marginBottom:12 }}>
            <label style={{ display:"block",fontSize:10,color:T.muted,marginBottom:6,fontWeight:700,textTransform:"uppercase" }}>BLIK?</label>
            <div style={{ display:"flex",background:T.inputBg,borderRadius:7,padding:2,gap:2,width:"fit-content" }}>
              {[["Нет",false],["BLIK",true]].map(([l,v])=><button key={String(v)} onClick={()=>setLeadForm(f=>({...f,is_blik:v}))} style={{ border:"none",padding:"5px 14px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,background:leadForm.is_blik===v?(v?"linear-gradient(135deg,#d97706,#f59e0b)":"linear-gradient(135deg,#6366f1,#818cf8)"):"transparent",color:leadForm.is_blik===v?"#fff":T.muted,transition:"all .2s" }}>{l}</button>)}
            </div>
          </div>
        )}
        <div style={{ marginBottom:12 }}>
          <label style={{ display:"block",fontSize:10,color:T.muted,marginBottom:6,fontWeight:700,textTransform:"uppercase" }}>Статус</label>
          <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
            {STATUSES.map(st=><button key={st} type="button" onClick={()=>setLeadForm(f=>({...f,status:st}))} style={{ cursor:"pointer",outline:leadForm.status===st?"2px solid #6366f1":"none",borderRadius:20,outlineOffset:2,background:"transparent",border:"none",padding:0 }}><StatusBadge status={st} dark={dark}/></button>)}
          </div>
        </div>
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={onSubmit} className="btn-p" style={{ flex:1,padding:"10px",fontSize:14 }}>Добавить</button>
          <button onClick={onClose} className="btn-g" style={{ flex:1,border:`1px solid ${T.border}`,color:T.muted,padding:"10px",borderRadius:8,cursor:"pointer" }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

function ManagerPage({ manager, onLogout }) {
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
  const [tab, setTab] = useState("main");
  const [activeGeo, setActiveGeo] = useState(null);
  const [viewingManager, setViewingManager] = useState(() => ({})); // { geoId: managerId }
  const [pinnedPlatforms, setPinnedPlatforms] = useState(()=>{ try{ return JSON.parse(localStorage.getItem(`pinned_${manager.id}`)||"[]"); }catch{ return []; } });
  const updatePinnedPlatforms = (fn) => { setPinnedPlatforms(prev=>{ const next=typeof fn==='function'?fn(prev):fn; localStorage.setItem(`pinned_${manager.id}`,JSON.stringify(next)); return next; }); };
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('desc');
  const [toast, setToast] = useState(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showAddRd, setShowAddRd] = useState(null);
  const [showAutomation, setShowAutomation] = useState(false);
  const [automationPreview, setAutomationPreview] = useState([]);
  const [excludedIds, setExcludedIds] = useState(new Set());
  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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
    const [{ data:p },{ data:pl },{ data:rd },{ data:prd },{ data:ug },{ data:g },{ data:am },{ data:allUg }] = await Promise.all([
      supabase.from("platforms").select("*").eq("is_active",true).order("sort_order").order("name"),
      supabase.from("players").select("*").order("sort_order",{ascending:true,nullsFirst:false}).order("date",{ascending:false}),
      supabase.from("redeposits").select("*"),
      supabase.from("planned_redeposits").select("*"),
      supabase.from("user_geos").select("*, geos(*)").eq("manager_id",manager.id),
      supabase.from("geos").select("*").eq("is_active",true),
      supabase.from("managers").select("*").eq("is_active",true),
      supabase.from("user_geos").select("*"),
    ]);
    setPlatforms(p||[]); setRedeposits(rd||[]); setPlannedRds(prd||[]);
    setGeos(g||[]); setAllManagers(am||[]); setUserGeos(allUg||[]);
    const myGeoList=(ug||[]).map(u=>u&&u.geos).filter(g=>g&&g.id);
    setMyGeos(myGeoList);
    const firstGeo=myGeoList.length>0?myGeoList[0].id:null;
    if (myGeoList.length>0&&!activeGeo) setActiveGeo(firstGeo);
    const myPlayers=(pl||[]).filter(p=>p&&p.id&&p.manager_id===manager.id);
    setPlayers(myPlayers);
    setAllPlayers((pl||[]).filter(p=>p&&p.id));
  };
  useEffect(()=>{ load(); },[]);

  const today = new Date().toISOString().slice(0,10);
  const isTeamLead = manager.role === "team_lead";

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

  const platformStats = platforms.map(plat=>{
    const active=players.filter(p=>p.platform_id===plat.id&&p.status==="Да");
    const cnt=active.length,amt=active.reduce((s,p)=>s+calcEffectiveTotal(p),0),avg=cnt>0?amt/cnt:0;
    const blik=active.filter(p=>p.is_blik).length,blikPct=cnt>0?Math.round((blik/cnt)*100):0;
    const need=cnt>0?Math.max(0,plat.target_avg_check*cnt-amt):0;
    return{...plat,totalCount:cnt,totalAmount:amt,avgCheck:avg,blikCount:blik,blikPct,needMore:need};
  });

  const allMonths=[...new Set(players.map(p=>p.date?p.date.slice(0,7):"").filter(Boolean))].sort().reverse();
  const getStatPlayers=()=>!filterMonth?players.filter(p=>p.status==="Да"):players.filter(p=>p.status==="Да"&&p.date?.slice(0,7)===filterMonth);

  const geoPlatforms = activeGeo ? platforms.filter(p=>p.geo_id===activeGeo) : platforms;

  const filteredPlayers = players.filter(p=>{
    const plat=platforms.find(pl=>pl.id===p.platform_id);
    if(activeGeo&&plat&&plat.geo_id!==activeGeo) return false;
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

  const overdueRds=players.filter(p=>p.next_rd_date&&p.next_rd_date<today);
  const todayRds=players.filter(p=>p.next_rd_date&&p.next_rd_date<=today);

  const chartData=(()=>{
    const byDay={};
    players.filter(p=>p.status==="Да").forEach(p=>{
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

      {showAddLead&&(
        <AddLeadForm
          dark={dark} T={T} IS={IS}
          leadForm={leadForm} setLeadForm={setLeadForm}
          geoPlatforms={geoPlatforms} myGeos={myGeos} activeGeo={activeGeo}
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
        {[["main","Мои лиды"],["todo","📋 Задачи"],["team","Команда"+(myGeos.length>0?"":" ")],["overdue","Просроченные"+(overdueRds.length>0?` (${overdueRds.length})`:"")],["stats","Статистика"],["platforms","Платформы"],...(isTeamLead?[["overview","Сводка"]]:[])]
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
              const factTotal=allActive.reduce((s,p)=>s+calcEffectiveTotal(p),0);
              const avgFact=allActive.length>0?factTotal/allActive.length:0;
              const ok=avgFact>=(plat.target_avg_check||0);
              const myActive=players.filter(p=>p.platform_id===plat.id&&p.status==="Да");
              const myFactTotal=myActive.reduce((s,p)=>s+calcEffectiveTotal(p),0);
              const myPlannedExtra=myActive.reduce((s,p)=>s+plannedRds.filter(r=>r&&r.player_id===p.id).reduce((a,r)=>a+Number(r.amount),0),0);
              const plannedAvg=myActive.length>0?(myFactTotal+myPlannedExtra)/myActive.length:0;
              const needMore=Math.max(0,(plat.target_avg_check||0)*capCount-factTotal);
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
            <div style={{ background:T.alertBg,border:`1px solid ${T.alertBorder}`,borderRadius:10,padding:"10px 16px",display:"flex",alignItems:"center",gap:10,marginBottom:14 }}>
              <span className="alert-pulse" style={{ fontSize:18 }}>🔔</span>
              <span style={{ color:"#d97706",fontWeight:700,fontSize:13 }}>Сегодня нужно сделать РД:</span>
              <span style={{ color:dark?"#fbbf24":"#92400e",fontSize:13 }}>{todayRds.map(p=>p.name).join(" · ")}</span>
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
          <PlayersTable players={sortedPlayers} redeposits={redeposits} plannedRds={plannedRds} platforms={platforms} manager={manager} dark={dark} readonly={false} onReload={load} showToast={showToast} excludedIds={excludedIds} setExcludedIds={setExcludedIds} isPoland={myGeos.find(g=>g.id===activeGeo)?.code==='PL'}/>
        </div>
      )}

      {/* TODO */}
      {tab==="todo"&&(
        <div style={{ padding:"16px 20px" }}>
          <h2 style={{ color:T.text,marginBottom:16,fontSize:18 }}>Задачи на сегодня</h2>
          {(()=>{
            const todayStr=new Date().toISOString().slice(0,10);
            const tasks=players.filter(p=>p.status==="Да").flatMap(p=>{
              const factRds=redeposits.filter(r=>r&&r.player_id===p.id);
              const planned=plannedRds.filter(r=>r&&r.player_id===p.id).sort((a,b)=>a.rd_number-b.rd_number);
              const plat=platforms.find(pl=>pl.id===p.platform_id);
              const results=[];
              // Плановые РД на сегодня
              planned.forEach(r=>{
                if(r.date===todayStr) results.push({ player:p, plat, rdNum:r.rd_number, date:r.date, isOverdue:false });
              });
              // next_rd_date на сегодня или просрочен (без планового)
              if(p.next_rd_date&&p.next_rd_date<=todayStr&&results.length===0){
                results.push({ player:p, plat, rdNum:factRds.length+1, date:p.next_rd_date, isOverdue:p.next_rd_date<todayStr });
              }
              return results;
            });

            if(tasks.length===0) return <div style={{ color:T.muted,fontSize:14,padding:"20px 0" }}>На сегодня задач нет</div>;

            return(
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {tasks.map(({player,plat,rdNum,date,isOverdue},idx)=>(
                  <div key={`${player.id}-${rdNum}-${idx}`} style={{ background:T.surface,border:`1px solid ${isOverdue?"#7f1d1d":T.border}`,borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",gap:12 }}>
                    <div style={{ width:8,height:8,borderRadius:"50%",background:isOverdue?"#ef4444":"#6366f1",flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:3 }}>
                        <span style={{ fontWeight:700,color:T.text,fontSize:14 }}>{player.name}</span>
                        {player.sub18&&<span onClick={()=>{ navigator.clipboard.writeText(player.sub18); showToast("SUB18 скопирован"); }} style={{ color:T.muted,fontSize:11,fontFamily:"monospace",cursor:"pointer",borderBottom:`1px dashed ${T.border}` }} title="Скопировать SUB18">{player.sub18}</span>}
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
                    <PlayersTable
                      players={allPlayers.filter(p=>p&&p.id&&p.manager_id===viewing)}
                      redeposits={redeposits} plannedRds={plannedRds} platforms={platforms}
                      manager={manager} dark={dark}
                      readonly={!isTeamLead}
                      onReload={load} showToast={showToast}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* OVERDUE */}
      {tab==="overdue"&&(
        <div style={{ padding:"16px 20px" }}>
          <h2 style={{ color:T.text,marginBottom:20,fontSize:18 }}>Просроченные РД</h2>
          {overdueRds.length===0?<div style={{ textAlign:"center",padding:40,color:T.muted }}>✅ Нет просроченных РД</div>:(
            <div style={{ border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden" }}>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead><tr>{["Лид","Платформа","SUB18","Последний РД","Просроченная дата","Дней просрочено","Статус"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {overdueRds.map(player=>{
                    const plat=platforms.find(p=>p.id===player.platform_id);
                    const daysDiff=Math.floor((new Date(today)-new Date(player.next_rd_date))/(1000*60*60*24));
                    const rds=getPlayerRds(player.id);
                    const lastRd=rds[rds.length-1];
                    return(
                      <tr key={player.id} className="row-hover" style={{ background:dark?"rgba(239,68,68,.04)":"rgba(239,68,68,.03)" }}>
                        <td style={{ ...S.td,fontWeight:600,color:T.text }}>{player.name}</td>
                        <td style={{ ...S.td,color:T.sub,fontSize:12 }}>{plat?.name||"—"}</td>
                        <td style={{ ...S.td,color:T.muted,fontSize:11,fontFamily:"monospace",cursor:"pointer" }} onClick={()=>player.sub18&&navigator.clipboard.writeText(player.sub18)}>{player.sub18||"—"}</td>
                        <td style={{ ...S.td,color:T.sub,fontSize:12 }}>{lastRd?`РД${lastRd.rd_number}: ${lastRd.amount}€`:"—"}</td>
                        <td style={S.td}><span style={{ color:"#f87171",fontWeight:700,fontSize:12 }}>⚠ {player.next_rd_date?(([y,m,d])=>`${d}.${m}.${y}`)(player.next_rd_date.split("-")):"—"}</span></td>
                        <td style={S.td}><span style={{ background:"linear-gradient(135deg,#7f1d1d,#991b1b)",color:"#fca5a5",padding:"2px 8px",borderRadius:6,fontWeight:700,fontSize:11 }}>{daysDiff} дн.</span></td>
                        <td style={S.td}><StatusBadge status={player.status} dark={dark} onClick={e=>{ /* handled in PlayersTable */ }}/></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STATS */}
      {tab==="stats"&&(
        <div style={{ padding:"16px 20px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
            <h2 style={{ color:T.text,fontSize:18,margin:0 }}>Статистика</h2>
            <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{ background:T.surface,border:`1px solid ${T.border}`,color:T.sub,padding:"6px 10px",borderRadius:7,fontSize:12,outline:"none" }}>
              <option value="">Все месяцы</option>
              {allMonths.map(mk=>{ const[yr,mo]=mk.split("-"); return<option key={mk} value={mk}>{new Date(Number(yr),Number(mo)-1,1).toLocaleString("ru",{month:"long",year:"numeric"})}</option>; })}
            </select>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24 }}>
            {[
              ["Всего лидов",getStatPlayers().length,`из ${players.filter(p=>p.status==="Да").length} всего`,"#6366f1"],
              ["Сумма",getStatPlayers().reduce((s,p)=>s+calcEffectiveTotal(p),0).toFixed(0)+"€","деп + редепы","#14b8a6"],
              ["BLIK",getStatPlayers().filter(p=>p.is_blik).length,`${getStatPlayers().length>0?Math.round(getStatPlayers().filter(p=>p.is_blik).length/getStatPlayers().length*100):0}% от активных`,"#d97706"],
              ["Нужно добрать",platformStats.reduce((s,p)=>s+p.needMore,0).toFixed(0)+"€","до цели СЧ","#f59e0b"],
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
          <div style={{ border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead><tr>{["Платформа","Лидов","Сумма","BLIK","СЧ цель","СЧ факт","Нужно добрать"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {platformStats.map(p=>{
                  const ok=p.avgCheck>=p.target_avg_check;
                  return(
                    <tr key={p.id} className="row-hover">
                      <td style={{ ...S.td,fontWeight:600,color:T.text }}>{p.name}</td>
                      <td style={{ ...S.td,color:T.sub }}>{p.totalCount}</td>
                      <td style={{ ...S.td,color:T.sub }}>{p.totalAmount.toFixed(0)}€</td>
                      <td style={S.td}>{p.totalCount>0?<div style={{ display:"flex",alignItems:"center",gap:5 }}><div style={{ width:44,background:T.rowBorder,borderRadius:3,height:4,overflow:"hidden",display:"flex" }}><div className="progress-bar" style={{ width:`${100-p.blikPct}%`,height:"100%",background:"linear-gradient(90deg,#6366f1,#818cf8)" }}/><div className="progress-bar" style={{ width:`${p.blikPct}%`,height:"100%",background:"linear-gradient(90deg,#d97706,#f59e0b)" }}/></div><span style={{ color:"#d97706",fontSize:11 }}>{p.blikCount}({p.blikPct}%)</span></div>:<span style={{ color:T.muted }}>—</span>}</td>
                      <td style={{ ...S.td,color:T.sub }}>{p.target_avg_check}€</td>
                      <td style={S.td}>{p.totalCount>0?<span style={{ background:ok?(dark?"linear-gradient(135deg,#14532d,#166534)":"linear-gradient(135deg,#bbf7d0,#86efac)"):(dark?"linear-gradient(135deg,#7f1d1d,#991b1b)":"linear-gradient(135deg,#fecaca,#f87171)"),color:ok?(dark?"#86efac":"#14532d"):(dark?"#fca5a5":"#7f1d1d"),padding:"2px 9px",borderRadius:6,fontWeight:700,fontSize:11 }}>{p.avgCheck.toFixed(1)}€</span>:<span style={{ color:T.muted }}>—</span>}</td>
                      <td style={{ ...S.td,color:"#f59e0b",fontWeight:700 }}>{p.totalCount>0?p.needMore.toFixed(0)+"€":"—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                    <thead><tr>{["Платформа","Дата","Мин. деп","BLIK деп","Цель СЧ","Капа","Мои лиды","Нужно добрать",...(isTeamLead?["Действия"]:[])].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {geoPlatStats.length===0&&<tr><td colSpan={isTeamLead?9:8} style={{ padding:18,textAlign:"center",color:T.muted,fontSize:13 }}>Нет платформ</td></tr>}
                      {geoPlatStats.map(p=>{
                        const ok=p.avgCheck>=p.target_avg_check;
                        return(
                          <tr key={p.id} className="row-hover">
                            <td style={{ ...S.td,fontWeight:600,color:T.text }}>{p.name}</td>
                            <td style={{ ...S.td,color:T.sub,fontSize:12 }}>{p.date_added||"—"}</td>
                            <td style={{ ...S.td,color:T.sub }}>{p.min_deposit||"—"}€</td>
                            <td style={{ ...S.td,color:"#d97706" }}>{p.min_deposit_blik?p.min_deposit_blik+"€":"—"}</td>
                            <td style={S.td}><span style={{ background:"linear-gradient(135deg,#1e3a5f,#1e40af)",color:"#93c5fd",padding:"2px 9px",borderRadius:6,fontWeight:700,fontSize:11 }}>{p.target_avg_check}€</span></td>
                            <td style={{ ...S.td,color:T.sub }}>{p.cap||"—"}</td>
                            <td style={{ ...S.td,color:dark?"#a5b4fc":"#4f46e5",fontWeight:700 }}>{p.totalCount}</td>
                            <td style={{ ...S.td,color:"#f59e0b",fontWeight:700 }}>{p.totalCount>0?p.needMore.toFixed(0)+"€":"—"}</td>
                            {isTeamLead&&<td style={{ ...S.td,display:"flex",gap:6 }}>
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

      {tab==="overview"&&isTeamLead&&(
        <div style={{ padding:"16px 20px" }}>
          <h2 style={{ color:T.text,marginBottom:20,fontSize:18 }}>Сводка</h2>

          {/* Manager summary */}
          <h3 style={{ color:T.text,fontSize:14,marginBottom:12,fontWeight:700 }}>По менеджерам</h3>
          <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:28 }}>
            {(()=>{
              const geoManagerIds=userGeos.filter(ug=>ug&&ug.geo_id===activeGeo).map(ug=>ug.manager_id);
              const geoMgrs=allManagers.filter(m=>m&&geoManagerIds.includes(m.id));
              return geoMgrs.map(mgr=>{
                const mPlayers=allPlayers.filter(p=>p&&p.manager_id===mgr.id);
                const active=mPlayers.filter(p=>p.status==="Да");
                const overdue=mPlayers.filter(p=>p.next_rd_date&&p.next_rd_date<today);
                const noPlanned=active.filter(p=>{
                  if(plannedRds.some(r=>r&&r.player_id===p.id)) return false;
                  const plat=platforms.find(pl=>pl.id===p.platform_id);
                  if(!plat) return true;
                  // Не считаем если капа заполнена
                  if(plat.cap){
                    const platActiveAll=allPlayers.filter(ap=>ap&&ap.platform_id===plat.id&&ap.status==="Да").length;
                    if(platActiveAll>=plat.cap) return false;
                  }
                  // Не считаем если плановый СЧ этого менеджера по платформе уже достигает цели
                  const mgrPlatActive=active.filter(ap=>ap.platform_id===plat.id);
                  const mgrFactTotal=mgrPlatActive.reduce((s,ap)=>s+calcEffectiveTotal(ap),0);
                  const mgrPlannedExtra=mgrPlatActive.reduce((s,ap)=>s+plannedRds.filter(r=>r&&r.player_id===ap.id).reduce((a,r)=>a+Number(r.amount),0),0);
                  const mgrPlannedAvg=mgrPlatActive.length>0?(mgrFactTotal+mgrPlannedExtra)/mgrPlatActive.length:0;
                  if(mgrPlannedAvg>=(plat.target_avg_check||0)) return false;
                  return true;
                });
                const total=active.reduce((s,p)=>s+calcEffectiveTotal(p),0);
                const avg=active.length>0?total/active.length:0;
                return(
                  <div key={mgr.id} style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 16px" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
                      <div style={{ width:7,height:7,borderRadius:"50%",background:mgr.role==="team_lead"?"#14b8a6":"#6366f1" }}/>
                      <span style={{ fontWeight:700,color:T.text,fontSize:14 }}>{mgr.name}</span>
                      {mgr.role==="team_lead"&&<span style={{ background:"rgba(20,184,166,.15)",color:"#14b8a6",fontSize:10,padding:"1px 6px",borderRadius:4 }}>ТЛ</span>}
                    </div>
                    <div style={{ display:"flex",gap:20,flexWrap:"wrap" }}>
                      <div style={{ fontSize:12,color:T.muted }}>Лидов (Да): <strong style={{ color:T.text }}>{active.length}</strong></div>
                      <div style={{ fontSize:12,color:T.muted }}>СЧ: <strong style={{ color:avg>0?"#86efac":T.muted }}>{avg>0?avg.toFixed(1)+"€":"—"}</strong></div>
                      {overdue.length>0&&<div style={{ fontSize:12,color:"#fca5a5" }}>⚠ Просрочено РД: <strong>{overdue.length}</strong></div>}
                      {noPlanned.length>0&&<div style={{ fontSize:12,color:"#f59e0b" }}>📋 Без плановых РД: <strong>{noPlanned.length}</strong></div>}
                    </div>
                    {overdue.length>0&&(
                      <div style={{ marginTop:8,fontSize:11,color:T.muted }}>
                        Просрочены: {overdue.map(p=><span key={p.id} style={{ background:"rgba(239,68,68,.1)",color:"#fca5a5",padding:"1px 6px",borderRadius:4,marginRight:4 }}>{p.name}</span>)}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>

          {/* Platform stats */}
          <h3 style={{ color:T.text,fontSize:14,marginBottom:12,fontWeight:700 }}>По платформам</h3>
          <div style={{ border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead><tr>{["Платформа","Лидов","Сумма","СЧ факт","СЧ цель","Нужно добрать"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {geoPlatforms.map(plat=>{
                  const platPlayers=allPlayers.filter(p=>p&&p.platform_id===plat.id&&p.status==="Да");
                  if(platPlayers.length===0) return null;
                  const total=platPlayers.reduce((s,p)=>s+calcEffectiveTotal(p),0);
                  const avg=platPlayers.length>0?total/platPlayers.length:0;
                  const need=Math.max(0,plat.target_avg_check*platPlayers.length-total);
                  const ok=avg>=plat.target_avg_check;
                  return(
                    <tr key={plat.id} className="row-hover">
                      <td style={{ ...S.td,fontWeight:600,color:T.text }}>{plat.name}</td>
                      <td style={{ ...S.td,color:dark?"#a5b4fc":"#4f46e5",fontWeight:700 }}>{platPlayers.length}</td>
                      <td style={{ ...S.td,color:T.sub }}>{total.toFixed(0)}€</td>
                      <td style={S.td}><span style={{ background:ok?(dark?"linear-gradient(135deg,#14532d,#166534)":"linear-gradient(135deg,#bbf7d0,#86efac)"):(dark?"linear-gradient(135deg,#7f1d1d,#991b1b)":"linear-gradient(135deg,#fecaca,#f87171)"),color:ok?(dark?"#86efac":"#14532d"):(dark?"#fca5a5":"#7f1d1d"),padding:"2px 8px",borderRadius:5,fontWeight:700,fontSize:12 }}>{avg.toFixed(1)}€</span></td>
                      <td style={{ ...S.td,color:T.muted }}>{plat.target_avg_check}€</td>
                      <td style={{ ...S.td,color:"#f59e0b",fontWeight:700 }}>{need>0?need.toFixed(0)+"€":"✓"}</td>
                    </tr>
                  );
                }).filter(Boolean)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Page ───────────────────────────────────────────────────────────────
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
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f1117,#1a1d27)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ width:"100%", maxWidth:400, padding:24 }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ display:"inline-flex", gap:8, alignItems:"center", marginBottom:12 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#818cf8)", boxShadow:"0 0 12px rgba(99,102,241,.6)" }} />
            <span style={{ fontWeight:800, fontSize:22, color:"#fff", letterSpacing:"0.08em" }}>АРБИТРАЖ</span>
          </div>
          <p style={{ color:"#64748b", fontSize:14 }}>Трекер лидов</p>
        </div>
        <div style={{ background:"rgba(26,29,39,.95)", border:"1px solid #2d3148", borderRadius:16, padding:28 }}>
          <div style={{ display:"flex", background:"#0f1117", borderRadius:8, padding:3, marginBottom:24 }}>
            {[["manager","Менеджер"],["admin","Админ"]].map(([k,l]) => (
              <button key={k} onClick={() => { setMode(k); setToken(""); setError(""); }} style={{ flex:1, background:mode===k?"linear-gradient(135deg,#6366f1,#818cf8)":"transparent", color:mode===k?"#fff":"#64748b", border:"none", padding:"8px", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:13, transition:"all .2s" }}>{l}</button>
            ))}
          </div>
          <label style={{ display:"block", fontSize:11, color:"#64748b", marginBottom:8, fontWeight:700, textTransform:"uppercase" }}>{mode==="admin"?"Пароль":"Токен доступа"}</label>
          <input value={token} onChange={e=>setToken(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder={mode==="admin"?"Пароль":"Введи токен"} type={mode==="admin"?"password":"text"}
            style={{ width:"100%", background:"#0f1117", border:`1px solid ${error?"#ef4444":"#2d3148"}`, color:"#e2e8f0", padding:"12px 14px", borderRadius:8, fontSize:15, outline:"none", marginBottom:8, boxSizing:"border-box", textTransform:mode==="manager"?"uppercase":"none" }} />
          {error && <p style={{ color:"#f87171", fontSize:13, marginBottom:12 }}>{error}</p>}
          <button onClick={login} disabled={loading||!token} className={loading||!token?"":"btn-p"} style={{ width:"100%", background:loading||!token?"#3730a3":undefined, color:"#fff", border:"none", padding:"12px", borderRadius:8, cursor:loading||!token?"not-allowed":"pointer", fontWeight:700, fontSize:15, marginTop:8 }}>
            {loading?"Проверяем...":"Войти"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminPage({ onLogout }) {
  const [managers, setManagers] = useState([]); const [platforms, setPlatforms] = useState([]); const [players, setPlayers] = useState([]); const [redeposits, setRedeposits] = useState([]);
  const [geos, setGeos] = useState([]); const [userGeos, setUserGeos] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [tab, setTab] = useState("overview"); const [toast, setToast] = useState(null); const [newName, setNewName] = useState(""); const [newRole, setNewRole] = useState("manager");
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
        {[["overview","Сводка"],["managers","Менеджеры"],["platforms","Платформы"],["geos","Гео"],["history","История"],["leads","Лиды"]].map(([key,label])=>(
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
                    const ok=p.avgCheck>=p.target_avg_check,pct=p.cap?Math.min(100,Math.round((p.allCount/p.cap)*100)):0;
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
                        <td style={S.td}>{p.cap?<div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:40,background:"#0f1117",borderRadius:4,height:5,overflow:"hidden"}}><div className="progress-bar" style={{width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,#6366f1,#818cf8)"}}/></div><span style={{color:pct>=100?"#86efac":"#f59e0b",fontSize:12}}>{p.allCount}/{p.cap}</span></div>:"—"}</td>
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
                <thead><tr>{["Имя","Токен","Роль","Гео","Статус","Лидов","Действия"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
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
                            <td colSpan={7} style={{padding:"10px 18px",background:"#151824",borderBottom:"1px solid #2d3148"}}>
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

        {tab==="history"&&(
          <div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
              <h2 style={{color:"#fff",fontSize:18,margin:0}}>История действий</h2>
              <select value={selectedHistoryGeo||""} onChange={e=>{ setSelectedHistoryGeo(e.target.value||null); setSelectedManager(null); }} style={{background:"#1a1d27",border:"1px solid #2d3148",color:"#94a3b8",padding:"6px 10px",borderRadius:7,fontSize:12,outline:"none"}}>
                <option value="">Все гео</option>
                {geos.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select value={selectedManager||""} onChange={e=>setSelectedManager(e.target.value||null)} style={{background:"#1a1d27",border:"1px solid #2d3148",color:"#94a3b8",padding:"6px 10px",borderRadius:7,fontSize:12,outline:"none"}}>
                <option value="">Все менеджеры</option>
                {(()=>{
                  if(!selectedHistoryGeo) return managers;
                  // Берём менеджеров которые реально есть в истории этого гео
                  const geoManagerIds=new Set(userGeos.filter(ug=>ug.geo_id===selectedHistoryGeo).map(ug=>ug.manager_id));
                  // Плюс те кто есть в activityLog но может не быть в userGeos
                  activityLog.forEach(l=>{ if(l.manager_id) geoManagerIds.add(l.manager_id); });
                  return managers.filter(m=>geoManagerIds.has(m.id));
                })().map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div style={{border:"1px solid #2d3148",borderRadius:10,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Время","Менеджер","Действие","Лид","Детали"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filteredLog.map(log=>(
                    <tr key={log.id} className="row-hover">
                      <td style={{...S.td,color:"#64748b",fontSize:11,whiteSpace:"nowrap"}}>{new Date(log.created_at).toLocaleString("ru",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</td>
                      <td style={{...S.td,color:"#e2e8f0",fontWeight:500}}>{log.managers?.name||"—"}</td>
                      <td style={S.td}><span style={{background:"rgba(99,102,241,.15)",color:"#a5b4fc",padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:600}}>{actionLabels[log.action]||log.action}</span></td>
                      <td style={{...S.td,color:"#94a3b8",fontSize:12}}>{log.players?.name||"—"}</td>
                      <td style={{...S.td,color:"#64748b",fontSize:11}}>{log.details&&Object.keys(log.details).length>0?Object.entries(log.details).map(([k,v])=>`${k}: ${v}`).join(", "):"—"}</td>
                    </tr>
                  ))}
                  {filteredLog.length===0&&<tr><td colSpan={5} style={{padding:24,textAlign:"center",color:"#475569"}}>История пуста</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                    onReload={load} showToast={showToast} isPoland={isPoland}
                  />
                </div>
              ));
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  useEffect(()=>{
    const s=localStorage.getItem("arbi_v2");
    if(!s){ return; }
    const parsed=JSON.parse(s);
    if(parsed.role==="admin"){ setSession(parsed); return; }
    // Перечитываем актуальную роль из базы
    supabase.from("managers").select("*").eq("id",parsed.manager.id).single().then(({data})=>{
      if(data){ const updated={...parsed,manager:data}; localStorage.setItem("arbi_v2",JSON.stringify(updated)); setSession(updated); }
      else { localStorage.removeItem("arbi_v2"); }
    });
  },[]);
  const login=(s)=>{ localStorage.setItem("arbi_v2",JSON.stringify(s)); setSession(s); };
  const logout=()=>{ localStorage.removeItem("arbi_v2"); setSession(null); };
  if (!session) return <LoginPage onLogin={login}/>;
  if (session.role==="admin") return <AdminPage onLogout={logout}/>;
  return <ManagerPage manager={session.manager} onLogout={logout}/>;
}
