import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { STATUSES, LEAD_COLORS, THEME } from "../constants";
import { getStatusStyle, StatusBadge, StatusPopup, ColorPopup } from "./common";

export function PlayersTable({ players, redeposits, plannedRds, platforms, manager, dark, readonly, onReload, showToast, excludedIds: _excludedIds, setExcludedIds: _setExcludedIds, isPoland=true, highlightId=null }) {
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
  const [rdShow, setRdShow] = useState(false);
  const rdInputRef = useRef();
  const rdInputPopupRef = useRef(null);
  const [rdDateEdit, setRdDateEdit] = useState(null); // {playerId, rdNumber}
  const [commentEdit, setCommentEdit] = useState(null);
  const [commentVal, setCommentVal] = useState("");
  const [hiddenMonths, setHiddenMonths] = useState(new Set());
  const [localPlayers, setLocalPlayers] = useState(players);
  const [dragIdx, setDragIdx] = useState(null);
  const [dateSortDir, setDateSortDir] = useState(null);
  const sortByDate = async () => {
    if (readonly) return;
    const dir = dateSortDir==="asc" ? "desc" : "asc";
    const sorted = [...localPlayers].filter(p=>p&&p.id).sort((a,b)=>{
      const da=a.date||"", db=b.date||"";
      if (da===db) return 0;
      return dir==="asc" ? (da<db?-1:1) : (da<db?1:-1);
    });
    setLocalPlayers(sorted); setDateSortDir(dir);
    await Promise.all(sorted.map((p,i)=>supabase.from("players").update({sort_order:i}).eq("id",p.id)));
    showToast(dir==="asc"?"Отсортировано: старые сверху":"Отсортировано: новые сверху");
    onReload && onReload();
  };

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

  const doSaveRd = async () => {
    const popup=rdInputPopupRef.current;
    const val=rdInputRef.current?.querySelector('input[type="text"]')?.value||rdInputVal;
    const dateVal=rdInputRef.current?.querySelector('input[type="date"]')?.value||rdInputDate;
    if(!popup||readonly) return;
    const amount=parseFloat(val);
    if(!amount||amount<=0) return;
    const {playerId,rdNumber}=popup;
    const rdDate=dateVal||today;
    await supabase.from("planned_redeposits").delete().eq("player_id",playerId).eq("rd_number",rdNumber);
    await supabase.from("planned_redeposits").insert({player_id:playerId,rd_number:rdNumber,amount,date:rdDate});
    await logAction("rd_planned",playerId,{rd_number:rdNumber,amount,date:rdDate});
    showToast("РД запланирован"); onReload();
  };
  const closeRdPopup = (save) => {
    if(save) doSaveRd();
    setRdShow(false);
    const closing=rdInputPopupRef.current;
    setTimeout(()=>{ if(rdInputPopupRef.current===closing){ setRdInputPopup(null); rdInputPopupRef.current=null; setRdInputVal(""); setRdInputDate(""); } }, 110);
  };

  const revertRdToPlanned = async (playerId, rdNumber, amount, date) => {
    if(readonly) return;
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

  const savePlannedEdit = async () => {
    if (!showEditRd||!showEditRd.amount||readonly) return;
    await supabase.from("planned_redeposits").update({ amount:Number(showEditRd.amount), date:showEditRd.date }).eq("player_id",showEditRd.playerId).eq("rd_number",showEditRd.rdNumber);
    setShowEditRd(null); showToast("План обновлён"); onReload();
  };

  const resetPlanned = async (playerId, rdNumber) => {
    if (readonly) return;
    await supabase.from("planned_redeposits").delete().eq("player_id",playerId).eq("rd_number",rdNumber);
    setShowEditRd(null); showToast("Плановый РД удалён"); onReload();
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
    if(!rdInputPopup){ setRdShow(false); return; }
    const id=requestAnimationFrame(()=>setRdShow(true));
    const h=(e)=>{ if(rdInputRef.current&&!rdInputRef.current.contains(e.target)) closeRdPopup(true); };
    document.addEventListener("mousedown",h);
    return ()=>{ cancelAnimationFrame(id); document.removeEventListener("mousedown",h); };
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

  const T = { border:"rgba(255,255,255,.08)",text:"#F0F0F2",muted:"#4A4A5A",sub:"#8B8B9A",inputBg:"rgba(255,255,255,.03)",thBg:"transparent",rowBorder:"rgba(255,255,255,.05)",rdPlan:"#4A4A5A",rdFact:"#F0F0F2",monthHdr:"transparent",surface:"#101010" };
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
        const Tb={bg:"#101010",border:"rgba(255,255,255,.08)",text:"#F0F0F2",muted:"#4A4A5A"};
        return(
          <div ref={rdInputRef} style={{ position:"fixed",left:Math.min(rdInputPopup.x-10,window.innerWidth-160),top:openUp?rdInputPopup.y-90:rdInputPopup.y+8,background:Tb.bg,border:`1px solid ${Tb.border}`,borderRadius:8,padding:"8px 10px",zIndex:5000,boxShadow:"0 4px 20px rgba(0,0,0,.5)",width:150,opacity:rdShow?1:0,transform:rdShow?"scale(1)":"scale(.96)",transformOrigin:openUp?"bottom left":"top left",transition:"opacity .09s ease,transform .09s ease" }}
            onMouseDown={e=>e.stopPropagation()}>
            <input autoFocus type="text" inputMode="numeric" placeholder="Сумма €" value={rdInputVal} onChange={e=>setRdInputVal(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") closeRdPopup(true); if(e.key==="Escape") closeRdPopup(false); }}
              style={{ background:"transparent",border:"none",borderBottom:`1px solid ${Tb.border}`,color:Tb.text,padding:"2px 0",fontSize:14,outline:"none",width:"100%",marginBottom:6,fontWeight:600 }}/>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <span style={{ fontSize:10,color:Tb.muted }}></span>
              <input type="date" value={rdInputDate} onChange={e=>setRdInputDate(e.target.value)}
                style={{ background:"transparent",border:"none",color:Tb.muted,fontSize:11,outline:"none",flex:1,cursor:"pointer" }}/>
            </div>
          </div>
        );
      })()}
      {platformPopup && (()=>{
        const curPl=localPlayers.find(x=>x.id===platformPopup.playerId);
        const curPlat=platforms.find(p=>p.id===curPl?.platform_id);
        const geoId=curPlat?.geo_id;
        const platList=platforms.filter(p=>(!geoId||p.geo_id===geoId)&&!p.is_hidden);
        const popupH=platList.length*32+16;
        const openUp=platformPopup.y+popupH>window.innerHeight-20;
        const Tb={bg:"#101010",border:"rgba(255,255,255,.08)",text:"#F0F0F2",muted:"#4A4A5A"};
        return(
          <div className="fade-in" style={{ position:"fixed",left:platformPopup.x,top:openUp?platformPopup.y-popupH:platformPopup.y,background:Tb.bg,border:`1px solid ${Tb.border}`,borderRadius:10,padding:6,zIndex:5000,boxShadow:"0 8px 32px rgba(0,0,0,.4)",minWidth:180,maxHeight:280,overflowY:"auto" }}
            onMouseDown={e=>e.stopPropagation()}>
            <div style={{ fontSize:10,color:Tb.muted,padding:"4px 10px 6px",fontWeight:700,textTransform:"uppercase" }}>Сменить платформу</div>
            {platList.map(p=><div key={p.id} onClick={()=>updatePlatform(platformPopup.playerId,p.id)} style={{ padding:"6px 10px",borderRadius:6,cursor:"pointer",fontSize:12,color:Tb.text,transition:"background .15s" }} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{p.name}</div>)}
          </div>
        );
      })()}

      {showEditRd && !readonly && (
        <div style={{ position:"fixed",inset:0,background:"transparent",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }} onClick={e=>e.target===e.currentTarget&&setShowEditRd(null)}>
          <div className="slide-in" style={{ background:"rgba(16,16,18,.25)",backdropFilter:"blur(24px) saturate(150%)",WebkitBackdropFilter:"blur(24px) saturate(150%)",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,padding:24,width:"100%",maxWidth:340,boxShadow:"0 24px 64px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06)" }}>
            <h3 style={{ color:T.text,marginBottom:6,fontSize:15,fontWeight:700 }}>{showEditRd.isPlanned?"Подтверждение РД":"РД"}{showEditRd.rdNumber}</h3>
            <p style={{ color:T.muted,fontSize:13,marginBottom:18 }}>{localPlayers.find(p=>p.id===showEditRd.playerId)?.name}</p>
            {[["Сумма (€)","amount","number"],["Дата","date","date"]].map(([l,k,t])=>(
              <div key={k} style={{ marginBottom:14 }}>
                <label style={{ display:"block",fontSize:10,color:T.muted,marginBottom:5,fontWeight:700,textTransform:"uppercase" }}>{l}</label>
                <input type={t} value={showEditRd[k]} onChange={e=>setShowEditRd(prev=>({...prev,[k]:e.target.value}))} style={IS}/>
              </div>
            ))}
            {showEditRd.isPlanned?(
              <>
                <button onClick={async()=>{ const c=showEditRd; setShowEditRd(null); await markPlannedAsDone(c.playerId,c.rdNumber,c.amount,c.date||today); }} className="btn-p" style={{ width:"100%",padding:"11px",fontSize:14,marginBottom:10 }}>Подтвердить</button>
                <div style={{ display:"flex",gap:10 }}>
                  <button onClick={savePlannedEdit} className="btn-g" style={{ flex:1,border:`1px solid ${T.border}`,color:T.sub,padding:"10px",borderRadius:8,cursor:"pointer" }}>Сохранить план</button>
                  <button onClick={()=>resetPlanned(showEditRd.playerId,showEditRd.rdNumber)} style={{ background:"rgba(242,112,110,.13)",color:"#F2706E",border:"none",padding:"10px 14px",borderRadius:8,cursor:"pointer",fontWeight:600 }}>Удалить</button>
                  <button onClick={()=>setShowEditRd(null)} className="btn-g" style={{ flex:1,border:`1px solid ${T.border}`,color:T.sub,padding:"10px",borderRadius:8,cursor:"pointer" }}>Отмена</button>
                </div>
              </>
            ):(
              <>
                <div style={{ display:"flex",gap:10 }}>
                  <button onClick={editRd} className="btn-p" style={{ flex:1,padding:"10px",fontSize:14 }}>Сохранить</button>
                  <button onClick={()=>resetRd(showEditRd.playerId,showEditRd.rdNumber)} style={{ background:"rgba(242,112,110,.13)",color:"#F2706E",border:"none",padding:"10px 14px",borderRadius:8,cursor:"pointer",fontWeight:600 }}>Сбросить</button>
                  <button onClick={()=>setShowEditRd(null)} className="btn-g" style={{ flex:1,border:`1px solid ${T.border}`,color:T.sub,padding:"10px",borderRadius:8,cursor:"pointer" }}>Отмена</button>
                </div>
                <button onClick={()=>{ revertRdToPlanned(showEditRd.playerId,showEditRd.rdNumber,showEditRd.amount,showEditRd.date); setShowEditRd(null); }} style={{ marginTop:10,width:"100%",background:"transparent",border:`1px solid ${T.border}`,color:T.muted,padding:"7px",borderRadius:8,cursor:"pointer",fontSize:12 }}>↩ Вернуть в плановый</button>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ overflowX:"auto",border:`1px solid ${T.border}`,borderRadius:18,background:T.surface }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr><th style={{ ...S.th,padding:"6px 8px" }} colSpan={(readonly?0:2)+18+(isPoland?1:0)}>ЛИДЫ{readonly?" (только просмотр)":""}</th></tr>
            <tr>
              <th style={{ ...S.th,width:28,textAlign:"center" }}>#</th>
              {!readonly && <th style={{ ...S.th,width:20 }}></th>}
              {!readonly && <th style={{ ...S.th,width:24 }}></th>}
              <th style={{ ...S.th, cursor:readonly?"default":"pointer", userSelect:"none" }} onClick={sortByDate} title={readonly?"":"Сортировать по дате"}>Дата {!readonly && <span style={{ opacity:0.6,fontSize:9 }}>{dateSortDir==="asc"?"▲":dateSortDir==="desc"?"▼":"⇅"}</span>}</th>
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
                    <td colSpan={(readonly?0:2)+18+(isPoland?1:0)} style={{ padding:"7px 12px",background:T.monthHdr,borderBottom:`1px solid ${T.border}`,borderTop:`2px solid ${T.border}` }}>
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
                      <tr key={player.id} className={`row-hover tag-${player.color||"none"}`}
                        ref={el=>{ if(el&&highlightId===player.id) el.scrollIntoView({behavior:"smooth",block:"center"}); }}
                        draggable={!readonly} onDragStart={()=>handleDragStart(globalIdx)} onDragOver={e=>handleDragOver(e,globalIdx)} onDragEnd={handleDragEnd}
                        style={{ background:highlightId===player.id?"rgba(155,79,224,.28)":undefined,boxShadow:highlightId===player.id?"inset 0 0 0 2px #9B5FD0":"none",transition:"background .4s,box-shadow .4s" }}>
                        <td style={{ ...S.td,color:T.muted,fontSize:10,textAlign:"center" }}>{globalIdx+1}</td>
                        {!readonly && <td style={S.td}><span className="drag-handle" title="Перетащи">⠿</span></td>}
                        {!readonly && <td style={{ ...S.td,textAlign:"center" }}>
                          <input type="checkbox" checked={excludedIds.has(player.id)} onChange={()=>setExcludedIds(s=>{ const n=new Set(s); n.has(player.id)?n.delete(player.id):n.add(player.id); return n; })} title="Исключить из автоматизации" style={{ width:13,height:13,accentColor:"#9B5FD0",cursor:"pointer" }}/>
                        </td>}
                        <td style={{ ...S.td,color:T.muted,fontSize:11,cursor:readonly?"default":"pointer" }} onClick={readonly?undefined:()=>setDateEdit(player.id)}>
                          {dateEdit===player.id&&!readonly
                            ?<input autoFocus type="date" defaultValue={player.date} onBlur={async e=>{ await supabase.from("players").update({date:e.target.value}).eq("id",player.id); setDateEdit(null); onReload(); }} onKeyDown={e=>{ if(e.key==="Escape") setDateEdit(null); }} style={{ ...IS,fontSize:11,padding:"2px 4px",width:120 }}/>
                            :<span style={{ borderBottom:readonly?"none":`1px dashed ${T.border}`,color:"#fff",fontFamily:THEME.fontGilroy,fontVariantNumeric:"tabular-nums" }}>{player.date?(([y,m,d])=>`${d}.${m}.${y}`)(player.date.split("-")):"—"}</span>}
                        </td>
                        <td style={{ ...S.td,color:T.text,fontSize:11,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",cursor:readonly?"default":"pointer" }} onClick={readonly?undefined:e=>setPlatformPopup({playerId:player.id,x:e.clientX-10,y:e.clientY+8})} title={readonly?"":plat?.name}>{plat?.name||"—"}</td>
                        <td style={{ ...S.td,fontSize:12,fontWeight:500 }}>
                          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                            {!readonly && <div onClick={e=>setColorPopup({playerId:player.id,x:e.clientX-10,y:e.clientY+8})} style={{ width:8,height:8,borderRadius:"50%",background:colorInfo.dot,cursor:"pointer",flexShrink:0 }} title="Цвет"/>}
                            {readonly && <div style={{ width:8,height:8,borderRadius:"50%",background:colorInfo.dot,flexShrink:0 }}/>}
                            <span onClick={e=>{ const r=document.createRange(); r.selectNodeContents(e.currentTarget); const s=window.getSelection(); s.removeAllRanges(); s.addRange(r); }} onMouseDown={e=>e.stopPropagation()} style={{ color:T.text,userSelect:"text",cursor:"text" }}>{player.name}</span>
                          </div>
                        </td>
                        <td style={{ ...S.td,color:T.muted,fontSize:10,fontFamily:"monospace",cursor:"pointer" }} onClick={()=>player.sub18&&copyToClipboard(player.sub18)} title="Скопировать">
                          <span style={{ borderBottom:`1px dashed ${T.border}` }}>{player.sub18||"—"}</span>
                        </td>
                        <td style={{ ...S.td,color:T.text,fontWeight:600,fontFamily:THEME.fontGilroy,fontVariantNumeric:"tabular-nums" }}>{player.deposit}€</td>
                        {rdArr.map((rd,i)=>{
                          const isToday=rd&&!rd.isFact&&rd.date===today;
                          const isOverdue=rd&&!rd.isFact&&rd.date&&rd.date<today;
                          const rdColor=rd?(rd.isFact?T.rdFact:T.rdPlan):T.border;
                          const amtColor=isOverdue?"#F2706E":isToday?"#F4B740":rdColor;
                          return (
                            <td key={i} className="rd-cell" style={{ ...S.rdTd,color:rdColor,fontWeight:rd?.isFact?700:400,lineHeight:1.3 }}
                              onClick={e=>{
                                if (readonly) return;
                                if (!rd) { const popup={playerId:player.id,rdNumber:i+1,x:e.clientX,y:e.clientY}; rdInputPopupRef.current=popup; setRdInputPopup(popup); setRdInputVal(""); setRdInputDate(today); return; }
                                if (rd.isFact) setShowEditRd({playerId:player.id,rdNumber:rd.rd_number,amount:rd.amount,date:rd.date,canRevert:true});
                                else setShowEditRd({playerId:player.id,rdNumber:rd.rd_number,amount:rd.amount,date:rd.date,isPlanned:true});
                              }}
                              title={readonly?"":!rd?"Ввести РД":rd.isFact?"Изменить":"Нажми для подтверждения"}>
                              {rd?<div>
                                <div style={{ fontSize:11,color:amtColor,fontWeight:isToday||isOverdue?700:undefined }}>{rd.amount}€</div>
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
                        <td style={{ ...S.td,color:"#fff",fontWeight:700,fontFamily:THEME.fontGilroy,fontVariantNumeric:"tabular-nums" }}>{total}€</td>
                        <td style={S.td}><StatusBadge status={player.status} dark={dark} onClick={readonly?undefined:e=>setStatusPopup({playerId:player.id,x:e.clientX-10,y:e.clientY+8})}/></td>
                        {isPoland&&<td style={S.td}>{player.is_blik&&<span style={{ background:"rgba(244,183,64,.13)",color:"#F4B740",padding:"2px 6px",borderRadius:4,fontSize:10,fontWeight:700 }}>BLIK</span>}</td>}
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
            {localPlayers.length===0&&<tr><td colSpan={(readonly?0:2)+18+(isPoland?1:0)} style={{ padding:24,textAlign:"center",color:T.muted }}>Нет лидов</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Manager Page ─────────────────────────────────────────────────────────────
