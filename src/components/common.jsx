import { useState, useEffect, useRef } from "react";
import { STATUSES, LEAD_COLORS } from "../constants";

export function getStatusStyle(status, dark) {
  const dm = { "Да":{bg:"linear-gradient(135deg,#14532d,#166534)",color:"#86efac"}, "Нет":{bg:"#1e2235",color:"#64748b",border:"1px solid #2d3148"}, "Кинул":{bg:"linear-gradient(135deg,#7f1d1d,#991b1b)",color:"#fca5a5"}, "Отправил":{bg:"linear-gradient(135deg,#1e3a5f,#1e40af)",color:"#93c5fd"}, "Вернул":{bg:"linear-gradient(135deg,#422006,#78350f)",color:"#fbbf24"} };
  const lm = { "Да":{bg:"linear-gradient(135deg,#bbf7d0,#86efac)",color:"#14532d"}, "Нет":{bg:"#e2e8f0",color:"#64748b",border:"1px solid #cbd5e1"}, "Кинул":{bg:"linear-gradient(135deg,#fecaca,#f87171)",color:"#7f1d1d"}, "Отправил":{bg:"linear-gradient(135deg,#bfdbfe,#93c5fd)",color:"#1e3a5f"}, "Вернул":{bg:"linear-gradient(135deg,#fde68a,#fbbf24)",color:"#78350f"} };
  return (dark ? dm : lm)[status] || (dark ? dm : lm)["Нет"];
}

export function StatusBadge({ status, onClick, dark }) {
  const s = getStatusStyle(status, dark);
  return <span onClick={onClick} className={onClick?"sb":""} style={{ background:s.bg, color:s.color, border:s.border||"none", padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700, cursor:onClick?"pointer":"default", userSelect:"none", display:"inline-block" }}>{status}</span>;
}

export function StatusPopup({ x, y, onSelect, onClose, dark }) {
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

export function ColorPopup({ x, y, onSelect, onClose, dark }) {
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

export function Toast({ msg, type, onUndo }) {
  if (!msg) return null;
  return (
    <div className="fade-in" style={{ position:"fixed",bottom:24,right:24,zIndex:9999,background:type==="error"?"linear-gradient(135deg,#ef4444,#dc2626)":"linear-gradient(135deg,#1e2235,#1e3a5f)",border:`1px solid ${type==="error"?"#ef4444":"#6366f1"}`,color:"#fff",padding:"12px 20px",borderRadius:12,fontWeight:600,fontSize:14,boxShadow:"0 8px 32px rgba(0,0,0,.5)",display:"flex",alignItems:"center",gap:14 }}>
      <span>{msg}</span>
      {onUndo&&<button onClick={onUndo} className="btn-p" style={{ padding:"4px 12px",fontSize:13 }}>Отменить</button>}
    </div>
  );
}

// ── Players Table (shared between manager/team_lead views) ───────────────────
