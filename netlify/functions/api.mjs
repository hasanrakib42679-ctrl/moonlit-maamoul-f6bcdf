import { getStore } from "@netlify/blobs";

const store = getStore("as-anamul-keys");
const PASSWORD = process.env.ADMIN_PASSWORD || "ANAMUL";
const DEFAULT_LINK = process.env.DEFAULT_GET_KEY_LINK || "https://adsfly.in/uhCA";

const headers = {
  "content-type":"application/json; charset=utf-8",
  "cache-control":"no-store",
  "access-control-allow-origin":"*",
  "access-control-allow-methods":"GET,POST,OPTIONS",
  "access-control-allow-headers":"content-type,x-admin-password"
};

const json=(status,data)=>new Response(JSON.stringify(data),{status,headers});

async function readBody(req){try{return await req.json()}catch{return {}}}
async function getState(){
  return await store.get("state",{type:"json"}) || {
    current:null,
    shortLink:DEFAULT_LINK
  };
}
async function saveState(s){await store.setJSON("state",s)}
function isAdmin(body,req){
  return (body.password===PASSWORD) ||
    (req.headers.get("x-admin-password")||"")===PASSWORD;
}
function makeKey(){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s="AS_";
  for(let i=0;i<20;i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}
function msFor(amount,unit){
  const n=Math.max(1,Math.floor(Number(amount)||1));
  return n*({minutes:60000,hours:3600000,days:86400000}[unit]||60000);
}

export default async function handler(req){
  if(req.method==="OPTIONS") return new Response("",{status:204,headers});
  try{
    const url=new URL(req.url);
    const action=url.searchParams.get("action")||"status";
    const body=await readBody(req);
    let state=await getState();

    // Public endpoints
    if(action==="status"){
      const c=state.current;
      const active=!!c && !c.revoked && new Date(c.expiresAt).getTime()>Date.now();
      return json(200,{
        ok:true,
        active,
        shortLink:state.shortLink||DEFAULT_LINK,
        expiresAt:active?c.expiresAt:null
      });
    }

    if(action==="validate"){
      const key=String(body.key||"").trim().toUpperCase();
      const c=state.current;
      if(!c) return json(200,{ok:false,valid:false,message:"No active key."});
      if(c.revoked) return json(200,{ok:false,valid:false,message:"Key has been reset/revoked."});
      if(c.key!==key) return json(200,{ok:false,valid:false,message:"Invalid key."});
      const left=new Date(c.expiresAt).getTime()-Date.now();
      if(left<=0){
        c.revoked=true;c.expiredAt=new Date().toISOString();state.current=c;await saveState(state);
        return json(200,{ok:false,valid:false,message:"Key expired."});
      }
      return json(200,{ok:true,valid:true,message:"ACCESS GRANTED — LIVE SERVER",key:c.key,expiresAt:c.expiresAt,remainingMs:left});
    }

    // Admin-only endpoints
    if(!isAdmin(body,req)) return json(401,{ok:false,message:"Unauthorized"});

    if(action==="adminStatus"){
      const c=state.current;
      const active=!!c && !c.revoked && new Date(c.expiresAt).getTime()>Date.now();
      return json(200,{ok:true,current:c||null,active,shortLink:state.shortLink||DEFAULT_LINK});
    }

    if(action==="generate"){
      const amount=Math.max(1,Math.floor(Number(body.amount)||1));
      const unit=["minutes","hours","days"].includes(body.unit)?body.unit:"minutes";
      const now=Date.now();
      if(state.current){
        state.current.revoked=true;
        state.current.revokedAt=new Date().toISOString();
      }
      const rec={
        key:makeKey(),
        createdAt:new Date(now).toISOString(),
        expiresAt:new Date(now+msFor(amount,unit)).toISOString(),
        revoked:false
      };
      state.current=rec;
      await saveState(state);
      return json(200,{ok:true,key:rec.key,expiresAt:rec.expiresAt,shortLink:state.shortLink||DEFAULT_LINK});
    }

    if(action==="reset"){
      if(state.current){
        state.current.revoked=true;
        state.current.revokedAt=new Date().toISOString();
        state.current=null;
      }
      await saveState(state);
      return json(200,{ok:true,message:"CURRENT KEY RESET / REVOKED"});
    }

    if(action==="setShortLink"){
      const link=String(body.url??body.shortLink??"").trim();
      if(!/^https?:\/\//i.test(link)) return json(400,{ok:false,message:"Use a valid http/https short link."});
      state.shortLink=link;
      await saveState(state);
      return json(200,{ok:true,url:link,shortLink:link});
    }

    return json(404,{ok:false,message:"Unknown action"});
  }catch(e){
    return json(500,{ok:false,message:e?.message||"Server error"});
  }
}
