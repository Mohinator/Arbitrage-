// Расчёт присутствия: из списка временных меток активности строим сессии,
// считаем «работал» (сумма активных отрезков) и «простой» (разрывы внутри окна).

export function dayBoundsISO(dateStr){
  // dateStr = "YYYY-MM-DD" в локальной зоне пользователя → границы дня в ISO (UTC)
  const start = new Date(dateStr + "T00:00:00");
  const end = new Date(dateStr + "T00:00:00"); end.setDate(end.getDate() + 1);
  return { fromISO: start.toISOString(), toISO: end.toISOString() };
}

export function todayStr(){
  const d = new Date(); const p = (n)=>String(n).padStart(2,"0");
  return d.getFullYear() + "-" + p(d.getMonth()+1) + "-" + p(d.getDate());
}

// из массива ISO/Date меток → { first, last, activeMin, idleMin, sessions:[[start,end],...] }
export function computeSessions(tsList, gapMin = 20){
  const ts = (tsList||[]).map(t => new Date(t).getTime()).filter(n => !isNaN(n)).sort((a,b)=>a-b);
  if (ts.length === 0) return { first:null, last:null, activeMin:0, idleMin:0, count:0, sessions:[], gaps:[] };
  const GAP = gapMin*60000;
  const TAIL = 5*60000; // одиночное событие считаем как ~5 мин активности
  const segs = []; let s = ts[0], prev = ts[0];
  for (let i=1;i<ts.length;i++){ if (ts[i]-prev > GAP){ segs.push([s,prev]); s = ts[i]; } prev = ts[i]; }
  segs.push([s,prev]);
  let active = 0;
  segs.forEach(([a,b]) => { active += (b>a ? b-a : TAIL); });
  const gaps = [];
  for (let i=1;i<segs.length;i++){ const gStart=segs[i-1][1], gEnd=segs[i][0]; gaps.push({ start:gStart, end:gEnd, min:Math.round((gEnd-gStart)/60000) }); }
  const first = ts[0], last = ts[ts.length-1];
  const idle = Math.max(0, (last-first) - active);
  return { first, last, activeMin: Math.round(active/60000), idleMin: Math.round(idle/60000), count: ts.length, sessions: segs, gaps };
}

export function fmtInterval(g){
  const f=(t)=>new Date(t).toLocaleTimeString("ru",{hour:"2-digit",minute:"2-digit"});
  return f(g.start)+"–"+f(g.end);
}

export function fmtDur(min){
  if (!min || min<=0) return "0м";
  const h = Math.floor(min/60), m = min%60;
  return (h>0 ? h+"ч " : "") + m + "м";
}

export function fmtTime(ts){
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("ru",{ hour:"2-digit", minute:"2-digit" });
}
