import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { THEME } from "../constants";

const THRESHOLD = 5;

export default function CapaView({ platforms=[], players=[], managers=[], myGeos=[], activeGeo, managerId, isTeamLead, showToast }) {

  const [queue, setQueue]     = useState([]);   // cap_queue rows
  const [busy, setBusy]       = useState({});   // platformId → bool
  const [loading, setLoading] = useState(true);

  const loadQueue = useCallback(async () => {
    const { data } = await supabase
      .from("cap_queue")
      .select("*")
      .in("status", ["pending","confirmed"])
      .order("created_at", { ascending: true });
    setQueue(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  // Real-time updates
  useEffect(() => {
    const ch = supabase.channel("cap_queue_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "cap_queue" }, () => loadQueue())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [loadQueue]);

  // Platforms that are ≤ THRESHOLD away from cap, filtered by activeGeo
  const geoPlatforms = platforms.filter(p => p.geo_id === activeGeo && p.cap && p.is_active !== false && !p.is_hidden);

  const platStats = geoPlatforms.map(plat => {
    const platPlayers = players.filter(p => p.platform_id === plat.id && p.status === "Да");
    const totalCount = platPlayers.length;
    const remaining = plat.cap - totalCount;
    const platQueue = queue.filter(q => q.platform_id === plat.id);
    const bookedSlots = platQueue.reduce((s, q) => s + q.slots, 0);
    const freeSlots = Math.max(0, remaining - bookedSlots);
    return { plat, totalCount, remaining, bookedSlots, freeSlots, platQueue };
  }).filter(({ remaining }) => remaining <= THRESHOLD && remaining >= 0);

  // What the current manager has booked (pending/confirmed)
  const myEntry = (platId) => queue.find(q => q.platform_id === platId && q.manager_id === managerId);

  const handleTake = async (plat, slots = 1) => {
    const existing = myEntry(plat.id);
    if (existing) { showToast?.("Ты уже занял место на этой платформе"); return; }
    const stat = platStats.find(s => s.plat.id === plat.id);
    if (!stat || stat.freeSlots < slots) { showToast?.("Нет свободных мест"); return; }
    setBusy(b => ({ ...b, [plat.id]: true }));
    const { error } = await supabase.from("cap_queue").insert({
      platform_id: plat.id, manager_id: managerId,
      geo_id: activeGeo, slots, status: "pending"
    });
    if (error) showToast?.("Ошибка: " + error.message);
    else showToast?.(`Забронировано ${slots} место${slots > 1 ? "а" : ""} на ${plat.name}`);
    setBusy(b => ({ ...b, [plat.id]: false }));
    await loadQueue();
  };

  const handleConfirm = async (entryId, platName) => {
    await supabase.from("cap_queue").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", entryId);
    showToast?.("Депозит подтверждён на " + platName);
    await loadQueue();
  };

  const handleCancel = async (entryId) => {
    await supabase.from("cap_queue").update({ status: "cancelled" }).eq("id", entryId);
    await loadQueue();
  };

  const handleAllowTwo = async (entryId, managerName) => {
    await supabase.from("cap_queue").update({ allow_two: true, slots: 2 }).eq("id", entryId);
    showToast?.(`${managerName} может взять 2 депозита`);
    await loadQueue();
  };

  const S = {
    card: { background: "rgba(16,16,18,.55)", backdropFilter: "blur(20px) saturate(140%)", WebkitBackdropFilter: "blur(20px) saturate(140%)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, padding: "20px 22px", marginBottom: 14 },
    badge: (col, bg) => ({ background: bg, color: col, padding: "2px 9px", borderRadius: 6, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center" }),
    entry: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,.05)" },
    btn: (grad, disabled) => ({ background: disabled ? "rgba(255,255,255,.06)" : grad, color: disabled ? "#4A4A5A" : "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", transition: "all .15s" }),
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#4A4A5A" }}>Загрузка...</div>;

  return (
    <div style={{ padding: "16px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <h2 style={{ color: "#F0F0F2", fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Gilroy','Inter',system-ui,sans-serif" }}>Капа</h2>
        <span style={{ background: "rgba(167,139,250,.13)", color: "#A78BFA", padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
          ≤{THRESHOLD} до капы
        </span>
        {platStats.length > 0 && (
          <span style={{ background: THEME.gradSoft || "rgba(244,146,74,.13)", color: "#F4924A", padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
            {platStats.length} платформ{platStats.length === 1 ? "а" : platStats.length < 5 ? "ы" : ""}
          </span>
        )}
      </div>

      {/* Empty state */}
      {platStats.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#4A4A5A" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#8B8B9A", marginBottom: 6 }}>Капа в порядке</div>
          <div style={{ fontSize: 13, color: "#4A4A5A" }}>Нет платформ с менее чем {THRESHOLD} местами до капы</div>
        </div>
      )}

      {/* Platform cards */}
      {platStats.map(({ plat, totalCount, remaining, bookedSlots, freeSlots, platQueue }) => {
        const myE = myEntry(plat.id);
        const pct = Math.round((totalCount / plat.cap) * 100);

        return (
          <div key={plat.id} style={S.card}>
            {/* Platform header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <span style={{ color: "#F0F0F2", fontWeight: 700, fontSize: 16 }}>{plat.name}</span>
              <span style={{ color: "#8B8B9A", fontSize: 12 }}>{totalCount}/{plat.cap}</span>

              {/* Cap bar */}
              <div style={{ flex: 1, minWidth: 80, background: "rgba(255,255,255,.07)", borderRadius: 4, height: 5, position: "relative" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "#F2706E" : pct >= 80 ? "#F4B740" : "#A78BFA", borderRadius: 4, transition: "width .3s" }}/>
              </div>

              {/* Slot counters */}
              <div style={{ display: "flex", gap: 6 }}>
                <span style={S.badge("#F0F0F2", "rgba(255,255,255,.08)")}>{remaining} осталось</span>
                {bookedSlots > 0 && <span style={S.badge("#F4B740", "rgba(244,183,64,.13)")}>{bookedSlots} забронировано</span>}
                {freeSlots > 0 && <span style={S.badge("#3DD68C", "rgba(61,214,140,.13)")}>{freeSlots} свободно</span>}
                {freeSlots === 0 && <span style={S.badge("#F2706E", "rgba(242,112,110,.13)")}>Мест нет</span>}
              </div>
            </div>

            {/* Queue list */}
            {platQueue.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                {platQueue.map((entry, i) => {
                  const mgr = managers.find(m => m.id === entry.manager_id);
                  const isMe = entry.manager_id === managerId;
                  const isPending = entry.status === "pending";
                  const isConfirmed = entry.status === "confirmed";
                  return (
                    <div key={entry.id} style={{ ...S.entry, borderBottom: i < platQueue.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: isConfirmed ? "#3DD68C" : "#F4B740", flexShrink: 0 }}/>
                        <span style={{ color: isMe ? "#F0F0F2" : "#8B8B9A", fontWeight: isMe ? 700 : 500, fontSize: 13 }}>
                          {mgr?.name || "—"}
                          {entry.slots === 2 && <span style={{ marginLeft: 6, fontSize: 10, background: "rgba(167,139,250,.2)", color: "#A78BFA", padding: "1px 6px", borderRadius: 4 }}>×2</span>}
                        </span>
                        <span style={{ fontSize: 11, color: isConfirmed ? "#3DD68C" : "#F4B740" }}>
                          {isConfirmed ? "подтверждён" : "ждёт"}
                        </span>
                      </div>

                      {/* Manager: confirm own slot */}
                      {isMe && isPending && (
                        <button onClick={() => handleConfirm(entry.id, plat.name)} style={S.btn(THEME.grad || "linear-gradient(135deg,#F4924A,#C9517A,#9B5FD0)", false)}>
                          Подтвердить
                        </button>
                      )}
                      {isMe && (
                        <button onClick={() => handleCancel(entry.id)} style={{ ...S.btn("rgba(242,112,110,.13)", false), color: "#F2706E", marginLeft: 4 }}>
                          Отмена
                        </button>
                      )}

                      {/* Teamlead controls */}
                      {isTeamLead && !isMe && (
                        <div style={{ display: "flex", gap: 6 }}>
                          {isPending && !entry.allow_two && freeSlots >= 2 && (
                            <button onClick={() => handleAllowTwo(entry.id, mgr?.name)} style={S.btn("rgba(167,139,250,.15)", false)} title="Разрешить взять 2 депозита">
                              <span style={{ color: "#A78BFA" }}>+2</span>
                            </button>
                          )}
                          <button onClick={() => handleCancel(entry.id)} style={{ ...S.btn("transparent", false), color: "#4A4A5A", border: "1px solid rgba(255,255,255,.06)" }}>
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Take button — manager */}
            {!myE && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleTake(plat, 1)}
                  disabled={!!busy[plat.id] || freeSlots < 1}
                  style={S.btn(THEME.grad || "linear-gradient(135deg,#F4924A,#C9517A,#9B5FD0)", !!busy[plat.id] || freeSlots < 1)}>
                  {freeSlots < 1 ? "Мест нет" : "Взять 1 место"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
