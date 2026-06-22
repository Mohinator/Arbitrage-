export const SUPABASE_URL = "https://hbmmbjwnnsralaehdamq.supabase.co";
export const SUPABASE_KEY = "sb_publishable_vFYq1gSco_1HRtTca4xqpw_agIuIL5T";
export const ADMIN_PASSWORD = "pwxUohct3a5Ra8GW";
export const STATUSES = ["Да", "Нет", "Отправил", "Кинул", "Вернул"];

// ─── DESIGN v3 TOKENS ────────────────────────────────────────────────────────
export const THEME = {
  // фоны
  bg:          "#080808",
  surface:     "#101010",
  surface2:    "#222222",
  // линии
  line:        "rgba(255,255,255,.08)",
  lineSoft:    "rgba(255,255,255,.05)",
  // текст
  text:        "#F0F0F2",
  text2:       "#8B8B9A",
  text3:       "#4A4A5A",
  // градиент — единственный акцент
  grad:        "linear-gradient(135deg,#F4924A 0%,#C9517A 50%,#9B5FD0 100%)",
  gradSoft:    "linear-gradient(135deg,rgba(255,144,47,.18) 0%,rgba(155,79,224,.12) 100%)",
  gradBorder:  "linear-gradient(135deg,rgba(255,144,47,.6),rgba(155,79,224,.35))",
  // семантика
  ok:          "#3DD68C",  okSoft:    "rgba(61,214,140,.13)",
  warn:        "#F4B740",  warnSoft:  "rgba(244,183,64,.13)",
  bad:         "#F2706E",  badSoft:   "rgba(242,112,110,.13)",
  purple:      "#B07BF5",
  lead:        "#A78BFA",
  orange:      "#F4924A",
  // радиусы
  rCard:       "18px",
  rCtrl:       "50px",
  rChip:       "8px",
  // шрифты
  fontGilroy:  "'Gilroy','Inter',system-ui,sans-serif",
  fontInter:   "'Inter',system-ui,sans-serif",
};

// ─── LEAD COLORS (v3) ────────────────────────────────────────────────────────
export const LEAD_COLORS = [
  { key:"none",    label:"Нет",         dot:"#4A4A5A", bg:"transparent" },
  { key:"hot",     label:"Кидок",       dot:"#F2706E", bg:"rgba(242,112,110,.06)" },
  { key:"warm",    label:"Постоянник",  dot:"#3DD68C", bg:"rgba(61,214,140,.05)" },
  { key:"cold",    label:"Не активный", dot:"#A78BFA", bg:"rgba(167,139,250,.05)" },
  { key:"problem", label:"Проблемный",  dot:"#B07BF5", bg:"rgba(176,123,245,.05)" },
];

// ─── GLOBAL CSS (v3) ─────────────────────────────────────────────────────────
export const CSS = `
/* ── CSS-переменные v3 ── */
:root{
  --bg:#080808;
  --surface:#101010;
  --surface-2:#222222;
  --line:rgba(255,255,255,.08);
  --line-soft:rgba(255,255,255,.05);
  --text:#F0F0F2;
  --text-2:#8B8B9A;
  --text-3:#4A4A5A;
  --grad:linear-gradient(135deg,#F4924A 0%,#C9517A 50%,#9B5FD0 100%);
  --grad-soft:linear-gradient(135deg,rgba(255,144,47,.18) 0%,rgba(155,79,224,.12) 100%);
  --grad-border:linear-gradient(135deg,rgba(255,144,47,.6),rgba(155,79,224,.35));
  --ok:#3DD68C;   --ok-soft:rgba(61,214,140,.13);
  --warn:#F4B740; --warn-soft:rgba(244,183,64,.13);
  --bad:#F2706E;  --bad-soft:rgba(242,112,110,.13);
  --purple:#B07BF5;
  --lead:#A78BFA;
  --orange:#F4924A;
  --r-card:18px; --r-ctrl:50px; --r-chip:8px;
  --gilroy:'Gilroy','Inter',system-ui,sans-serif;
}

/* ── базовые ── */
*{box-sizing:border-box}
body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}

/* ── анимации ── */
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}
input[type=number]{-moz-appearance:textfield;}

/* ── кнопки v3 ── */
/* primary — градиент */
.btn-p{
  background:var(--grad);
  color:#fff;border:none;border-radius:var(--r-ctrl);
  cursor:pointer;font-weight:700;font-family:var(--gilroy);
  transition:all .2s;
  box-shadow:0 4px 20px rgba(155,79,224,.3);
}
.btn-p:hover{transform:translateY(-1px);box-shadow:0 6px 28px rgba(155,79,224,.45);}

/* glass — прозрачная */
.btn-g{
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.1);
  border-radius:var(--r-ctrl);
  color:var(--text-2);
  cursor:pointer;transition:all .15s;
}
.btn-g:hover{background:rgba(255,255,255,.1);color:var(--text);border-color:rgba(255,255,255,.18);}

/* акцент (старый .btn-a — оставлен для совместимости) */
.btn-a{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;transition:all .2s;box-shadow:0 2px 8px rgba(20,184,166,.3);}
.btn-a:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(20,184,166,.5);filter:brightness(1.1);}

.btn-danger:hover{background:rgba(242,112,110,.15)!important;color:#F2706E!important;}
.nb{transition:color .15s,border-color .15s;}
.nb:hover{color:#c8a8ff!important;}
.sb{transition:all .15s;cursor:pointer;}
.sb:hover{filter:brightness(1.15);transform:scale(1.05);}

/* ── таблицы ── */
.row-hover:hover>td{background:rgba(255,255,255,.03)!important;}
.rd-cell{transition:background .15s;cursor:pointer;}
.rd-cell:hover{background:rgba(255,144,47,.08)!important;}
.rd-input{
  background:var(--surface);
  border:1.5px solid rgba(244,146,74,.5);
  color:var(--text);padding:3px 6px;border-radius:5px;
  font-size:11px;width:52px;outline:none;text-align:center;
}
.drag-handle{cursor:grab;color:#34406A;font-size:14px;padding:0 4px;transition:color .15s;user-select:none;}
.drag-handle:hover{color:var(--orange);}

/* ── тинты строк по тегу (градиент на tr, td прозрачны) ── */
tr.tag-hot{background:linear-gradient(90deg,rgba(242,112,110,.07) 0%,rgba(242,112,110,.028) 30%,transparent 65%)}
tr.tag-warm{background:linear-gradient(90deg,rgba(61,214,140,.06) 0%,rgba(61,214,140,.024) 30%,transparent 65%)}
tr.tag-cold{background:linear-gradient(90deg,rgba(167,139,250,.06) 0%,rgba(167,139,250,.024) 30%,transparent 65%)}
tr.tag-problem{background:linear-gradient(90deg,rgba(176,123,245,.07) 0%,rgba(176,123,245,.028) 30%,transparent 65%)}
tr.tag-hot td,tr.tag-warm td,tr.tag-cold td,tr.tag-problem td{background:transparent!important;}

/* ── статус-пиллы ── */
.st-yes{background:var(--ok-soft);color:var(--ok);padding:3px 10px;border-radius:var(--r-chip);font-size:11.5px;font-weight:500;}
.st-no{background:rgba(255,255,255,.06);color:var(--text-3);padding:3px 10px;border-radius:var(--r-chip);font-size:11.5px;font-weight:500;}
.st-sent{background:rgba(176,123,245,.13);color:var(--purple);padding:3px 10px;border-radius:var(--r-chip);font-size:11.5px;font-weight:500;}
.st-kick{background:var(--bad-soft);color:var(--bad);padding:3px 10px;border-radius:var(--r-chip);font-size:11.5px;font-weight:500;}
.st-back{background:var(--warn-soft);color:var(--warn);padding:3px 10px;border-radius:var(--r-chip);font-size:11.5px;font-weight:500;}

/* ── бейджи ── */
.badge-role{
  font-size:11px;font-weight:700;font-family:var(--gilroy);
  background:var(--grad-soft);color:#c8a8ff;
  padding:3px 9px;border-radius:50px;letter-spacing:.05em;
  border:1px solid rgba(155,79,224,.3);
}

/* ── glass modals (v3) ── */
.glass-overlay{
  position:fixed;inset:0;z-index:1000;
  display:flex;align-items:center;justify-content:center;padding:20px;
  background:transparent;
}
.glass-modal{
  position:relative;
  background:rgba(16,16,18,.40);
  -webkit-backdrop-filter:blur(24px) saturate(150%);
  backdrop-filter:blur(24px) saturate(150%);
  border:1px solid rgba(255,255,255,.1);
  border-radius:18px;
  box-shadow:0 24px 64px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06);
}
.glass-modal::before{
  content:'';position:absolute;inset:0;border-radius:18px;padding:1px;pointer-events:none;
  background:var(--grad-border);
  -webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude;
  opacity:.5;
}

/* ── сайдбар-тултип (мгновенный) ── */
.sb-tip{position:relative;}
.sb-tip::after{
  content:attr(data-tip);
  position:absolute;left:calc(100% + 10px);top:50%;transform:translateY(-50%);
  background:var(--surface);color:var(--text);
  font-family:var(--gilroy);font-size:12px;font-weight:600;white-space:nowrap;
  padding:5px 10px;border-radius:8px;border:1px solid var(--line);
  box-shadow:0 8px 24px rgba(0,0,0,.5);
  opacity:0;pointer-events:none;z-index:600;
  transition:opacity .08s ease;
}
.sb-tip:hover::after{opacity:1;}

/* ── утилиты ── */
.alert-pulse{animation:pulse 2s infinite;}
.progress-bar{transition:width .8s cubic-bezier(.4,0,.2,1);}
.fade-in{animation:fadeIn .2s ease;}
.slide-in{animation:slideIn .2s ease;}
.row-hover:hover .del-btn{opacity:1!important;color:var(--bad)!important;}
.gilroy{font-family:var(--gilroy);}
.mono{font-family:var(--gilroy);font-variant-numeric:tabular-nums;letter-spacing:-.01em;}

/* ── geo-tab (оставлен для совместимости, стиль обновлён) ── */
.geo-tab{transition:all .15s;border-bottom:2px solid transparent;padding:10px 16px;cursor:pointer;font-size:13px;font-weight:600;border:none;background:transparent;color:var(--text-3);}
.geo-tab.active{border-bottom-color:var(--orange);color:var(--text);}

@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;
