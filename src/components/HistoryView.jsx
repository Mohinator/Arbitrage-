import { Select, DatePicker } from "./ui";
import { useState } from "react";

export function HistoryView({ logs, managers, geos, userGeos, dark, onLeadClick }) {
  const [fGeo, setFGeo] = useState("");
  const [fMgr, setFMgr] = useState("");
  const [fAction, setFAction] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fSearch, setFSearch] = useState("");
  const actionLabels={"lead_added":"Добавил лида","rd_added":"Внёс РД","rd_planned":"Запланировал РД","rd_marked_done":"Отметил РД","rd_reset":"Сбросил РД","status_changed":"Изменил статус","automation_applied":"Автоматизация"};
  const T = dark
    ? { border:"rgba(255,255,255,.08)",text:"#F0F0F2",sub:"#8B8B9A",muted:"#4A4A5A",thBg:"transparent",rowB:"rgba(255,255,255,.05)",inputBg:"rgba(255,255,255,.03)" }
    : { border:"#dde1ea",text:"#1e293b",sub:"#64748b",muted:"#94a3b8",thBg:"#e8eaf0",rowB:"#e2e6ef",inputBg:"#e8eaf0" };
  const sel={ background:T.inputBg,border:`1px solid ${T.border}`,color:T.sub,padding:"6px 10px",borderRadius:7,fontSize:12,outline:"none" };
  const safeLogs=(logs||[]).filter(l=>l&&l.created_at);
  const filtered=safeLogs.filter(l=>{
    if(fGeo){ const ids=new Set(userGeos.filter(ug=>ug.geo_id===fGeo).map(ug=>ug.manager_id)); if(!ids.has(l.manager_id)) return false; }
    if(fMgr && l.manager_id!==fMgr) return false;
    if(fAction && l.action!==fAction) return false;
    if(fFrom && new Date(l.created_at) < new Date(fFrom+"T00:00:00")) return false;
    if(fTo && new Date(l.created_at) > new Date(fTo+"T23:59:59")) return false;
    if(fSearch){ const q=fSearch.toLowerCase(); if(!`${l.managers?.name||""} ${l.players?.name||""}`.toLowerCase().includes(q)) return false; }
    return true;
  });
  const actions=[...new Set(safeLogs.map(l=>l.action))];
  const mgrOptions=(fGeo? managers.filter(m=>userGeos.some(ug=>ug.geo_id===fGeo&&ug.manager_id===m.id)) : managers);
  const TH={ padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:`1px solid ${T.border}`,background:T.thBg,whiteSpace:"nowrap" };
  const TD={ padding:"11px 12px",borderBottom:`1px solid ${T.rowB}` };
  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:18,flexWrap:"wrap" }}>
        <h2 style={{ color:T.text,fontSize:18,margin:0 }}>История действий</h2>
        {geos&&geos.length>1&&(
          <Select value={fGeo} onChange={v=>{ setFGeo(v); setFMgr(""); }} style={sel} options={[{value:"",label:"Все гео"},...(geos||[]).map(g=>({value:g.id,label:g.name}))]}/>
        )}
        <Select value={fMgr} onChange={v=>setFMgr(v)} style={sel} options={[{value:"",label:"Все менеджеры"},...(managers||[]).map(m=>({value:m.id,label:m.name}))]}/>
        <Select value={fAction} onChange={v=>setFAction(v)} style={sel} options={[{value:"",label:"Все действия"},{value:"created",label:"Создан"},{value:"status_changed",label:"Статус"},{value:"rd_added",label:"РД добавлен"},{value:"rd_moved",label:"РД перенесён"},{value:"deleted",label:"Удалён"}]}/>
        <DatePicker value={fFrom} onChange={v=>setFFrom(v)} style={sel}/>
        <DatePicker value={fTo} onChange={v=>setFTo(v)} style={sel}/>
        <input type="text" placeholder="Поиск: лид / менеджер" value={fSearch} onChange={e=>setFSearch(e.target.value)} style={{...sel,minWidth:180}}/>
        {(fGeo||fMgr||fAction||fFrom||fTo||fSearch)&&<button onClick={()=>{ setFGeo("");setFMgr("");setFAction("");setFFrom("");setFTo("");setFSearch(""); }} style={{...sel,cursor:"pointer",color:T.bad||"#F2706E"}}>Сбросить</button>}
        <span style={{ color:T.muted,fontSize:12,marginLeft:"auto" }}>{filtered.length}</span>
      </div>
      <div style={{ border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden",overflowX:"auto" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead><tr>{["Время","Менеджер","Действие","Лид","Детали"].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(log=>(
              <tr key={log.id} className="row-hover">
                <td style={{...TD,color:T.muted,fontSize:11,whiteSpace:"nowrap"}}>{new Date(log.created_at).toLocaleString("ru",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</td>
                <td style={{...TD,color:T.text,fontWeight:500}}>{log.managers?.name||"—"}</td>
                <td style={TD}><span style={{ background:"rgba(167,139,250,.13)",color:"#A78BFA",padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:600 }}>{actionLabels[log.action]||log.action}</span></td>
                <td style={{...TD,fontSize:12}}>{log.player_id&&onLeadClick? <span onClick={()=>onLeadClick(log.player_id)} className="row-hover" style={{ color:"#A78BFA",cursor:"pointer",textDecoration:"underline",textUnderlineOffset:2 }}>{log.players?.name||"—"}</span> : <span style={{ color:T.sub }}>{log.players?.name||"—"}</span>}</td>
                <td style={{...TD,color:T.muted,fontSize:11}}>{log.details&&Object.keys(log.details).length>0?Object.entries(log.details).map(([k,v])=>`${k}: ${v}`).join(", "):"—"}</td>
              </tr>
            ))}
            {filtered.length===0&&<tr><td colSpan={5} style={{padding:24,textAlign:"center",color:T.muted}}>История пуста</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

