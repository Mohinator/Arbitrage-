import { useState } from "react";
import { supabase } from "../supabaseClient";
import { ADMIN_PASSWORD, CSS, THEME } from "../constants";

export function LoginPage({ onLogin }) {
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
    <div style={{ minHeight:"100vh", background:THEME.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:THEME.fontInter }}>
      <style>{CSS}</style>
      <div style={{ width:"100%", maxWidth:400, padding:24 }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ display:"inline-flex", gap:9, alignItems:"center", marginBottom:12 }}>
            <div style={{ width:11, height:11, borderRadius:"50%", background:THEME.grad, boxShadow:"0 0 12px rgba(155,79,224,.6)" }} />
            <span style={{ fontFamily:THEME.fontGilroy, fontWeight:800, fontSize:22, color:"#fff", letterSpacing:"0.07em" }}>АРБИТРАЖ</span>
          </div>
          <p style={{ color:THEME.text2, fontSize:14 }}>Трекер лидов</p>
        </div>
        <div style={{ background:THEME.surface, border:`1px solid ${THEME.line}`, borderRadius:THEME.rCard, padding:28 }}>
          <div style={{ display:"flex", background:"rgba(255,255,255,.04)", borderRadius:THEME.rCtrl, padding:3, marginBottom:24 }}>
            {[["manager","Менеджер"],["admin","Админ"]].map(([k,l]) => (
              <button key={k} onClick={() => { setMode(k); setToken(""); setError(""); }} style={{ flex:1, background:mode===k?THEME.grad:"transparent", color:mode===k?"#fff":THEME.text2, border:"none", padding:"8px", borderRadius:THEME.rCtrl, cursor:"pointer", fontWeight:700, fontFamily:THEME.fontGilroy, fontSize:13, transition:"all .2s" }}>{l}</button>
            ))}
          </div>
          <label style={{ display:"block", fontSize:11, color:THEME.text3, marginBottom:8, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em" }}>{mode==="admin"?"Пароль":"Токен доступа"}</label>
          <input value={token} onChange={e=>setToken(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder={mode==="admin"?"Пароль":"Введи токен"} type={mode==="admin"?"password":"text"}
            style={{ width:"100%", background:"rgba(255,255,255,.03)", border:`1px solid ${error?THEME.bad:THEME.line}`, color:THEME.text, padding:"12px 14px", borderRadius:THEME.rCtrl, fontSize:15, outline:"none", marginBottom:8, boxSizing:"border-box", textTransform:mode==="manager"?"uppercase":"none" }} />
          {error && <p style={{ color:THEME.bad, fontSize:13, marginBottom:12 }}>{error}</p>}
          <button onClick={login} disabled={loading||!token} className={loading||!token?"":"btn-p"} style={{ width:"100%", background:loading||!token?"rgba(255,255,255,.06)":undefined, color:loading||!token?THEME.text3:"#fff", border:"none", padding:"12px", borderRadius:THEME.rCtrl, cursor:loading||!token?"not-allowed":"pointer", fontWeight:700, fontFamily:THEME.fontGilroy, fontSize:15, marginTop:8 }}>
            {loading?"Проверяем...":"Войти"}
          </button>
        </div>
      </div>
    </div>
  );
}
