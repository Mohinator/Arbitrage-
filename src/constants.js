export const SUPABASE_URL = "https://hbmmbjwnnsralaehdamq.supabase.co";
export const SUPABASE_KEY = "sb_publishable_vFYq1gSco_1HRtTca4xqpw_agIuIL5T";
export const ADMIN_PASSWORD = "pwxUohct3a5Ra8GW";
export const STATUSES = ["Да", "Нет", "Отправил", "Кинул", "Вернул"];
export const LEAD_COLORS = [
  { key:"none", label:"Нет", dot:"#475569" },
  { key:"hot", label:"Кидок", dot:"#ef4444", bg:"rgba(239,68,68,.06)" },
  { key:"warm", label:"Постоянник", dot:"#22c55e", bg:"rgba(34,197,94,.06)" },
  { key:"cold", label:"Не активный", dot:"#6366f1", bg:"rgba(99,102,241,.06)" },
  { key:"problem", label:"Проблемный", dot:"#a855f7", bg:"rgba(168,85,247,.06)" },
];

export const CSS = `
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}
input[type=number]{-moz-appearance:textfield;}
.btn-p{background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;transition:all .2s;box-shadow:0 2px 8px rgba(99,102,241,.3);}
.btn-p:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(99,102,241,.5);filter:brightness(1.1);}
.btn-a{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;transition:all .2s;box-shadow:0 2px 8px rgba(20,184,166,.3);}
.btn-a:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(20,184,166,.5);filter:brightness(1.1);}
.btn-g{background:transparent;transition:all .15s;border-radius:8px;}
.btn-g:hover{background:rgba(99,102,241,.08);}
.btn-danger:hover{background:rgba(239,68,68,.15)!important;color:#f87171!important;}
.nb{transition:color .15s,border-color .15s;}
.nb:hover{color:#a5b4fc!important;}
.sb{transition:all .15s;cursor:pointer;}
.sb:hover{filter:brightness(1.15);transform:scale(1.05);}
.row-hover:hover>td{background:rgba(99,102,241,.03)!important;}
.rd-cell{transition:background .15s;cursor:pointer;}
.rd-cell:hover{background:rgba(99,102,241,.08)!important;}
.rd-input{background:#0f1117;border:1.5px solid #6366f1;color:#e2e8f0;padding:3px 6px;border-radius:5px;font-size:11px;width:52px;outline:none;text-align:center;}
.drag-handle{cursor:grab;color:#3d4268;font-size:14px;padding:0 4px;transition:color .15s;user-select:none;}
.drag-handle:hover{color:#6366f1;}
.alert-pulse{animation:pulse 2s infinite;}
.progress-bar{transition:width .8s cubic-bezier(.4,0,.2,1);}
.fade-in{animation:fadeIn .2s ease;}
.slide-in{animation:slideIn .2s ease;}
.row-hover:hover .del-btn{opacity:1!important;color:#ef4444!important;}
.geo-tab{transition:all .15s;border-bottom:2px solid transparent;padding:10px 16px;cursor:pointer;font-size:13px;font-weight:600;border:none;background:transparent;}
.geo-tab.active{border-bottom-color:#6366f1;color:#6366f1;}
`;
