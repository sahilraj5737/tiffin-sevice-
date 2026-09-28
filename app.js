const KEY="tiffinLedgerV1";
const today=new Date();
const iso=d=>{const x=new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`};
const monthKey=d=>{const x=new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`};
const money=n=>"₹"+Number(n||0).toLocaleString("en-IN");
let state=load();
let selectedMonth=state.settings.defaultMonth || monthKey(today);

function defaultState(){
  const daily={};
  // Previous record: dinner service began 24 Sep 2026.
  daily["2026-09-24"]="veg";
  daily["2026-09-25"]="veg";
  daily["2026-09-26"]="nonveg";
  daily["2026-09-27"]="veg";
  daily["2026-09-28"]="nonveg";
  return {
    settings:{vegPrice:60,nonVegPrice:100,defaultMonth:"2026-09"},
    daily,
    payments:[{id:"initial-1200",date:"2026-09-24",amount:1200,note:"Advance payment"}]
  };
}
function load(){try{return JSON.parse(localStorage.getItem(KEY))||defaultState()}catch(e){return defaultState()}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function price(type){return type==="nonveg"?Number(state.settings.nonVegPrice):Number(state.settings.vegPrice)}
function monthEntries(m){return Object.entries(state.daily).filter(([d])=>d.startsWith(m)).sort((a,b)=>a[0].localeCompare(b[0]))}
function monthBill(m){return monthEntries(m).reduce((s,[,t])=>s+((t==="veg"||t==="nonveg")?price(t):0),0)}
function paymentsTotal(){return state.payments.reduce((s,p)=>s+Number(p.amount||0),0)}
function fmtDate(s){return new Date(s+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}

function render(){
  const entries=monthEntries(selectedMonth);
  const bill=monthBill(selectedMonth);
  const paid=state.payments.filter(p=>p.date.startsWith(selectedMonth)).reduce((s,p)=>s+Number(p.amount||0),0);
  // For the current month, show all payments made that month.
  const bal=paid-bill;
  document.getElementById("bill").textContent=money(bill);
  document.getElementById("paid").textContent=money(paid);
  document.getElementById("balance").textContent=money(Math.abs(bal));
  document.getElementById("balanceLabel").textContent=bal>=0?"Credit / advance":"Remaining";
  document.getElementById("mealCount").textContent=entries.filter(([,t])=>t==="veg"||t==="nonveg").length;
  document.getElementById("monthPicker").value=selectedMonth;
  document.getElementById("summaryMonth").textContent=new Date(selectedMonth+"-01").toLocaleDateString("en-IN",{month:"long",year:"numeric"});
  document.getElementById("vegCount").textContent=entries.filter(([,t])=>t==="veg").length;
  document.getElementById("nonVegCount").textContent=entries.filter(([,t])=>t==="nonveg").length;
  document.getElementById("skipCount").textContent=entries.filter(([,t])=>t==="skip").length;
  document.getElementById("summaryBill").textContent=money(bill);
  document.getElementById("todayDate").textContent=fmtDate(iso(today));
  document.getElementById("paymentDate").value=iso(today);
  document.getElementById("vegPrice").value=state.settings.vegPrice;
  document.getElementById("nonVegPrice").value=state.settings.nonVegPrice;
  document.getElementById("defaultMonth").value=state.settings.defaultMonth;
  renderToday(); renderHistory(entries); renderPayments(); drawChart(entries);
}

function renderToday(){
  const t=state.daily[iso(today)];
  const label={veg:"🥗 Veg dinner",nonveg:"🍗 Non-veg dinner",skip:"✕ Dinner not taken"};
  document.getElementById("todayStatus").textContent=t?`Recorded: ${label[t]}${t==="veg"||t==="nonveg"?" · "+money(price(t)):""}`:"Not recorded yet";
}
function setToday(type){state.daily[iso(today)]=type;save();selectedMonth=monthKey(today);render()}
function renderHistory(entries){
  const box=document.getElementById("history");
  if(!entries.length){box.innerHTML='<p class="muted">No records for this month.</p>';return}
  box.innerHTML=entries.map(([d,t])=>{
    const lab=t==="veg"?"Veg":t==="nonveg"?"Non-veg":"Not taken";
    const amt=(t==="veg"||t==="nonveg")?money(price(t)):"—";
    return `<div class="history-row"><div><div class="history-date">${fmtDate(d)}</div><div class="muted">${d===iso(today)?"Today":""}</div></div><span class="tag ${t}">${lab}</span><b>${amt}</b></div>`;
  }).join("");
}
function renderPayments(){
  const list=document.getElementById("paymentList");
  const ps=state.payments.filter(p=>p.date.startsWith(selectedMonth)).sort((a,b)=>b.date.localeCompare(a.date));
  if(!ps.length){list.innerHTML='<p class="muted">No payments in this month.</p>';return}
  list.innerHTML=ps.map(p=>`<div class="payment-item"><div><b>${fmtDate(p.date)}</b><div class="muted">${escapeHtml(p.note||"Payment")}</div></div><b>${money(p.amount)}</b></div>`).join("");
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

function drawChart(entries){
  const c=document.getElementById("chart"),ctx=c.getContext("2d");
  const dpr=window.devicePixelRatio||1,w=c.clientWidth||650,h=220;
  c.width=w*dpr;c.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const days=entries.map(([d])=>d), vals=entries.map(([,t])=>(t==="veg"||t==="nonveg")?price(t):0);
  if(!days.length){ctx.fillStyle="#6b7280";ctx.font="14px system-ui";ctx.fillText("No data to chart",20,40);return}
  const max=Math.max(...vals,100), pad={l:36,r:10,t:15,b:30}, cw=w-pad.l-pad.r,ch=h-pad.t-pad.b;
  ctx.strokeStyle="#d1d5db";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,pad.t);ctx.lineTo(pad.l,h-pad.b);ctx.lineTo(w-pad.r,h-pad.b);ctx.stroke();
  const bw=Math.max(8,Math.min(34,cw/days.length*.65));
  vals.forEach((v,i)=>{const x=pad.l+(i+.5)*cw/days.length-bw/2;const bh=v/max*ch;ctx.fillStyle=v===100?"#b91c1c":"#0f766e";ctx.fillRect(x,h-pad.b-bh,bw,bh);});
  ctx.fillStyle="#6b7280";ctx.font="10px system-ui";ctx.textAlign="center";
  days.forEach((d,i)=>{if(days.length>20 && i%3!==0)return;const x=pad.l+(i+.5)*cw/days.length;ctx.fillText(new Date(d+"T00:00:00").getDate(),x,h-10)});
}

document.getElementById("vegBtn").onclick=()=>setToday("veg");
document.getElementById("nonVegBtn").onclick=()=>setToday("nonveg");
document.getElementById("skipBtn").onclick=()=>setToday("skip");
document.getElementById("monthPicker").onchange=e=>{selectedMonth=e.target.value;render()};
document.getElementById("prevMonth").onclick=()=>changeMonth(-1);
document.getElementById("nextMonth").onclick=()=>changeMonth(1);
function changeMonth(n){let d=new Date(selectedMonth+"-01T00:00:00");d.setMonth(d.getMonth()+n);selectedMonth=monthKey(d);render()}

document.getElementById("addPayment").onclick=()=>{
  const amount=Number(document.getElementById("paymentAmount").value);
  const date=document.getElementById("paymentDate").value||iso(today);
  const note=document.getElementById("paymentNote").value.trim()||"Payment";
  if(!amount||amount<1){alert("Please enter a valid payment amount.");return}
  state.payments.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),date,amount,note});
  save();document.getElementById("paymentAmount").value="";document.getElementById("paymentNote").value="";
  selectedMonth=monthKey(date);render();
};

document.getElementById("saveSettings").onclick=()=>{
  state.settings.vegPrice=Math.max(0,Number(document.getElementById("vegPrice").value));
  state.settings.nonVegPrice=Math.max(0,Number(document.getElementById("nonVegPrice").value));
  state.settings.defaultMonth=document.getElementById("defaultMonth").value||monthKey(today);
  selectedMonth=state.settings.defaultMonth;save();render();alert("Settings saved.");
};

document.getElementById("exportBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`tiffin-backup-${iso(today)}.json`;a.click();URL.revokeObjectURL(a.href);
};
document.getElementById("importFile").onchange=e=>{
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.settings||!x.daily||!x.payments)throw Error();state=x;selectedMonth=x.settings.defaultMonth||monthKey(today);save();render();alert("Backup imported successfully.")}catch(err){alert("Invalid backup file.")}};r.readAsText(f);e.target.value="";
};
document.getElementById("resetBtn").onclick=()=>{
  if(confirm("Delete all tiffin records and payments from this device?")){state=defaultState();selectedMonth=state.settings.defaultMonth;save();render()}
};

let deferredPrompt;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;document.getElementById("installBtn").classList.remove("hidden")});
document.getElementById("installBtn").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;document.getElementById("installBtn").classList.add("hidden")};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));

render();
