import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { LoginPage } from "./pages/LoginPage";
import { ManagerPage } from "./pages/ManagerPage";
import { AdminPage } from "./pages/AdminPage";

export default function App() {
  const [session, setSession] = useState(null);
  useEffect(()=>{
    const s=localStorage.getItem("arbi_v2");
    if(!s){ return; }
    const parsed=JSON.parse(s);
    if(parsed.role==="admin"){ setSession(parsed); return; }
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
