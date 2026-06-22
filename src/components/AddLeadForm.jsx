import { STATUSES } from "../constants";
import { StatusBadge } from "./common";

export function AddLeadForm({ dark, T, IS, leadForm, setLeadForm, geoPlatforms, myGeos, activeGeo, onSubmit, onClose }) {
  const isPoland = myGeos.find(g=>g.id===activeGeo)?.code==='PL';
  return (
    <div style={{ position:"fixed",inset:0,background:"transparent",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="slide-in" style={{ background:"rgba(16,16,18,.25)",backdropFilter:"blur(24px) saturate(150%)",WebkitBackdropFilter:"blur(24px) saturate(150%)",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,padding:24,width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06)" }}>
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
              {[["Нет",false],["BLIK",true]].map(([l,v])=><button key={String(v)} onClick={()=>setLeadForm(f=>({...f,is_blik:v}))} style={{ border:"none",padding:"5px 14px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,background:leadForm.is_blik===v?(v?"rgba(244,183,64,.18)":"var(--grad)"):"transparent",color:leadForm.is_blik===v?"#fff":T.muted,transition:"all .2s" }}>{l}</button>)}
            </div>
          </div>
        )}
        <div style={{ marginBottom:12 }}>
          <label style={{ display:"block",fontSize:10,color:T.muted,marginBottom:6,fontWeight:700,textTransform:"uppercase" }}>Статус</label>
          <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
            {STATUSES.map(st=><button key={st} type="button" onClick={()=>setLeadForm(f=>({...f,status:st}))} style={{ cursor:"pointer",outline:leadForm.status===st?"2px solid #9B5FD0":"none",borderRadius:20,outlineOffset:2,background:"transparent",border:"none",padding:0 }}><StatusBadge status={st} dark={dark}/></button>)}
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

