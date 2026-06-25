import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { THEME } from "../constants";

const T = THEME;

/* ─────────────────────────────────────────────
   SHARED DROPDOWN PORTAL
   Renders via React Portal directly into document.body
   so it's never clipped by overflow:hidden/auto parents
───────────────────────────────────────────── */
function Dropdown({ anchorRef, open, onClose, children, minWidth, innerRef }) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 260 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const update = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r) return;
      const spaceBelow = window.innerHeight - r.bottom - 12;
      const spaceAbove = r.top - 12;
      const CAP = Math.min(440, window.innerHeight * 0.6); // потолок высоты списка
      const openDown = spaceBelow >= spaceAbove;
      const maxH = Math.min(CAP, openDown ? spaceBelow : spaceAbove);
      const top = openDown ? r.bottom + 4 : Math.max(8, r.top - maxH - 4);
      setPos({ top, left: r.left, width: Math.max(r.width, minWidth || 0), maxHeight: maxH });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [open, anchorRef, minWidth]);

  if (!open) return null;

  return createPortal(
    <div
      ref={innerRef}
      style={{
        position: "fixed", zIndex: 99999,
        top: pos.top, left: pos.left,
        minWidth: pos.width, width: "max-content", maxWidth: "min(420px, 90vw)",
        maxHeight: pos.maxHeight, overflowY: "auto",
        background: "rgba(14,14,16,.97)",
        backdropFilter: "blur(24px) saturate(150%)",
        WebkitBackdropFilter: "blur(24px) saturate(150%)",
        border: "1px solid rgba(255,255,255,.1)",
        borderRadius: 8,
        boxShadow: "0 20px 56px rgba(0,0,0,.7)",
        overflow: "hidden",
        pointerEvents: "auto",
      }}
    >
      {children}
    </div>,
    document.body
  );
}

/* ─────────────────────────────────────────────
   SELECT
   Props: value, onChange, options, placeholder, style, disabled
   options: [{value, label}] or [{id, name}]
───────────────────────────────────────────── */
export function Select({ value, onChange, options=[], placeholder="—", style={}, disabled=false, minWidth }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const ddRef = useRef(null);

  // normalise options
  const opts = options.map(o => typeof o === "string" ? {value:o,label:o} : {value:o.value??o.id??"",label:o.label??o.name??""});
  const selected = opts.find(o => String(o.value) === String(value));

  // close on outside click — check BOTH the trigger ref and the portal dropdown ref
  useEffect(() => {
    if (!open) return;
    const fn = (e) => {
      const inTrigger = ref.current && ref.current.contains(e.target);
      const inDropdown = ddRef.current && ddRef.current.contains(e.target);
      if (!inTrigger && !inDropdown) setOpen(false);
    };
    document.addEventListener("mousedown", fn, true);
    return () => document.removeEventListener("mousedown", fn, true);
  }, [open]);

  const base = {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
    background: "rgba(255,255,255,.04)", border: `1px solid rgba(255,255,255,.1)`,
    borderRadius: 8, padding: "7px 12px", cursor: disabled ? "not-allowed" : "pointer",
    color: selected ? T.text : T.sub, fontSize: 12, fontWeight: 500, minWidth: 0,
    outline: "none", userSelect: "none", transition: "border-color .15s",
    ...(open ? { borderColor: "rgba(155,79,212,.5)" } : {}),
    ...style,
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", minWidth: minWidth||0 }}>
      <div style={base} onClick={() => !disabled && setOpen(v => !v)}>
        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {selected?.label || placeholder}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink:0, transition:"transform .2s", transform: open?"rotate(180deg)":"none" }}>
          <path d="M2 4l4 4 4-4" stroke={T.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <Dropdown anchorRef={ref} open={open} onClose={()=>setOpen(false)} minWidth={minWidth} innerRef={ddRef}>
        {opts.map((o, i) => {
          const isSel = String(o.value) === String(value);
          return (
            <div key={i}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                padding: "10px 14px", fontSize: 13, cursor: "pointer",
                color: isSel ? "#fff" : "#c8c8d4",
                background: isSel ? T.grad : "transparent",
                fontWeight: isSel ? 600 : 400,
                whiteSpace: "nowrap",
                transition: "background .1s",
              }}
              onMouseEnter={e => { if(!isSel) e.currentTarget.style.background="rgba(255,255,255,.07)"; }}
              onMouseLeave={e => { if(!isSel) e.currentTarget.style.background="transparent"; }}>
              {o.label}
            </div>
          );
        })}
        {opts.length === 0 && <div style={{ padding:"10px 14px", color: T.muted, fontSize:12 }}>Нет вариантов</div>}
      </Dropdown>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DATE PICKER
   value: "YYYY-MM-DD" string
   onChange: (v: "YYYY-MM-DD") => void
───────────────────────────────────────────── */
const RU_MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const RU_DAYS   = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

function toLocal(str) {
  if (!str) return null;
  const [y,m,d] = str.split("-").map(Number);
  return new Date(y, m-1, d);
}
function toStr(d) {
  if (!d) return "";
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function fmtDisplay(str) {
  if (!str) return "";
  const [y,m,d] = str.split("-");
  return `${d}.${m}.${y}`;
}

export function DatePicker({ value, onChange, placeholder="Выбрать дату", style={}, disabled=false }) {
  const [open, setOpen] = useState(false);
  const ddRef = useRef(null);
  const [view, setView] = useState(() => {
    const d = value ? toLocal(value) : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e) => {
      const inTrigger = ref.current && ref.current.contains(e.target);
      const inDropdown = ddRef.current && ddRef.current.contains(e.target);
      if (!inTrigger && !inDropdown) setOpen(false);
    };
    document.addEventListener("mousedown", fn, true);
    return () => document.removeEventListener("mousedown", fn, true);
  }, [open]);

  // sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = toLocal(value);
      setView({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [value]);

  const selectDay = (d) => {
    const str = toStr(new Date(year, month, d));
    onChange(str);
    setOpen(false);
  };

  const prevMonth = () => setView(v => v.month === 0 ? {year:v.year-1,month:11} : {year:v.year,month:v.month-1});
  const nextMonth = () => setView(v => v.month === 11 ? {year:v.year+1,month:0} : {year:v.year,month:v.month+1});
  const goToday   = () => { const n=new Date(); setView({year:n.getFullYear(),month:n.getMonth()}); onChange(today); setOpen(false); };
  const { year, month } = view;
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const firstMon = (firstDay + 6) % 7; // shift so Mon=0
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const today = toStr(new Date());
  const cells = [];
  for (let i = 0; i < firstMon; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const trigger = {
    display:"flex", alignItems:"center", justifyContent:"space-between", gap:6,
    background:"rgba(255,255,255,.04)", border:`1px solid rgba(255,255,255,.1)`,
    borderRadius:8, padding:"7px 12px", cursor:disabled?"not-allowed":"pointer",
    color:value?T.text:T.sub, fontSize:12, fontWeight:500,
    outline:"none", userSelect:"none", transition:"border-color .15s",
    ...(open?{borderColor:"rgba(155,79,212,.5)"}:{}),
    ...style,
  };

  return (
    <div ref={ref} style={{ position:"relative", display:"inline-block" }}>
      <div style={trigger} onClick={()=>!disabled&&setOpen(v=>!v)}>
        <span>{value ? fmtDisplay(value) : placeholder}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke={T.muted} strokeWidth="1.5"/>
          <path d="M16 2v4M8 2v4M3 10h18" stroke={T.muted} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      <Dropdown anchorRef={ref} open={open} onClose={()=>setOpen(false)} minWidth={280} innerRef={ddRef}>
        <div style={{ padding:"14px 14px 10px", minWidth:280 }}>
          {/* Month/year nav */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <button onClick={prevMonth} style={{ background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",color:"#F0F0F2",cursor:"pointer",width:28,height:28,borderRadius:7,fontSize:15,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center" }}>←</button>
            <span style={{ color:T.text, fontSize:13, fontWeight:700 }}>{RU_MONTHS[month]} {year}</span>
            <button onClick={nextMonth} style={{ background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",color:"#F0F0F2",cursor:"pointer",width:28,height:28,borderRadius:7,fontSize:15,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center" }}>→</button>
          </div>
          {/* Day headers */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
            {RU_DAYS.map(d=>(
              <div key={d} style={{ textAlign:"center",fontSize:10,color:T.muted,fontWeight:600,padding:"2px 0" }}>{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
            {cells.map((d,i)=>{
              if (!d) return <div key={i}/>;
              const str = toStr(new Date(year,month,d));
              const isSel = str===value;
              const isToday = str===today;
              return (
                <div key={i} onClick={()=>selectDay(d)}
                  style={{
                    textAlign:"center", padding:"6px 2px", borderRadius:6, fontSize:12, cursor:"pointer",
                    fontWeight: isSel||isToday ? 700 : 400,
                    color: isSel?"#fff" : isToday?"#A78BFA" : T.text,
                    background: isSel ? T.grad : isToday?"rgba(167,139,250,.12)":"transparent",
                    transition:"background .1s",
                  }}
                  onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.background="rgba(255,255,255,.06)"; }}
                  onMouseLeave={e=>{ if(!isSel) e.currentTarget.style.background=isToday?"rgba(167,139,250,.12)":"transparent"; }}>
                  {d}
                </div>
              );
            })}
          </div>
          {/* Footer */}
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, paddingTop:8, borderTop:"1px solid rgba(255,255,255,.06)" }}>
            {value && <button onClick={()=>{onChange("");setOpen(false);}} style={{ background:"none",border:"none",color:"#8B8B9A",fontSize:12,fontWeight:500,cursor:"pointer" }}>Очистить</button>}
            <button onClick={goToday} style={{ background:"none",border:"none",color:"#A78BFA",fontSize:12,fontWeight:600,cursor:"pointer",marginLeft:"auto" }}>Сегодня</button>
          </div>
        </div>
      </Dropdown>
    </div>
  );
}
