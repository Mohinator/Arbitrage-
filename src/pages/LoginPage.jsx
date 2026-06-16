import { useState } from "react";
import { supabase } from "../supabaseClient";
import { ADMIN_PASSWORD, CSS } from "../constants";

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

