import { Select, DatePicker } from "./ui";
import { useState } from "react";

export function ReportView({ players, redeposits, platforms, managers, geos, userGeos, dark }) {
  const todayS=new Date().toISOString().slice(0,10);
  const [fDate, setFDate] = useState(todayS);
  const [period, setPeriod] = useState("day"); // "day" | "month" | "all"
  const [fGeo, setFGeo] = useState("");
  const [fMgr, setFMgr] = useState("");
  const [expanded, setExpanded] = useState(()=>new Set());
  const [viewMode, setViewMode] = useState("mgr"); // "mgr" | "plat"
  const toggleExpand=(id)=>setExpanded(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const T = dark
    ? { border:"rgba(255,255,255,.08)",text:"#F0F0F2",sub:"#8B8B9A",muted:"#4A4A5A",thBg:"transparent",rowB:"rgba(255,255,255,.05)",inputBg:"rgba(255,255,255,.03)",card:"#101010" }
    : { border:"#dde1ea",text:"#1e293b",sub:"#64748b",muted:"#94a3b8",thBg:"#e8eaf0",rowB:"#e2e6ef",inputBg:"#e8eaf0",card:"#f5f6fa" };
  const sel={ background:T.inputBg,border:`1px solid ${T.border}`,color:T.sub,padding:"6px 10px",borderRadius:7,fontSize:12,outline:"none" };
  const platGeo=(pid)=>platforms.find(p=>p.id===pid)?.geo_id;
  const pGeo=(p)=>platGeo(p.platform_id)||userGeos.find(u=>u.manager_id===p.manager_id)?.geo_id;
  const passGeo=(p)=> !fGeo || pGeo(p)===fGeo;
  const passMgr=(p)=> !fMgr || p.manager_id===fMgr;
  const playerById=(id)=>players.find(p=>p.id===id);
  const inPeriod=(d)=>{ if(!d) return false; if(period==="all") return true; if(period==="month") return d.slice(0,7)===fDate.slice(0,7); return d===fDate; };
  const dayPlayers=(players||[]).filter(p=>p&&inPeriod(p.date)&&passGeo(p)&&passMgr(p));
  const dayRds=(redeposits||[]).filter(r=>{ const p=playerById(r.player_id); return p&&inPeriod(r.date)&&passGeo(p)&&passMgr(p); });
  const mgrIds=[...new Set([...dayPlayers.map(p=>p.manager_id), ...dayRds.map(r=>playerById(r.player_id)?.manager_id)].filter(Boolean))];
  const rows=mgrIds.map(mid=>{
    const mp=dayPlayers.filter(p=>p.manager_id===mid);
    return { id:mid, name:managers.find(x=>x.id===mid)?.name||"—",
      deposits:mp.filter(p=>p.status==="Да").length,
      redeps:dayRds.filter(r=>playerById(r.player_id)?.manager_id===mid).length,
      neotbiv:mp.filter(p=>p.status==="Нет").length,
      kidki:mp.filter(p=>p.status==="Кинул").length };
  }).sort((a,b)=>b.deposits-a.deposits);
  const totals=rows.reduce((a,r)=>({deposits:a.deposits+r.deposits,redeps:a.redeps+r.redeps,neotbiv:a.neotbiv+r.neotbiv,kidki:a.kidki+r.kidki}),{deposits:0,redeps:0,neotbiv:0,kidki:0});
  const mgrOptions=(fGeo? managers.filter(m=>userGeos.some(ug=>ug.geo_id===fGeo&&ug.manager_id===m.id)) : managers);
  const cards=[["Депозиты",totals.deposits,"#A78BFA"],["Редепозиты",totals.redeps,"#3DD68C"],["Неотбивы (Нет)",totals.neotbiv,"#8B8B9A"],["Кидки",totals.kidki,"#fca5a5"]];
  const metric=(label,val,color)=>(
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",minWidth:56 }}>
      <span style={{ fontSize:18,fontWeight:800,color }}>{val}</span>
      <span style={{ fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em" }}>{label}</span>
    </div>
  );
  const platformBreakdown=(mid)=>{
    const mp=dayPlayers.filter(p=>p.manager_id===mid);
    const mr=dayRds.filter(r=>playerById(r.player_id)?.manager_id===mid);
    const platIds=[...new Set([...mp.map(p=>p.platform_id||"_none"), ...mr.map(r=>playerById(r.player_id)?.platform_id||"_none")])];
    return platIds.map(pid=>{
      const pp=mp.filter(p=>(p.platform_id||"_none")===pid);
      return { id:pid, name:pid==="_none"?"Без платформы":(platforms.find(pl=>pl.id===pid)?.name||"—"),
        deposits:pp.filter(p=>p.status==="Да").length,
        redeps:mr.filter(r=>(playerById(r.player_id)?.platform_id||"_none")===pid).length,
        neotbiv:pp.filter(p=>p.status==="Нет").length,
        kidki:pp.filter(p=>p.status==="Кинул").length };
    }).filter(r=>r.deposits||r.redeps||r.neotbiv||r.kidki).sort((a,b)=>b.deposits-a.deposits);
  };
  // ── По платформам (сводно по всем менеджерам) ──
  const platRows=(()=>{
    const platIds=[...new Set([...dayPlayers.map(p=>p.platform_id||"_none"), ...dayRds.map(r=>playerById(r.player_id)?.platform_id||"_none")])];
    return platIds.map(pid=>{
      const pp=dayPlayers.filter(p=>(p.platform_id||"_none")===pid);
      return { id:pid, name:pid==="_none"?"Без платформы":(platforms.find(pl=>pl.id===pid)?.name||"—"),
        deposits:pp.filter(p=>p.status==="Да").length,
        redeps:dayRds.filter(r=>(playerById(r.player_id)?.platform_id||"_none")===pid).length,
        neotbiv:pp.filter(p=>p.status==="Нет").length,
        kidki:pp.filter(p=>p.status==="Кинул").length };
    }).filter(r=>r.deposits||r.redeps||r.neotbiv||r.kidki).sort((a,b)=>b.deposits-a.deposits);
  })();
  const mgrBreakdown=(pid)=>{
    const pp=dayPlayers.filter(p=>(p.platform_id||"_none")===pid);
    const pr=dayRds.filter(r=>(playerById(r.player_id)?.platform_id||"_none")===pid);
    const mids=[...new Set([...pp.map(p=>p.manager_id), ...pr.map(r=>playerById(r.player_id)?.manager_id)].filter(Boolean))];
    return mids.map(mid=>{
      const mp=pp.filter(p=>p.manager_id===mid);
      return { id:mid, name:managers.find(x=>x.id===mid)?.name||"—",
        deposits:mp.filter(p=>p.status==="Да").length,
        redeps:pr.filter(r=>playerById(r.player_id)?.manager_id===mid).length,
        neotbiv:mp.filter(p=>p.status==="Нет").length,
        kidki:mp.filter(p=>p.status==="Кинул").length };
    }).filter(r=>r.deposits||r.redeps||r.neotbiv||r.kidki).sort((a,b)=>b.deposits-a.deposits);
  };
  const activeRows = viewMode==="plat" ? platRows : rows;
  const breakdownFor = viewMode==="plat" ? mgrBreakdown : platformBreakdown;
  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:18,flexWrap:"wrap" }}>
        <h2 style={{ color:T.text,fontSize:18,margin:0 }}>Отчёт</h2>
        {geos&&geos.length>1&&(
          <Select value={fGeo} onChange={v=>{ setFGeo(v); setFMgr(""); }} style={sel} options={[{value:"",label:"Все гео"},...(geos||[]).map(g=>({value:g.id,label:g.name}))]}/>
        )}
        <Select value={fMgr} onChange={v=>setFMgr(v)} style={sel} options={[{value:"",label:"Все менеджеры"},...(managers||[]).map(m=>({value:m.id,label:m.name}))]}/>
        <div style={{ display:"flex",border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden" }}>
          {[["day","День"],["month","Месяц"],["all","Всё время"]].map(([k,l])=>(
            <button key={k} onClick={()=>{ setPeriod(k); setExpanded(new Set()); }} style={{ background:period===k?"linear-gradient(135deg,#F4924A 0%,#C9517A 50%,#9B5FD0 100%)":"transparent",color:period===k?"#fff":T.sub,border:"none",padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Gilroy','Inter',system-ui,sans-serif" }}>{l}</button>
          ))}
        </div>
        {period!=="all"&&<input type={period==="month"?"month":"date"} value={period==="month"?fDate.slice(0,7):fDate} onChange={e=>setFDate(period==="month"?e.target.value+"-01":e.target.value)} style={sel}/>}
        <div style={{ display:"flex",border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden",marginLeft:"auto" }}>
          {[["mgr","Менеджеры"],["plat","Платформы"]].map(([k,l])=>(
            <button key={k} onClick={()=>{ setViewMode(k); setExpanded(new Set()); }} style={{ background:viewMode===k?"linear-gradient(135deg,#F4924A 0%,#C9517A 50%,#9B5FD0 100%)":"transparent",color:viewMode===k?"#fff":T.sub,border:"none",padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Gilroy','Inter',system-ui,sans-serif" }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ display:"flex",gap:12,flexWrap:"wrap",marginBottom:18 }}>
        {cards.map(([l,v,c])=>(
          <div key={l} style={{ flex:"1 1 150px",minWidth:130,background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 16px" }}>
            <div style={{ fontSize:11,color:T.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6 }}>{l}</div>
            <div style={{ fontSize:26,fontWeight:800,color:c }}>{v}</div>
          </div>
        ))}
      </div>
      <h3 style={{ color:T.sub,fontSize:13,margin:"0 0 10px" }}>{viewMode==="plat"?"Платформы":"Менеджеры"} {period==="all"?"за всё время":period==="month"?("за "+["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"][Number(fDate.slice(5,7))-1]+" "+fDate.slice(0,4)):("за "+(([y,m,d])=>`${d}.${m}.${y}`)(fDate.split("-")))}</h3>
      <div style={{ border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden" }}>
        {activeRows.length===0&&<div style={{ padding:24,textAlign:"center",color:T.muted,fontSize:13 }}>{period==="all"?"Нет данных":period==="month"?"В этом месяце никто не работал":"В этот день никто не работал"}</div>}
        {activeRows.map((r,i)=>{
          const open=expanded.has(r.id);
          const breakdown=open?breakdownFor(r.id):[];
          return (
            <div key={r.id} style={{ borderBottom:i<activeRows.length-1?`1px solid ${T.rowB}`:"none" }}>
              <div className="row-hover" onClick={()=>toggleExpand(r.id)} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,padding:"14px 18px",flexWrap:"wrap",cursor:"pointer" }}>
                <span style={{ color:T.text,fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:8 }}>
                  <span style={{ color:T.muted,fontSize:11,transition:"transform .2s",display:"inline-block",transform:open?"rotate(90deg)":"none" }}>▶</span>
                  {r.name}
                </span>
                <div style={{ display:"flex",gap:18,alignItems:"center" }}>
                  {metric("Депозиты",r.deposits,"#A78BFA")}
                  {metric("Редеп",r.redeps,"#6ee7b7")}
                  {metric("Нет",r.neotbiv,T.sub)}
                  {metric("Кинул",r.kidki,"#F2706E")}
                </div>
              </div>
              {open&&(
                <div style={{ background:T.card,padding:"4px 18px 12px 38px" }}>
                  {breakdown.length===0&&<div style={{ color:T.muted,fontSize:12,padding:"8px 0" }}>Нет разбивки</div>}
                  {breakdown.map(b=>(
                    <div key={b.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,padding:"8px 0",borderBottom:`1px solid ${T.rowB}`,flexWrap:"wrap" }}>
                      <span style={{ color:T.sub,fontSize:13,fontWeight:600 }}>{b.name}</span>
                      <div style={{ display:"flex",gap:18,alignItems:"center",fontSize:13 }}>
                        <span style={{ minWidth:56,textAlign:"center",color:"#A78BFA",fontWeight:700 }}>{b.deposits}</span>
                        <span style={{ minWidth:56,textAlign:"center",color:"#6ee7b7",fontWeight:700 }}>{b.redeps}</span>
                        <span style={{ minWidth:56,textAlign:"center",color:T.sub }}>{b.neotbiv}</span>
                        <span style={{ minWidth:56,textAlign:"center",color:"#F2706E" }}>{b.kidki}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

