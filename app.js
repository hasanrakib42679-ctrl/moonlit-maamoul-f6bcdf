const $=id=>document.getElementById(id);
let timer=null, sessionKey=null;
function msg(t,ok=false){$("msg").textContent=t;$("msg").className="msg "+(ok?"ok":"bad")}

async function api(action,body=null){
  const opt=body?{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}:{method:"GET"};
  const r=await fetch("/.netlify/functions/api?action="+encodeURIComponent(action),opt);
  const text=await r.text(); let d;
  try{d=JSON.parse(text)}catch{throw new Error("User API is not deployed correctly ("+r.status+")")}
  if(!r.ok)throw new Error(d.message||"Server error");
  return d;
}

$("paste").onclick=async()=>{
  try{$("key").value=await navigator.clipboard.readText();msg("Key pasted.",true)}
  catch{msg("Clipboard permission denied. Paste manually.")}
};

$("getKey").onclick=async()=>{
  const b=$("getKey"),old=b.textContent;b.disabled=true;b.textContent="OPENING…";
  try{
    const d=await api("status");
    if(!d.shortLink)throw new Error("GET KEY link is not set yet.");
    window.location.href=d.shortLink;
  }catch(e){msg(e.message);b.disabled=false;b.textContent=old}
};

$("telegram").onclick=()=>window.open("https://t.me/asanamulcoding","_blank","noopener,noreferrer");

function startCountdown(expiresAt){
  clearInterval(timer);
  const end=new Date(expiresAt).getTime();
  $("access").classList.remove("hidden");
  function tick(){
    let left=end-Date.now();
    if(left<=0){
      clearInterval(timer);$("countdown").textContent="00:00:00";msg("KEY EXPIRED — ACCESS REMOVED");
      sessionKey=null;return;
    }
    let s=Math.floor(left/1000),d=Math.floor(s/86400);s%=86400;
    const h=Math.floor(s/3600);s%=3600;const m=Math.floor(s/60);s%=60;
    $("countdown").textContent=(d?String(d).padStart(2,"0")+"d ":"")+[h,m,s].map(x=>String(x).padStart(2,"0")).join(":");
    $("expiryText").textContent="Expires: "+new Date(end).toLocaleString();
  }
  tick();timer=setInterval(tick,1000);
}

async function validate(){
  const key=$("key").value.trim();
  if(!key)return msg("Please paste your key first.");
  msg("Checking live server…",true);
  try{
    const d=await api("validate",{key});
    if(!d.valid){
      clearInterval(timer);$("access").classList.add("hidden");sessionKey=null;
      return msg(d.message||"Invalid or expired key.");
    }
    sessionKey=d.key;msg(d.message||"ACCESS GRANTED — LIVE SERVER",true);startCountdown(d.expiresAt);
  }catch(e){msg(e.message)}
}
$("validate").onclick=validate;
$("key").addEventListener("keydown",e=>{if(e.key==="Enter")validate()});

setInterval(async()=>{
  if(!sessionKey)return;
  try{
    const d=await api("validate",{key:sessionKey});
    if(!d.valid){
      clearInterval(timer);sessionKey=null;$("access").classList.add("hidden");
      msg("KEY RESET/EXPIRED — ACCESS REMOVED");
    }
  }catch{}
},5000);
