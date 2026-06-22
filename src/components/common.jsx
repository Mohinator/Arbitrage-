import { useState, useEffect, useRef } from "react";
import { STATUSES, LEAD_COLORS } from "../constants";

export function getStatusStyle(status, dark) {
  // v3 — плоские пиллы: мягкий фон + цвет. Без синего, без градиентов. Тёмная тема единственная.
  const m = {
    "Да":      { bg:"rgba(61,214,140,.13)",  color:"#3DD68C" },
    "Нет":     { bg:"rgba(255,255,255,.06)", color:"#8B8B9A" },
    "Кинул":   { bg:"rgba(242,112,110,.13)", color:"#F2706E" },
    "Отправил":{ bg:"rgba(176,123,245,.13)", color:"#B07BF5" },
    "Вернул":  { bg:"rgba(244,183,64,.13)",  color:"#F4B740" },
  };
  return m[status] || m["Нет"];
}

export function StatusBadge({ status, onClick, dark }) {
  const s = getStatusStyle(status, dark);
  return <span onClick={onClick} className={onClick?"sb":""} style={{ background:s.bg, color:s.color, border:s.border||"none", padding:"3px 10px", borderRadius:8, fontSize:11.5, fontWeight:600, fontFamily:"'Gilroy','Inter',sans-serif", cursor:onClick?"pointer":"default", userSelect:"none", display:"inline-block" }}>{status}</span>;
}

export function StatusPopup({ x, y, onSelect, onClose, dark }) {
  const ref = useRef();
  useEffect(() => { const h=e=>{ if(ref.current&&!ref.current.contains(e.target)) onClose(); }; document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h); }, []);
  const T = {bg:"#101010",border:"rgba(255,255,255,.08)"};
  const popupH = STATUSES.length * 36 + 12;
  const openUp = y + popupH > window.innerHeight - 20;
  return (
    <div ref={ref} className="fade-in" style={{ position:"fixed",left:x,top:openUp?y-popupH:y,background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,padding:6,zIndex:5000,boxShadow:"0 8px 32px rgba(0,0,0,.4)",minWidth:130 }}>
      {STATUSES.map(st=><div key={st} onClick={()=>onSelect(st)} style={{ padding:"6px 10px",borderRadius:6,cursor:"pointer",transition:"background .15s" }} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><StatusBadge status={st} dark={dark}/></div>)}
    </div>
  );
}

export function ColorPopup({ x, y, onSelect, onClose, dark }) {
  const ref = useRef();
  useEffect(() => { const h=e=>{ if(ref.current&&!ref.current.contains(e.target)) onClose(); }; document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h); }, []);
  const T = {bg:"#101010",border:"rgba(255,255,255,.08)",text:"#F0F0F2"};
  const popupH = LEAD_COLORS.length * 34 + 16;
  const openUp = y + popupH > window.innerHeight - 20;
  return (
    <div ref={ref} className="fade-in" style={{ position:"fixed",left:x,top:openUp?y-popupH:y,background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,padding:8,zIndex:5000,boxShadow:"0 8px 32px rgba(0,0,0,.4)",minWidth:140 }}>
      {LEAD_COLORS.map(c=><div key={c.key} onClick={()=>onSelect(c.key)} style={{ padding:"6px 10px",borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"background .15s" }} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><div style={{ width:10,height:10,borderRadius:"50%",background:c.dot,flexShrink:0 }}/><span style={{ fontSize:12,color:T.text }}>{c.label}</span></div>)}
    </div>
  );
}

export function Toast({ msg, type, onUndo }) {
  if (!msg) return null;
  return (
    <div className="fade-in" style={{ position:"fixed",bottom:24,right:24,zIndex:9999,background:type==="error"?"rgba(242,112,110,.95)":"#1A1A1A",border:`1px solid ${type==="error"?"#F2706E":"rgba(255,255,255,.1)"}`,color:"#fff",padding:"12px 20px",borderRadius:12,fontWeight:600,fontSize:14,boxShadow:"0 8px 32px rgba(0,0,0,.5)",display:"flex",alignItems:"center",gap:14 }}>
      <span>{msg}</span>
      {onUndo&&<button onClick={onUndo} className="btn-p" style={{ padding:"4px 12px",fontSize:13 }}>Отменить</button>}
    </div>
  );
}

// ── Players Table (shared between manager/team_lead views) ───────────────────
