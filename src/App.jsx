import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hbmmbjwnnsralaehdamq.supabase.co";
const SUPABASE_KEY = "sb_publishable_vFYq1gSco_1HRtTca4xqpw_agIuIL5T";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const ADMIN_PASSWORD = "admin2026";

const STATUS_STYLES = {
  "Да":       { bg: "#14532d", color: "#86efac" },
  "Нет":      { bg: "#1e2235", color: "#64748b", border: "1px solid #2d3148" },
  "Кинул":    { bg: "#7f1d1d", color: "#fca5a5" },
  "Отправил": { bg: "#1e3a5f", color: "#93c5fd" },
  "Вернул":   { bg: "#422006", color: "#fbbf24" },
};
const STATUSES = ["Да", "Нет", "Отправил", "Кинул", "Вернул"];

function Toast({ msg, type, onUndo }) {
  if (!msg) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: type === "error" ? "#ef4444" : "#1e2235", border: "1px solid " + (type === "error" ? "#ef4444" : "#3d4268"), color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", gap: 14 }}>
      <span>{msg}</span>
      {onUndo && <button onClick={onUndo} style={{ background: "#6366f1", border: "none", color: "#fff", padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Отменить</button>}
    </div>
  );
}

function StatusBadge({ status, onClick }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES["Нет"];
  return (
    <span onClick={onClick} style={{ background: s.bg, color: s.color, border: s.border || "none", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: onClick ? "pointer" : "default", userSelect: "none", display: "inline-block" }}>
      {status}
    </span>
  );
}

function StatusPopup({ x, y, onSelect, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} style={{ position: "fixed", left: x, top: y, background: "#1a1d27", border: "1px solid #2d3148", borderRadius: 8, padding: 6, zIndex: 5000, boxShadow: "0 8px 24px rgba(0,0,0,.6)", minWidth: 130 }}>
      {STATUSES.map(st => (
        <div key={st} onClick={() => onSelect(st)} style={{ padding: "6px 10px", borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center" }}
          onMouseEnter={e => e.currentTarget.style.background = "#0f1117"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <StatusBadge status={st} />
        </div>
      ))}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("manager");

  const login = async () => {
    setError(""); setLoading(true);
    if (mode === "admin") {
      if (token === ADMIN_PASSWORD) onLogin({ role: "admin" });
      else setError("Неверный пароль");
      setLoading(false); return;
    }
    const { data, error: err } = await supabase.from("managers").select("*").eq("token", token.toUpperCase()).eq("is_active", true).single();
    setLoading(false);
    if (err || !data) { setError("Токен не найден"); return; }
    onLogin({ role: "manager", manager: data });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#6366f1" }} />
            <span style={{ fontWeight: 800, fontSize: 22, color: "#fff", letterSpacing: "0.08em" }}>АРБИТРАЖ</span>
          </div>
          <p style={{ color: "#64748b", fontSize: 14 }}>Трекер лидов</p>
        </div>
        <div style={{ background: "#1a1d27", border: "1px solid #2d3148", borderRadius: 14, padding: 28 }}>
          <div style={{ display: "flex", background: "#0f1117", borderRadius: 8, padding: 3, marginBottom: 24 }}>
            {[["manager", "Менеджер"], ["admin", "Админ"]].map(([key, label]) => (
              <button key={key} onClick={() => { setMode(key); setToken(""); setError(""); }} style={{ flex: 1, background: mode === key ? "#6366f1" : "transparent", color: mode === key ? "#fff" : "#64748b", border: "none", padding: "8px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>{label}</button>
            ))}
          </div>
          <label style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{mode === "admin" ? "Пароль" : "Токен доступа"}</label>
          <input value={token} onChange={e => setToken(e.target.value)} onKeyDown={e => e.key === "Enter" && login()}
            placeholder={mode === "admin" ? "Пароль" : "Введи токен"} type={mode === "admin" ? "password" : "text"}
            style={{ width: "100%", background: "#0f1117", border: `1px solid ${error ? "#ef4444" : "#2d3148"}`, color: "#e2e8f0", padding: "12px 14px", borderRadius: 8, fontSize: 15, outline: "none", marginBottom: 8, boxSizing: "border-box", textTransform: mode === "manager" ? "uppercase" : "none", letterSpacing: mode === "manager" ? "0.1em" : "normal" }} />
          {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button onClick={login} disabled={loading || !token} style={{ width: "100%", background: loading || !token ? "#3730a3" : "#6366f1", color: "#fff", border: "none", padding: "12px", borderRadius: 8, cursor: loading || !token ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 15, marginTop: 8 }}>
            {loading ? "Проверяем..." : "Войти"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MANAGER PAGE ─────────────────────────────────────────────────────────────
function ManagerPage({ manager, onLogout }) {
  const [platforms, setPlatforms] = useState([]);
  const [players, setPlayers] = useState([]);
  const [redeposits, setRedeposits] = useState([]);
  const [tab, setTab] = useState("main");
  const [toast, setToast] = useState(null);
  const [statusPopup, setStatusPopup] = useState(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showAddRd, setShowAddRd] = useState(null); // player id
  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [leadForm, setLeadForm] = useState({ date: new Date().toISOString().slice(0,10), platform_id: "", name: "", sub18: "", deposit: "", is_blik: false, status: "Да", next_rd_date: "" });
  const [rdForm, setRdForm] = useState({ amount: "", date: new Date().toISOString().slice(0,10) });

  const showToast = (msg, type = "ok", onUndo = null) => { setToast({ msg, type, onUndo }); setTimeout(() => setToast(null), 4000); };

  const load = async () => {
    const [{ data: p }, { data: pl }, { data: rd }] = await Promise.all([
      supabase.from("platforms").select("*").eq("is_active", true).order("sort_order").order("name"),
      supabase.from("players").select("*").eq("manager_id", manager.id).order("date", { ascending: false }),
      supabase.from("redeposits").select("*"),
    ]);
    setPlatforms(p || []);
    setPlayers(pl || []);
    setRedeposits(rd || []);
  };

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);

  const getPlayerRds = (playerId) => redeposits.filter(r => r.player_id === playerId).sort((a,b) => a.rd_number - b.rd_number);

  const getNextRdNumber = (playerId) => {
    const rds = getPlayerRds(playerId);
    return rds.length + 1;
  };

  const calcTotal = (player) => {
    const rds = getPlayerRds(player.id);
    const rdSum = rds.reduce((s, r) => s + Number(r.amount), 0);
    return Number(player.deposit) + rdSum;
  };

  // Only count active players (status = Да) for SCH
  // If status = Кинул, exclude last RD amount
  const calcEffectiveTotal = (player) => {
    const rds = getPlayerRds(player.id);
    if (player.status === "Кинул" && rds.length > 0) {
      const withoutLast = rds.slice(0, -1);
      return Number(player.deposit) + withoutLast.reduce((s,r) => s + Number(r.amount), 0);
    }
    return Number(player.deposit) + rds.reduce((s,r) => s + Number(r.amount), 0);
  };

  const getRdStatus = (player) => {
    if (!player.next_rd_date) return "none";
    if (player.next_rd_date < today) return "late";
    if (player.next_rd_date === today) return "today";
    return "ok";
  };

  const addLead = async () => {
    if (!leadForm.platform_id || !leadForm.name || !leadForm.deposit) { showToast("Заполни все обязательные поля", "error"); return; }
    const nextRd = leadForm.next_rd_date || new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().slice(0,10);
    await supabase.from("players").insert({ manager_id: manager.id, platform_id: leadForm.platform_id, date: leadForm.date, name: leadForm.name, sub18: leadForm.sub18, deposit: Number(leadForm.deposit), is_blik: leadForm.is_blik, status: leadForm.status, next_rd_date: nextRd });
    showToast("Лид добавлен!");
    setShowAddLead(false);
    setLeadForm({ date: new Date().toISOString().slice(0,10), platform_id: "", name: "", sub18: "", deposit: "", is_blik: false, status: "Да", next_rd_date: "" });
    load();
  };

  const addRd = async (playerId) => {
    if (!rdForm.amount) { showToast("Введи сумму", "error"); return; }
    const rdNum = getNextRdNumber(playerId);
    if (rdNum > 7) { showToast("Максимум 7 редепозитов", "error"); return; }
    await supabase.from("redeposits").insert({ player_id: playerId, rd_number: rdNum, amount: Number(rdForm.amount), date: rdForm.date });
    // Auto set next RD date +7 days
    const nextRd = new Date(new Date(rdForm.date).setDate(new Date(rdForm.date).getDate() + 7)).toISOString().slice(0,10);
    await supabase.from("players").update({ next_rd_date: nextRd }).eq("id", playerId);
    showToast("РД добавлен!");
    setShowAddRd(null);
    setRdForm({ amount: "", date: new Date().toISOString().slice(0,10) });
    load();
  };

  const updateStatus = async (playerId, status) => {
    await supabase.from("players").update({ status }).eq("id", playerId);
    setStatusPopup(null);
    load();
  };

  const filteredPlayers = players.filter(p => {
    if (filterPlatform && p.platform_id !== filterPlatform) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  const todayRds = players.filter(p => getRdStatus(p) === "today" || getRdStatus(p) === "late");

  // Stats per platform
  const platformStats = platforms.map(plat => {
    const activePlayers = players.filter(p => p.platform_id === plat.id && p.status === "Да");
    const totalCount = activePlayers.length;
    const totalAmount = activePlayers.reduce((s, p) => s + calcEffectiveTotal(p), 0);
    const avgCheck = totalCount > 0 ? totalAmount / totalCount : 0;
    const blikCount = activePlayers.filter(p => p.is_blik).length;
    const blikPct = totalCount > 0 ? Math.round((blikCount / totalCount) * 100) : 0;
    const needMore = totalCount > 0 ? Math.max(0, (plat.target_avg_check * totalCount) - totalAmount) : 0;
    return { ...plat, totalCount, totalAmount, avgCheck, blikCount, blikPct, needMore };
  });

  const S = {
    th: { padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #2d3148", background: "#151824", whiteSpace: "nowrap" },
    td: { padding: "8px 10px", borderBottom: "1px solid #1e2235", verticalAlign: "middle", whiteSpace: "nowrap" },
    rdTh: { padding: "8px 5px", textAlign: "center", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #2d3148", background: "#151824", width: 42 },
    rdTd: { padding: "8px 5px", textAlign: "center", borderBottom: "1px solid #1e2235", verticalAlign: "middle", fontSize: 12, width: 42 },
  };

  const inputStyle = { background: "#0f1117", border: "1px solid #2d3148", color: "#e2e8f0", padding: "8px 10px", borderRadius: 7, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onUndo={toast.onUndo} />}
      {statusPopup && <StatusPopup x={statusPopup.x} y={statusPopup.y} onSelect={st => updateStatus(statusPopup.playerId, st)} onClose={() => setStatusPopup(null)} />}

      {/* Add Lead Modal */}
      {showAddLead && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#1a1d27", border: "1px solid #2d3148", borderRadius: 14, padding: 24, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ color: "#fff", marginBottom: 18, fontSize: 15 }}>Добавить лида</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              {[["Дата", "date", "date"], ["Продукт", "platform_id", "select"], ["Имя лида", "name", "text"], ["SUB18", "sub18", "text"], ["Депозит (€)", "deposit", "number"]].map(([label, key, type]) => (
                <div key={key} style={{ gridColumn: key === "name" ? "1/-1" : undefined }}>
                  <label style={{ display: "block", fontSize: 10, color: "#64748b", marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }}>{label}</label>
                  {type === "select" ? (
                    <select value={leadForm[key]} onChange={e => setLeadForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle}>
                      <option value="">Выбери платформу</option>
                      {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : (
                    <input type={type} value={leadForm[key]} onChange={e => setLeadForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 10, color: "#64748b", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>Через BLIK?</label>
              <div style={{ display: "flex", background: "#0f1117", borderRadius: 7, padding: 2, gap: 2, width: "fit-content" }}>
                {[["Нет", false], ["BLIK", true]].map(([label, val]) => (
                  <button key={label} onClick={() => setLeadForm(f => ({ ...f, is_blik: val }))} style={{ border: "none", padding: "5px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, background: leadForm.is_blik === val ? (val ? "#d97706" : "#6366f1") : "transparent", color: leadForm.is_blik === val ? "#fff" : "#64748b" }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 10, color: "#64748b", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>Статус</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {STATUSES.map(st => (
                  <span key={st} onClick={() => setLeadForm(f => ({ ...f, status: st }))} style={{ cursor: "pointer", outline: leadForm.status === st ? "2px solid #6366f1" : "none", borderRadius: 20, outlineOffset: 2 }}>
                    <StatusBadge status={st} />
                  </span>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 10, color: "#64748b", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>Следующий РД</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="date" value={leadForm.next_rd_date} onChange={e => setLeadForm(f => ({ ...f, next_rd_date: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
                <button onClick={() => { const d = new Date(); d.setDate(d.getDate()+7); setLeadForm(f=>({...f, next_rd_date: d.toISOString().slice(0,10)})); }} style={{ background: "#1e2235", border: "1px solid #2d3148", color: "#94a3b8", padding: "8px 10px", borderRadius: 7, cursor: "pointer", fontSize: 11, whiteSpace: "nowrap" }}>+7 дней</button>
                <button onClick={() => { const d = new Date(); d.setDate(d.getDate()+14); setLeadForm(f=>({...f, next_rd_date: d.toISOString().slice(0,10)})); }} style={{ background: "#1e2235", border: "1px solid #2d3148", color: "#94a3b8", padding: "8px 10px", borderRadius: 7, cursor: "pointer", fontSize: 11, whiteSpace: "nowrap" }}>+14 дней</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={addLead} style={{ flex: 1, background: "#6366f1", color: "#fff", border: "none", padding: "10px", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>Добавить</button>
              <button onClick={() => setShowAddLead(false)} style={{ flex: 1, background: "#1e2235", color: "#94a3b8", border: "1px solid #2d3148", padding: "10px", borderRadius: 8, cursor: "pointer" }}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Add RD Modal */}
      {showAddRd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#1a1d27", border: "1px solid #2d3148", borderRadius: 14, padding: 24, width: "100%", maxWidth: 360 }}>
            <h3 style={{ color: "#fff", marginBottom: 6, fontSize: 15 }}>Внести редепозит</h3>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 18 }}>
              {players.find(p => p.id === showAddRd)?.name} — РД{getNextRdNumber(showAddRd)}
            </p>
            {[["Сумма (€)", "amount", "number"], ["Дата", "date", "date"]].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 10, color: "#64748b", marginBottom: 5, fontWeight: 700, textTransform: "uppercase" }}>{label}</label>
                <input type={type} value={rdForm[key]} onChange={e => setRdForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={() => addRd(showAddRd)} style={{ flex: 1, background: "#6366f1", color: "#fff", border: "none", padding: "10px", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>Сохранить</button>
              <button onClick={() => setShowAddRd(null)} style={{ flex: 1, background: "#1e2235", color: "#94a3b8", border: "1px solid #2d3148", padding: "10px", borderRadius: 8, cursor: "pointer" }}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: "#1a1d27", borderBottom: "1px solid #2d3148", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1" }} />
          <span style={{ fontWeight: 800, fontSize: 15, color: "#fff", letterSpacing: "0.05em" }}>АРБИТРАЖ</span>
          <span style={{ background: "#6366f1", color: "#fff", fontSize: 10, padding: "1px 7px", borderRadius: 4, fontWeight: 700 }}>МЕНЕДЖЕР</span>
          <span style={{ color: "#64748b", fontSize: 13 }}>/ {manager.name}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowAddLead(true)} style={{ background: "#6366f1", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>+ Добавить лида</button>
          <button onClick={onLogout} style={{ background: "transparent", border: "1px solid #3d4268", color: "#94a3b8", padding: "7px 14px", borderRadius: 7, cursor: "pointer", fontSize: 13 }}>Выйти</button>
        </div>
      </div>

      {/* Nav */}
      <div style={{ background: "#1a1d27", borderBottom: "1px solid #2d3148", padding: "0 20px", display: "flex" }}>
        {[["main", "Главная"], ["stats", "Статистика"], ["platforms", "Платформы"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ background: "transparent", border: "none", color: tab === key ? "#6366f1" : "#64748b", padding: "12px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, borderBottom: tab === key ? "2px solid #6366f1" : "2px solid transparent" }}>{label}</button>
        ))}
      </div>

      {/* MAIN TAB */}
      {tab === "main" && (
        <div style={{ padding: "16px 20px" }}>
          {todayRds.length > 0 && (
            <div style={{ background: "#1c160a", border: "1px solid #d97706", borderRadius: 8, padding: "9px 14px", display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 16 }}>🔔</span>
              <span style={{ color: "#d97706", fontWeight: 600, fontSize: 13 }}>Сегодня нужно сделать РД:</span>
              <span style={{ color: "#fbbf24", fontSize: 13 }}>{todayRds.map(p => p.name).join(" · ")}</span>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} style={{ background: "#1a1d27", border: "1px solid #2d3148", color: "#94a3b8", padding: "6px 10px", borderRadius: 7, fontSize: 12, outline: "none" }}>
              <option value="">Все платформы</option>
              {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ background: "#1a1d27", border: "1px solid #2d3148", color: "#94a3b8", padding: "6px 10px", borderRadius: 7, fontSize: 12, outline: "none" }}>
              <option value="">Все статусы</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <span style={{ color: "#64748b", fontSize: 12, marginLeft: "auto" }}>Показано: <strong style={{ color: "#e2e8f0" }}>{filteredPlayers.length}</strong> лидов</span>
          </div>

          <div style={{ overflowX: "auto", border: "1px solid #2d3148", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {/* Leads section */}
                  <th style={{ ...S.th, borderRight: "2px solid #6366f1" }} colSpan={10}>МОИ ЛИДЫ</th>
                  {/* Schedule section */}
                  <th style={S.th} colSpan={9}>РАСПИСАНИЕ РД</th>
                </tr>
                <tr>
                  <th style={S.th}>Дата</th>
                  <th style={S.th}>Продукт</th>
                  <th style={S.th}>Имя</th>
                  <th style={S.th}>SUB18</th>
                  <th style={S.th}>Деп</th>
                  <th style={S.rdTh}>Рд1</th><th style={S.rdTh}>Рд2</th><th style={S.rdTh}>Рд3</th><th style={S.rdTh}>Рд4</th><th style={S.rdTh}>Рд5</th><th style={S.rdTh}>Рд6</th><th style={S.rdTh}>Рд7</th>
                  <th style={S.th}>Всего</th>
                  <th style={S.th}>Статус</th>
                  <th style={{ ...S.th, borderRight: "2px solid #6366f1" }}>BLIK</th>
                  <th style={{ ...S.th, borderRight: "2px solid #6366f1" }}>След. РД</th>
                  <th style={S.rdTh}>Рд1</th><th style={S.rdTh}>Рд2</th><th style={S.rdTh}>Рд3</th><th style={S.rdTh}>Рд4</th><th style={S.rdTh}>Рд5</th><th style={S.rdTh}>Рд6</th><th style={S.rdTh}>Рд7</th>
                  <th style={S.th}>Следующий РД</th>
                  <th style={S.th}>Действие</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map(player => {
                  const rds = getPlayerRds(player.id);
                  const rdArr = Array(7).fill(null).map((_, i) => rds.find(r => r.rd_number === i+1) || null);
                  const total = calcTotal(player);
                  const rdStatus = getRdStatus(player);
                  const plat = platforms.find(p => p.id === player.platform_id);

                  // RD dates for schedule (use actual rd dates)
                  const rdDateArr = Array(7).fill("").map((_, i) => rds.find(r => r.rd_number === i+1)?.date || "");

                  return (
                    <tr key={player.id}>
                      <td style={{ ...S.td, color: "#64748b", fontSize: 11 }}>{player.date}</td>
                      <td style={{ ...S.td, color: "#e2e8f0", fontSize: 11 }}>{plat?.name || "—"}</td>
                      <td style={{ ...S.td, color: "#e2e8f0", fontWeight: 500 }}>{player.name}</td>
                      <td style={{ ...S.td, color: "#475569", fontSize: 10, fontFamily: "monospace" }}>{player.sub18 || "—"}</td>
                      <td style={{ ...S.td, color: "#e2e8f0", fontWeight: 600 }}>{player.deposit}€</td>
                      {rdArr.map((rd, i) => (
                        <td key={i} style={{ ...S.rdTd, color: rd ? "#94a3b8" : "#2d3148" }}>{rd ? rd.amount + "€" : "—"}</td>
                      ))}
                      <td style={{ ...S.td, color: "#e2e8f0", fontWeight: 600 }}>{total}€</td>
                      <td style={S.td}>
                        <StatusBadge status={player.status} onClick={e => setStatusPopup({ playerId: player.id, x: e.clientX - 10, y: e.clientY + 8 })} />
                      </td>
                      <td style={{ ...S.td, borderRight: "2px solid #6366f1" }}>
                        {player.is_blik && <span style={{ background: "#451a03", color: "#d97706", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>BLIK</span>}
                      </td>
                      <td style={{ ...S.td, borderRight: "2px solid #6366f1" }}>
                        {rdStatus === "today" && <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 11 }}>⚠ {player.next_rd_date}</span>}
                        {rdStatus === "late" && <span style={{ color: "#f87171", fontWeight: 700, fontSize: 11 }}>⚠ {player.next_rd_date}</span>}
                        {rdStatus === "ok" && <span style={{ color: "#94a3b8", fontSize: 11 }}>{player.next_rd_date}</span>}
                        {rdStatus === "none" && <span style={{ color: "#2d3148", fontSize: 11 }}>—</span>}
                      </td>
                      {rdDateArr.map((d, i) => (
                        <td key={i} style={{ ...S.rdTd, color: d ? "#94a3b8" : "#2d3148", fontSize: 11 }}>{d || "—"}</td>
                      ))}
                      <td style={S.td}>
                        {rdStatus === "today" && <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 11 }}>🔔 Сегодня</span>}
                        {rdStatus === "late" && <span style={{ color: "#f87171", fontWeight: 700, fontSize: 11 }}>⚠ Просрочен</span>}
                        {rdStatus === "ok" && <span style={{ color: "#86efac", fontSize: 11 }}>{player.next_rd_date}</span>}
                        {rdStatus === "none" && <span style={{ color: "#2d3148", fontSize: 11 }}>—</span>}
                      </td>
                      <td style={S.td}>
                        {(rdStatus === "today" || rdStatus === "late") ? (
                          <button onClick={() => setShowAddRd(player.id)} style={{ background: "#6366f1", color: "#fff", border: "none", padding: "3px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Внести РД</button>
                        ) : (
                          <button onClick={() => setShowAddRd(player.id)} style={{ background: "transparent", border: "1px solid #2d3148", color: "#94a3b8", padding: "3px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>Внести РД</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredPlayers.length === 0 && (
                  <tr><td colSpan={25} style={{ padding: 24, textAlign: "center", color: "#475569" }}>Нет лидов</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STATS TAB */}
      {tab === "stats" && (
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              ["Всего лидов", players.length, `активных: ${players.filter(p=>p.status==="Да").length}`],
              ["Общая сумма", players.filter(p=>p.status==="Да").reduce((s,p)=>s+calcEffectiveTotal(p),0).toFixed(0)+"€", "деп + редепы"],
              ["BLIK", players.filter(p=>p.is_blik&&p.status==="Да").length, `${players.filter(p=>p.status==="Да").length>0?Math.round(players.filter(p=>p.is_blik&&p.status==="Да").length/players.filter(p=>p.status==="Да").length*100):0}% от активных`],
              ["Нужно добрать", platformStats.reduce((s,p)=>s+p.needMore,0).toFixed(0)+"€", "до цели СЧ"],
            ].map(([label, val, sub]) => (
              <div key={label} style={{ background: "#1a1d27", border: "1px solid #2d3148", borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{val}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{sub}</div>
              </div>
            ))}
          </div>
          <div style={{ border: "1px solid #2d3148", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Платформа", "Лидов", "Сумма", "BLIK", "СЧ цель", "СЧ факт", "Нужно добрать"].map(h => <th key={h} style={S.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {platformStats.map(p => {
                  const ok = p.avgCheck >= p.target_avg_check;
                  return (
                    <tr key={p.id}>
                      <td style={{ ...S.td, fontWeight: 600, color: "#e2e8f0" }}>{p.name}</td>
                      <td style={{ ...S.td, color: "#94a3b8" }}>{p.totalCount}</td>
                      <td style={{ ...S.td, color: "#94a3b8" }}>{p.totalAmount.toFixed(0)}€</td>
                      <td style={S.td}>
                        {p.totalCount > 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div style={{ width: 44, background: "#0f1117", borderRadius: 3, height: 4, overflow: "hidden", display: "flex" }}>
                              <div style={{ width: `${100-p.blikPct}%`, height: "100%", background: "#6366f1" }} />
                              <div style={{ width: `${p.blikPct}%`, height: "100%", background: "#d97706" }} />
                            </div>
                            <span style={{ color: "#d97706", fontSize: 11 }}>{p.blikCount} ({p.blikPct}%)</span>
                          </div>
                        ) : <span style={{ color: "#475569" }}>—</span>}
                      </td>
                      <td style={{ ...S.td, color: "#94a3b8" }}>{p.target_avg_check}€</td>
                      <td style={S.td}>
                        {p.totalCount > 0 ? <span style={{ background: ok ? "#166534" : "#7f1d1d", color: ok ? "#86efac" : "#fca5a5", padding: "2px 8px", borderRadius: 6, fontWeight: 700, fontSize: 11 }}>{p.avgCheck.toFixed(1)}€</span> : <span style={{ color: "#475569" }}>—</span>}
                      </td>
                      <td style={{ ...S.td, color: "#f59e0b", fontWeight: 600 }}>{p.totalCount > 0 ? p.needMore.toFixed(0) + "€" : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PLATFORMS TAB */}
      {tab === "platforms" && (
        <div style={{ padding: "16px 20px" }}>
          <div style={{ border: "1px solid #2d3148", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Платформа", "Дата", "Мин. деп", "Цель СЧ", "Капа", "Мои лиды", "Статус"].map(h => <th key={h} style={S.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {platformStats.map(p => (
                  <tr key={p.id}>
                    <td style={{ ...S.td, fontWeight: 600, color: "#e2e8f0" }}>{p.name}</td>
                    <td style={{ ...S.td, color: "#94a3b8", fontSize: 12 }}>{p.date_added || "—"}</td>
                    <td style={{ ...S.td, color: "#94a3b8" }}>{p.min_deposit || "—"}€</td>
                    <td style={S.td}><span style={{ background: "#1e3a5f", color: "#93c5fd", padding: "2px 8px", borderRadius: 6, fontWeight: 700, fontSize: 11 }}>{p.target_avg_check}€</span></td>
                    <td style={{ ...S.td, color: "#94a3b8" }}>{p.cap || "—"}</td>
                    <td style={{ ...S.td, color: "#a5b4fc", fontWeight: 600 }}>{p.totalCount}</td>
                    <td style={S.td}><span style={{ background: "#14532d", color: "#86efac", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Активна</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN PAGE ───────────────────────────────────────────────────────────────
function AdminPage({ onLogout }) {
  const [managers, setManagers] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [players, setPlayers] = useState([]);
  const [redeposits, setRedeposits] = useState([]);
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState(null);
  const [newName, setNewName] = useState("");
  const [showPlatformForm, setShowPlatformForm] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [pForm, setPForm] = useState({ name: "", target_avg_check: "", min_deposit: "", cap: "", date_added: "", is_active: true });

  const showToast = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = async () => {
    const [{ data: m }, { data: p }, { data: pl }, { data: rd }] = await Promise.all([
      supabase.from("managers").select("*").order("created_at"),
      supabase.from("platforms").select("*").order("sort_order").order("name"),
      supabase.from("players").select("*"),
      supabase.from("redeposits").select("*"),
    ]);
    setManagers(m || []); setPlatforms(p || []); setPlayers(pl || []); setRedeposits(rd || []);
  };

  useEffect(() => { load(); }, []);

  const createManager = async () => {
    if (!newName.trim()) return;
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();
    await supabase.from("managers").insert({ name: newName.trim(), token });
    showToast(`Создан! Токен: ${token}`);
    setNewName(""); load();
  };

  const deleteManager = async (id) => {
    if (!confirm("Удалить менеджера?")) return;
    await supabase.from("managers").delete().eq("id", id);
    load();
  };

  const toggleManager = async (m) => {
    await supabase.from("managers").update({ is_active: !m.is_active }).eq("id", m.id);
    load();
  };

  const openPlatformForm = (p = null) => {
    setEditingPlatform(p);
    setPForm(p ? { name: p.name, target_avg_check: p.target_avg_check, min_deposit: p.min_deposit || "", cap: p.cap || "", date_added: p.date_added || "", is_active: p.is_active !== false } : { name: "", target_avg_check: "", min_deposit: "", cap: "", date_added: new Date().toISOString().slice(0,10), is_active: true });
    setShowPlatformForm(true);
  };

  const savePlatform = async () => {
    if (!pForm.name || !pForm.target_avg_check) { showToast("Заполни обязательные поля", "error"); return; }
    const data = { name: pForm.name, target_avg_check: Number(pForm.target_avg_check), min_deposit: Number(pForm.min_deposit) || 0, cap: pForm.cap ? Number(pForm.cap) : null, date_added: pForm.date_added || null, is_active: pForm.is_active };
    if (editingPlatform) { await supabase.from("platforms").update(data).eq("id", editingPlatform.id); showToast("Обновлено!"); }
    else { await supabase.from("platforms").insert(data); showToast("Добавлено!"); }
    setShowPlatformForm(false); load();
  };

  const deletePlatform = async (id) => {
    if (!confirm("Удалить платформу?")) return;
    await supabase.from("platforms").delete().eq("id", id);
    load();
  };

  const getPlayerRds = (playerId) => redeposits.filter(r => r.player_id === playerId);
  const calcEffectiveTotal = (player) => {
    const rds = getPlayerRds(player.id).sort((a,b) => a.rd_number - b.rd_number);
    if (player.status === "Кинул" && rds.length > 0) {
      return Number(player.deposit) + rds.slice(0,-1).reduce((s,r)=>s+Number(r.amount),0);
    }
    return Number(player.deposit) + rds.reduce((s,r)=>s+Number(r.amount),0);
  };

  const platformStats = platforms.map(plat => {
    const activePlayers = players.filter(p => p.platform_id === plat.id && p.status === "Да");
    const totalCount = activePlayers.length;
    const totalAmount = activePlayers.reduce((s,p) => s + calcEffectiveTotal(p), 0);
    const avgCheck = totalCount > 0 ? totalAmount / totalCount : 0;
    const blikCount = activePlayers.filter(p => p.is_blik).length;
    const blikPct = totalCount > 0 ? Math.round((blikCount/totalCount)*100) : 0;
    const allPlayers = players.filter(p => p.platform_id === plat.id);
    return { ...plat, totalCount, totalAmount, avgCheck, blikCount, blikPct, allCount: allPlayers.length };
  });

  const managerStats = managers.map(m => {
    const mPlayers = players.filter(p => p.manager_id === m.id && p.status === "Да");
    const totalCount = mPlayers.length;
    const totalAmount = mPlayers.reduce((s,p)=>s+calcEffectiveTotal(p),0);
    const byPlatform = platforms.map(plat => {
      const pp = mPlayers.filter(p => p.platform_id === plat.id);
      const cnt = pp.length;
      const amt = pp.reduce((s,p)=>s+calcEffectiveTotal(p),0);
      const avg = cnt > 0 ? amt/cnt : 0;
      const blik = pp.filter(p=>p.is_blik).length;
      const blikPct = cnt > 0 ? Math.round((blik/cnt)*100) : 0;
      return { ...plat, cnt, amt, avg, blik, blikPct };
    }).filter(p => p.cnt > 0);
    return { ...m, totalCount, totalAmount, byPlatform };
  });

  const S = {
    th: { padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #2d3148", background: "#151824" },
    td: { padding: "12px 12px", borderBottom: "1px solid #1a1d27" },
  };

  const inputStyle = { background: "#0f1117", border: "1px solid #2d3148", color: "#e2e8f0", padding: "8px 10px", borderRadius: 7, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {showPlatformForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#1a1d27", border: "1px solid #2d3148", borderRadius: 14, padding: 24, width: "100%", maxWidth: 440 }}>
            <h3 style={{ color: "#fff", marginBottom: 18, fontSize: 15 }}>{editingPlatform ? "Редактировать" : "Добавить"} платформу</h3>
            {[["Название *", "name", "text"], ["Цель СЧ (€) *", "target_avg_check", "number"], ["Мин. депозит (€)", "min_deposit", "number"], ["Капа", "cap", "number"], ["Дата добавления", "date_added", "date"]].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 10, color: "#64748b", marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }}>{label}</label>
                <input type={type} value={pForm[key]} onChange={e => setPForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <input type="checkbox" id="isActive" checked={pForm.is_active} onChange={e => setPForm(f => ({ ...f, is_active: e.target.checked }))} />
              <label htmlFor="isActive" style={{ color: "#94a3b8", fontSize: 13 }}>Платформа активна</label>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={savePlatform} style={{ flex: 1, background: "#6366f1", color: "#fff", border: "none", padding: "10px", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>Сохранить</button>
              <button onClick={() => setShowPlatformForm(false)} style={{ flex: 1, background: "#1e2235", color: "#94a3b8", border: "1px solid #2d3148", padding: "10px", borderRadius: 8, cursor: "pointer" }}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "#1a1d27", borderBottom: "1px solid #2d3148", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1" }} />
          <span style={{ fontWeight: 800, fontSize: 15, color: "#fff", letterSpacing: "0.05em" }}>АРБИТРАЖ</span>
          <span style={{ background: "#6366f1", color: "#fff", fontSize: 10, padding: "1px 7px", borderRadius: 4, fontWeight: 700 }}>ADMIN</span>
        </div>
        <button onClick={onLogout} style={{ background: "transparent", border: "1px solid #3d4268", color: "#94a3b8", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Выйти</button>
      </div>

      <div style={{ background: "#1a1d27", borderBottom: "1px solid #2d3148", padding: "0 24px", display: "flex" }}>
        {[["overview", "Сводка"], ["managers", "Менеджеры"], ["platforms", "Платформы"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ background: "transparent", border: "none", color: tab === key ? "#6366f1" : "#64748b", padding: "12px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, borderBottom: tab === key ? "2px solid #6366f1" : "2px solid transparent" }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: "24px", maxWidth: 1300, margin: "0 auto" }}>

        {tab === "overview" && (
          <div>
            <h2 style={{ color: "#fff", marginBottom: 20, fontSize: 18 }}>Общий СЧ по платформам</h2>
            <div style={{ border: "1px solid #2d3148", borderRadius: 8, overflow: "hidden", marginBottom: 32 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Платформа", "Лидов (акт.)", "Сумма", "СЧ факт", "СЧ цель", "Капа", "Выполнено", "BLIK"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {platformStats.map(p => {
                    const ok = p.avgCheck >= p.target_avg_check;
                    const pct = p.cap ? Math.min(100, Math.round((p.allCount/p.cap)*100)) : 0;
                    const blikPct2 = 100 - p.blikPct;
                    return (
                      <tr key={p.id}>
                        <td style={{ ...S.td, fontWeight: 600, color: "#e2e8f0" }}>{p.name}{p.date_added && <span style={{ display: "block", fontSize: 10, color: "#475569" }}>{p.date_added}</span>}</td>
                        <td style={{ ...S.td, color: "#94a3b8" }}>{p.totalCount}</td>
                        <td style={{ ...S.td, color: "#94a3b8" }}>{p.totalAmount.toFixed(0)}€</td>
                        <td style={S.td}><span style={{ background: p.totalCount===0?"#1e2235":ok?"#166534":"#7f1d1d", color: p.totalCount===0?"#64748b":ok?"#86efac":"#fca5a5", padding:"3px 9px", borderRadius:6, fontWeight:700, fontSize:12 }}>{p.totalCount===0?"—":p.avgCheck.toFixed(1)+"€"}</span></td>
                        <td style={{ ...S.td, color: "#94a3b8" }}>{p.target_avg_check}€</td>
                        <td style={{ ...S.td, color: "#94a3b8" }}>{p.cap ?? "—"}</td>
                        <td style={S.td}>
                          {p.cap ? <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <div style={{ width:40, background:"#0f1117", borderRadius:4, height:5, overflow:"hidden" }}><div style={{ width:`${pct}%`, height:"100%", background:"#6366f1" }} /></div>
                            <span style={{ color:pct>=100?"#86efac":"#f59e0b", fontSize:12 }}>{p.allCount}/{p.cap}</span>
                          </div> : "—"}
                        </td>
                        <td style={S.td}>
                          {p.totalCount > 0 ? <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                            <div style={{ width:44, background:"#0f1117", borderRadius:3, height:4, overflow:"hidden", display:"flex" }}>
                              <div style={{ width:`${blikPct2}%`, height:"100%", background:"#6366f1" }} />
                              <div style={{ width:`${p.blikPct}%`, height:"100%", background:"#d97706" }} />
                            </div>
                            <span style={{ color:"#6366f1", fontSize:11 }}>{blikPct2}%</span>
                            <span style={{ color:"#475569", fontSize:11 }}>/</span>
                            <span style={{ color:"#d97706", fontSize:11 }}>{p.blikPct}% ({p.blikCount})</span>
                          </div> : <span style={{ color:"#475569" }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h2 style={{ color: "#fff", marginBottom: 20, fontSize: 18 }}>По менеджерам</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {managerStats.map(m => (
                <div key={m.id} style={{ border: "1px solid #2d3148", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: m.byPlatform.length > 0 ? "1px solid #2d3148" : "none", background: "#1a1d27" }}>
                    <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{m.name}</span>
                    <div style={{ display: "flex", gap: 20 }}>
                      <span style={{ color: "#64748b", fontSize: 12 }}>Лидов: <strong style={{ color: "#94a3b8" }}>{m.totalCount}</strong></span>
                      <span style={{ color: "#64748b", fontSize: 12 }}>Сумма: <strong style={{ color: "#94a3b8" }}>{m.totalAmount.toFixed(0)}€</strong></span>
                    </div>
                  </div>
                  {m.byPlatform.length > 0 && (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>{["Платформа","Лидов","Сумма","BLIK","СЧ цель","СЧ факт"].map(h=><th key={h} style={{ ...S.th, padding:"7px 18px" }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {m.byPlatform.map(p => {
                          const ok = p.avg >= p.target_avg_check;
                          return (
                            <tr key={p.id}>
                              <td style={{ padding:"9px 18px", color:"#cbd5e1", fontSize:12, borderBottom:"1px solid #1e2235" }}>{p.name}</td>
                              <td style={{ padding:"9px 18px", color:"#94a3b8", fontSize:12, borderBottom:"1px solid #1e2235" }}>{p.cnt}</td>
                              <td style={{ padding:"9px 18px", color:"#94a3b8", fontSize:12, borderBottom:"1px solid #1e2235" }}>{p.amt.toFixed(0)}€</td>
                              <td style={{ padding:"9px 18px", borderBottom:"1px solid #1e2235" }}>
                                {p.cnt > 0 ? <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                                  <div style={{ width:36, background:"#0f1117", borderRadius:3, height:4, overflow:"hidden", display:"flex" }}>
                                    <div style={{ width:`${100-p.blikPct}%`, height:"100%", background:"#6366f1" }} />
                                    <div style={{ width:`${p.blikPct}%`, height:"100%", background:"#d97706" }} />
                                  </div>
                                  <span style={{ color:"#d97706", fontSize:11 }}>{p.blik} ({p.blikPct}%)</span>
                                </div> : "—"}
                              </td>
                              <td style={{ padding:"9px 18px", color:"#94a3b8", fontSize:12, borderBottom:"1px solid #1e2235" }}>{p.target_avg_check}€</td>
                              <td style={{ padding:"9px 18px", borderBottom:"1px solid #1e2235" }}><span style={{ background:ok?"#166534":"#7f1d1d", color:ok?"#86efac":"#fca5a5", padding:"2px 8px", borderRadius:6, fontWeight:700, fontSize:11 }}>{p.avg.toFixed(1)}€</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  {m.byPlatform.length === 0 && <div style={{ padding:"12px 18px", color:"#475569", fontSize:12 }}>Нет данных</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "managers" && (
          <div>
            <h2 style={{ color: "#fff", marginBottom: 20, fontSize: 18 }}>Менеджеры</h2>
            <div style={{ background: "#1a1d27", border: "1px solid #2d3148", borderRadius: 10, padding: 20, marginBottom: 24, display: "flex", gap: 10 }}>
              <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && createManager()} placeholder="Имя менеджера" style={{ flex: 1, background: "#0f1117", border: "1px solid #2d3148", color: "#e2e8f0", padding: "9px 12px", borderRadius: 8, fontSize: 13, outline: "none" }} />
              <button onClick={createManager} style={{ background: "#6366f1", color: "#fff", border: "none", padding: "9px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>+ Создать</button>
            </div>
            <div style={{ border: "1px solid #2d3148", borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Имя","Токен","Статус","Лидов","Действия"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {managers.map(m => {
                    const mPlayers = players.filter(p => p.manager_id === m.id);
                    return (
                      <tr key={m.id}>
                        <td style={{ ...S.td, fontWeight: 600, color: "#e2e8f0" }}>{m.name}</td>
                        <td style={S.td}><code style={{ background:"#0f1117", border:"1px solid #2d3148", padding:"3px 8px", borderRadius:5, fontSize:12, color:"#a5b4fc", letterSpacing:"0.1em" }}>{m.token}</code></td>
                        <td style={S.td}><span style={{ background:m.is_active?"#14532d":"#1e2235", color:m.is_active?"#86efac":"#64748b", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600 }}>{m.is_active?"Активен":"Отключён"}</span></td>
                        <td style={{ ...S.td, color:"#94a3b8" }}>{mPlayers.length}</td>
                        <td style={{ ...S.td, display:"flex", gap:6 }}>
                          <button onClick={() => toggleManager(m)} style={{ background:"#1e2235", border:"1px solid #2d3148", color:"#94a3b8", padding:"5px 10px", borderRadius:6, cursor:"pointer", fontSize:11 }}>{m.is_active?"Отключить":"Включить"}</button>
                          <button onClick={() => deleteManager(m.id)} style={{ background:"#7f1d1d", border:"none", color:"#fca5a5", padding:"5px 10px", borderRadius:6, cursor:"pointer", fontSize:11 }}>Удалить</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "platforms" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ color:"#fff", fontSize:18, margin:0 }}>Платформы</h2>
              <button onClick={() => openPlatformForm()} style={{ background:"#6366f1", color:"#fff", border:"none", padding:"8px 18px", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13 }}>+ Добавить</button>
            </div>
            <div style={{ border:"1px solid #2d3148", borderRadius:8, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>{["Платформа","Дата","Мин. деп","Цель СЧ","Капа","Статус","Действия"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {platforms.map(p => {
                    const isActive = p.is_active !== false;
                    return (
                      <tr key={p.id} style={{ opacity: isActive ? 1 : 0.5 }}>
                        <td style={{ ...S.td, fontWeight:600, color:"#e2e8f0" }}>{p.name}</td>
                        <td style={{ ...S.td, color:"#94a3b8", fontSize:12 }}>{p.date_added || "—"}</td>
                        <td style={{ ...S.td, color:"#94a3b8" }}>{p.min_deposit || "—"}€</td>
                        <td style={S.td}><span style={{ background:"#1e3a5f", color:"#93c5fd", padding:"2px 8px", borderRadius:6, fontWeight:700, fontSize:11 }}>{p.target_avg_check}€</span></td>
                        <td style={{ ...S.td, color:"#94a3b8" }}>{p.cap || "—"}</td>
                        <td style={S.td}><span style={{ background:isActive?"#14532d":"#1e2235", color:isActive?"#86efac":"#64748b", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600 }}>{isActive?"Активна":"Скрыта"}</span></td>
                        <td style={{ ...S.td, display:"flex", gap:6 }}>
                          <button onClick={() => openPlatformForm(p)} style={{ background:"transparent", border:"1px solid #2d3148", color:"#94a3b8", width:28, height:28, borderRadius:6, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={() => deletePlatform(p.id)} style={{ background:"transparent", border:"1px solid #7f1d1d", color:"#fca5a5", width:28, height:28, borderRadius:6, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  useEffect(() => { const s = localStorage.getItem("arbi_v2"); if (s) setSession(JSON.parse(s)); }, []);
  const login = (s) => { localStorage.setItem("arbi_v2", JSON.stringify(s)); setSession(s); };
  const logout = () => { localStorage.removeItem("arbi_v2"); setSession(null); };
  if (!session) return <LoginPage onLogin={login} />;
  if (session.role === "admin") return <AdminPage onLogout={logout} />;
  return <ManagerPage manager={session.manager} onLogout={logout} />;
}
