import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

// ─── Cloudinary ───────────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD  = "digrxz7uv";
const CLOUDINARY_PRESET = "bpi_tracker";

async function uploadToCloudinary(file, folder) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_PRESET);
  fd.append("folder", `bpi-tracker/${folder}`);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method:"POST", body:fd });
  if (!res.ok) throw new Error("Upload failed " + res.status);
  return (await res.json()).secure_url;
}

// ─── Firebase ────────────────────────────────────────────────────────────────
const _app = initializeApp({
  apiKey: "AIzaSyDzg3HPJasesSozO7CXFlNBIQ-9n7n3ZN4",
  authDomain: "bpi-tracker-e0dab.firebaseapp.com",
  projectId: "bpi-tracker-e0dab",
  storageBucket: "bpi-tracker-e0dab.firebasestorage.app",
  messagingSenderId: "798502862536",
  appId: "1:798502862536:web:ff49a69f54b5f4b3e9effd"
});
const _db = getFirestore(_app);
window.storage = {
  get:    async k => { const s=await getDoc(doc(_db,"bpi",k)); if(!s.exists()) throw new Error("Not found"); return {key:k,value:s.data().value}; },
  set:    async (k,v) => { await setDoc(doc(_db,"bpi",k),{value:v,updatedAt:Date.now()}); return {key:k,value:v}; },
  delete: async k => { await deleteDoc(doc(_db,"bpi",k)); return {key:k,deleted:true}; },
};

// ─── Constants ────────────────────────────────────────────────────────────────
const API_KEY    = import.meta.env.VITE_ANTHROPIC_API_KEY;
const SAMPLE_KEY = "bpi-sample-active-v4";
const TRUCK_KEY  = "bpi-truck-active-v4";
const LOG_KEY    = "bpi-log-v4";
const POLL_MS    = 3000;

const SAMPLE_STAGES = [
  { id:"collected",   label:"Collected",    sub:"Ticket scanned at mine",   color:"#FF9F0A" },
  { id:"stock",       label:"At Stock",      sub:"Delivered to stockyard",   color:"#30D158" },
  { id:"preparation", label:"Preparation",   sub:"Sample being prepared",    color:"#0A84FF" },
  { id:"lab",         label:"At Lab",        sub:"Sent to laboratory",       color:"#BF5AF2" },
];
const TRUCK_STAGES = [
  { id:"loaded",   label:"Loaded",   sub:"Ticket scanned at mine",   color:"#FF9F0A" },
  { id:"unloaded", label:"Unloaded", sub:"Weights logged in Agadir", color:"#30D158" },
];

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmt = iso => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
};
const fmtCoords = (lat,lng) =>
  lat&&lng ? `${Math.abs(lat).toFixed(4)}°${lat>=0?"N":"S"}  ${Math.abs(lng).toFixed(4)}°${lng>=0?"E":"W"}` : null;

async function claudeScan(b64, mime, ctx) {
  const prompt = ctx==="sample"
    ? `BPI Agadir sample ticket. Extract ALL fields. ONLY JSON:\n{"ticketNo":"","date":"","supplier":"","mineReference":"","tonnage":"","collectionPoint":"","notes":""}`
    : `BPI Agadir Bon de Transport. Extract ALL fields. ONLY JSON:\n{"ticketNo":"","date":"","lieuChargement":"","lieuLivraison":"","marchandise":"","transporteur":"","immatriculation":"","heureDepart":"","fournisseur":"","mineReference":"","qualiteProduit":"","poidsBrut":"","poidsTare":"","poidsNet":"","responsableStock":"","numeroChauffeur":"","societe":""}`;
  const r = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:mime||"image/jpeg",data:b64}},{type:"text",text:prompt}]}]})
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return JSON.parse(d.content.map(c=>c.text||"").join("").trim().replace(/```json|```/g,"").trim());
}
async function fileToB64(f) {
  return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(f);});
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg0:"#000",bg1:"#1C1C1E",bg2:"#2C2C2E",bg3:"#3A3A3C",
  sep:"rgba(255,255,255,0.08)",
  t1:"#fff",t2:"rgba(255,255,255,0.55)",t3:"rgba(255,255,255,0.25)",
  blue:"#0A84FF",green:"#30D158",orange:"#FF9F0A",
  red:"#FF453A",purple:"#BF5AF2",
};

// ─── Global CSS ───────────────────────────────────────────────────────────────
function GlobalStyle() {
  return (
    <style>{`
      *,*::before,*::after{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
      html,body{margin:0;padding:0;background:#000;overscroll-behavior:none}
      body{font-family:-apple-system,"SF Pro Display","SF Pro Text",BlinkMacSystemFont,sans-serif;color:#fff}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      @keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
      ::-webkit-scrollbar{width:0}
      input{-webkit-appearance:none}
      button{cursor:pointer}
      button:active{transform:scale(0.97)!important}
      .ios-input{
        width:100%;box-sizing:border-box;
        padding:11px 14px;
        background:rgba(255,255,255,0.07);
        border:1px solid rgba(255,255,255,0.1);
        border-radius:10px;color:#fff;
        font-family:inherit;font-size:15px;
        outline:none;transition:border-color 0.15s,background 0.15s
      }
      .ios-input:focus{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.35)}
      .ios-input::placeholder{color:rgba(255,255,255,0.3)}
      .fade{animation:fadeIn 0.3s ease forwards}
    `}</style>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────
function Spinner({size=20,color=C.t3}) {
  return <div style={{width:size,height:size,border:`2px solid ${color}33`,borderTopColor:color,borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0}}/>;
}

function Card({children,style={}}) {
  return <div style={{background:C.bg1,borderRadius:16,overflow:"hidden",marginBottom:8,...style}}>{children}</div>;
}

function Sep() { return <div style={{height:1,background:C.sep}}/>; }

function Row({label,value,color,last,icon}) {
  return (
    <div style={{display:"flex",alignItems:"center",padding:"12px 16px",borderBottom:last?"none":`1px solid ${C.sep}`,gap:12}}>
      {icon && <span style={{fontSize:16,flexShrink:0}}>{icon}</span>}
      <span style={{fontSize:15,color:C.t2,flex:1,letterSpacing:"-0.01em"}}>{label}</span>
      <span style={{fontSize:15,color:color||C.t1,fontWeight:500,textAlign:"right",maxWidth:"55%",wordBreak:"break-word"}}>{value||"—"}</span>
    </div>
  );
}

function SectionLabel({text}) {
  return <div style={{fontSize:13,fontWeight:600,color:C.t3,letterSpacing:"0.06em",padding:"20px 16px 8px",textTransform:"uppercase"}}>{text}</div>;
}

function PrimaryBtn({label,onPress,color=C.blue,disabled,loading,icon}) {
  return (
    <button onClick={onPress} disabled={disabled||loading}
      style={{width:"100%",padding:"16px",background:disabled?C.bg3:color,color:disabled?C.t3:"#fff",
        border:"none",borderRadius:14,fontSize:17,fontWeight:600,letterSpacing:"-0.01em",
        display:"flex",alignItems:"center",justifyContent:"center",gap:10,
        opacity:disabled?0.4:1,fontFamily:"inherit",transition:"opacity 0.15s"}}>
      {loading?<Spinner size={20} color="#fff"/>:icon&&<span style={{fontSize:19}}>{icon}</span>}
      {label}
    </button>
  );
}

function GhostBtn({label,onPress,color=C.blue}) {
  return (
    <button onClick={onPress}
      style={{background:"none",border:"none",color,fontSize:17,fontWeight:500,
        padding:"12px 16px",width:"100%",textAlign:"center",fontFamily:"inherit"}}>
      {label}
    </button>
  );
}

function Pill({label,color}) {
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:6,background:`${color}20`,borderRadius:20,padding:"5px 12px"}}>
      <div style={{width:6,height:6,borderRadius:"50%",background:color,animation:"pulse 2s infinite"}}/>
      <span style={{fontSize:12,fontWeight:600,color,letterSpacing:"0.04em"}}>{label}</span>
    </div>
  );
}

// ─── Map ──────────────────────────────────────────────────────────────────────
function MapEmbed({lat,lng}) {
  const [open,setOpen] = useState(false);
  const url = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.02},${lat-0.015},${lng+0.02},${lat+0.015}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <div style={{borderRadius:12,overflow:"hidden",border:`1px solid ${C.sep}`,marginTop:12}}>
      <div onClick={()=>setOpen(v=>!v)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:C.bg2,cursor:"pointer"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span>📍</span>
          <span style={{fontSize:14,color:C.t2}}>{fmtCoords(lat,lng)}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <a href={`https://maps.apple.com/?ll=${lat},${lng}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:13,color:C.blue,textDecoration:"none"}}>Open in Maps</a>
          <span style={{color:C.t3,fontSize:12}}>{open?"▲":"▼"}</span>
        </div>
      </div>
      {open && <div style={{height:180}}><iframe src={url} style={{width:"100%",height:"100%",border:"none",filter:"invert(90%) hue-rotate(180deg) saturate(0.5)"}} title="map" loading="lazy"/></div>}
    </div>
  );
}

// ─── Scan Panel ───────────────────────────────────────────────────────────────
function ScanPanel({context,onScanned,existingData={},onManual}) {
  const [phase,setPhase]     = useState("idle");
  const [msg,setMsg]         = useState("");
  const [preview,setPreview] = useState(null);
  const [extracted,setExtracted] = useState(null);
  const [edited,setEdited]   = useState({});
  const [geo,setGeo]         = useState(null);
  const [geoMsg,setGeoMsg]   = useState("");
  const [saving,setSaving]   = useState(false);
  const camRef    = useRef(null);
  const uploadRef = useRef(null);

  const SFIELDS=[["ticketNo","Ticket No"],["date","Date"],["supplier","Supplier"],["mineReference","Mine Ref"],["tonnage","Tonnage"],["collectionPoint","Collection Point"],["notes","Notes"]];
  const TFIELDS=[["ticketNo","N° Ticket"],["date","Date"],["lieuChargement","Lieu chargement"],["lieuLivraison","Lieu livraison"],["marchandise","Marchandise"],["transporteur","Transporteur"],["immatriculation","Immatriculation"],["heureDepart","Heure départ"],["fournisseur","Fournisseur"],["mineReference","Mine Ref"],["qualiteProduit","Qualité"],["responsableStock","Responsable"],["numeroChauffeur","N° Chauffeur"],["societe","Société"]];
  const WFIELDS = ["poidsBrut","poidsTare","poidsNet"];
  const fields = context==="sample"?SFIELDS:TFIELDS;

  function reset(){setPhase("idle");setPreview(null);setExtracted(null);setEdited({});setGeo(null);setGeoMsg("");setSaving(false);}

  function captureGps() {
    if(!navigator.geolocation){setGeoMsg("GPS unavailable");return;}
    setGeoMsg("Acquiring GPS…");
    navigator.geolocation.getCurrentPosition(
      p=>{const g={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:Math.round(p.coords.accuracy)};setGeo(g);setGeoMsg(`${fmtCoords(g.lat,g.lng)} · ±${g.accuracy}m`);},
      ()=>setGeoMsg("Location denied"),
      {enableHighAccuracy:true,timeout:12000}
    );
  }

  async function handle(file) {
    if(!file) return;
    const fr=new FileReader();fr.onload=e=>setPreview(e.target.result);fr.readAsDataURL(file);
    setPhase("scanning");setMsg("Reading ticket…");captureGps();
    const folder=context==="sample"?"sample-tickets":"truck-tickets";
    const photoP=uploadToCloudinary(file,folder).catch(()=>null);
    try {
      const b64=await fileToB64(file);
      const result=await claudeScan(b64,file.type,context);
      const photo=await photoP;
      setExtracted(result);
      setEdited({...existingData,...result,...(photo?{_photoUrl:photo}:{})});
      setPhase("done");setMsg("Ticket read successfully");
    } catch(err) {
      setPhase("error");
      setMsg(!API_KEY?"API key not configured — enter fields manually":err.message);
      setEdited({...existingData});
    }
  }

  async function confirm() {
    const filled=Object.keys(edited).filter(k=>edited[k]&&!k.startsWith("_"));
    if(!filled.length){alert("Fill in at least one field.");return;}
    setSaving(true);
    try { await onScanned({...edited,_scanned:true,_geo:geo||null}); }
    catch(e){ alert("Error saving: "+(e.message||String(e))); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={e=>{reset();setTimeout(()=>handle(e.target.files[0]),50);}} style={{display:"none"}}/>
      <input ref={uploadRef} type="file" accept="image/*" onChange={e=>{reset();setTimeout(()=>handle(e.target.files[0]),50);}} style={{display:"none"}}/>

      {phase==="idle" && (
        <div className="fade">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <button onClick={()=>{reset();camRef.current?.click();}}
              style={{padding:"22px 12px",background:C.blue,border:"none",borderRadius:14,color:"#fff",fontSize:16,fontWeight:600,display:"flex",flexDirection:"column",alignItems:"center",gap:8,fontFamily:"inherit"}}>
              <span style={{fontSize:28}}>📷</span>Take Photo
            </button>
            <button onClick={()=>{reset();uploadRef.current?.click();}}
              style={{padding:"22px 12px",background:C.bg2,border:`1px solid ${C.sep}`,borderRadius:14,color:C.t1,fontSize:16,fontWeight:600,display:"flex",flexDirection:"column",alignItems:"center",gap:8,fontFamily:"inherit"}}>
              <span style={{fontSize:28}}>🖼</span>Upload
            </button>
          </div>
          {onManual && <GhostBtn label="Enter manually instead" onPress={onManual} color={C.blue}/>}
        </div>
      )}

      {preview && (
        <div style={{borderRadius:14,overflow:"hidden",marginBottom:12,position:"relative"}}>
          <img src={preview} alt="ticket" style={{width:"100%",maxHeight:200,objectFit:"cover",display:"block"}}/>
          <button onClick={reset} style={{position:"absolute",top:10,right:10,background:"rgba(0,0,0,0.7)",border:"none",borderRadius:8,color:"#fff",width:32,height:32,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
      )}

      {phase==="scanning" && (
        <Card style={{marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:14,padding:"18px 16px"}}>
            <Spinner size={22} color={C.blue}/>
            <div>
              <div style={{fontSize:15,fontWeight:600,marginBottom:2}}>{msg}</div>
              {geoMsg && <div style={{fontSize:13,color:C.t2}}>{geoMsg}</div>}
            </div>
          </div>
        </Card>
      )}

      {phase==="error" && (
        <Card style={{marginBottom:12}}>
          <div style={{padding:"14px 16px",display:"flex",gap:12}}>
            <span style={{fontSize:20}}>⚠️</span>
            <span style={{fontSize:14,color:C.t2,lineHeight:1.5}}>{msg}</span>
          </div>
        </Card>
      )}

      {(phase==="done"||phase==="error") && geoMsg && (
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 4px",marginBottom:8}}>
          <span style={{fontSize:13}}>📍</span>
          <span style={{fontSize:13,color:geo?C.green:C.t3}}>{geoMsg}</span>
        </div>
      )}

      {(phase==="done"||phase==="error") && (
        <div className="fade">
          {phase==="done" && (
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 4px",marginBottom:12}}>
              <Pill label="Read" color={C.green}/>
              <span style={{fontSize:14,color:C.t2}}>Review and confirm fields</span>
            </div>
          )}

          {context==="truck" && (
            <>
              <SectionLabel text="Weights"/>
              <Card style={{marginBottom:8}}>
                {["poidsBrut","poidsTare","poidsNet"].map((k,i)=>(
                  <div key={k} style={{padding:"10px 16px",borderBottom:i<2?`1px solid ${C.sep}`:"none"}}>
                    <div style={{fontSize:12,color:C.t2,marginBottom:5}}>{["Poids brut","Poids tare","Poids net"][i]}</div>
                    <input className="ios-input" value={edited[k]||""} onChange={e=>setEdited(p=>({...p,[k]:e.target.value}))} placeholder="e.g. 32 T"/>
                  </div>
                ))}
              </Card>
            </>
          )}

          <SectionLabel text="Ticket Fields"/>
          <Card style={{marginBottom:16}}>
            {fields.filter(([k])=>!WFIELDS.includes(k)).map(([k,l],i,arr)=>{
              const changed=extracted?.[k]&&extracted[k]!==existingData?.[k];
              return (
                <div key={k} style={{padding:"10px 16px",borderBottom:i<arr.length-1?`1px solid ${C.sep}`:"none"}}>
                  <div style={{fontSize:12,color:changed?C.orange:C.t2,marginBottom:5,fontWeight:changed?600:400}}>{l}</div>
                  <input className="ios-input" value={edited[k]||""} onChange={e=>setEdited(p=>({...p,[k]:e.target.value}))} placeholder={l} style={{borderColor:changed?`${C.orange}50`:undefined}}/>
                </div>
              );
            })}
          </Card>

          <PrimaryBtn label={saving?"Saving…":"Confirm & Log"} onPress={confirm} loading={saving} color={C.green}/>
        </div>
      )}
    </div>
  );
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────
function Pipeline({stages,currentIndex,history,children}) {
  return (
    <div style={{padding:"0 16px"}}>
      {stages.map((stage,i)=>{
        const done=i<currentIndex, cur=i===currentIndex, pend=i>currentIndex;
        return (
          <div key={stage.id} style={{display:"flex",gap:16,opacity:pend?0.35:1,transition:"opacity 0.4s"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:36,flexShrink:0}}>
              <div style={{width:36,height:36,borderRadius:12,background:cur?stage.color:done?`${stage.color}25`:C.bg2,border:`1.5px solid ${done||cur?stage.color:C.bg3}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:cur?"#000":done?stage.color:C.t3,fontWeight:700,flexShrink:0,boxShadow:cur?`0 0 18px ${stage.color}55`:"none",transition:"all 0.3s"}}>
                {done?"✓":i+1}
              </div>
              {i<stages.length-1 && <div style={{width:2,flex:1,minHeight:20,background:done?stage.color:C.bg3,borderRadius:1,margin:"6px 0",transition:"background 0.4s"}}/>}
            </div>
            <div style={{flex:1,paddingBottom:i<stages.length-1?20:0,paddingTop:4}}>
              <div style={{padding:cur?"14px 16px":"2px 0",background:cur?`${stage.color}10`:"transparent",border:cur?`1px solid ${stage.color}30`:"1px solid transparent",borderRadius:cur?14:0,transition:"all 0.3s"}}>
                <div style={{fontSize:16,fontWeight:600,color:cur?stage.color:done?C.t1:C.t3,marginBottom:3,display:"flex",alignItems:"center",gap:10}}>
                  {stage.label}
                  {cur && <Pill label="NOW" color={stage.color}/>}
                </div>
                <div style={{fontSize:13,color:C.t2}}>{history?.[stage.id]?fmt(history[stage.id]):stage.sub}</div>
                {children?.(stage,i,cur,done)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Hero Card ────────────────────────────────────────────────────────────────
function HeroCard({type,ticket,stage,stages,geo,onClear}) {
  const s=stages.find(x=>x.id===stage);
  const truck=type==="truck";
  return (
    <div style={{borderRadius:20,background:`linear-gradient(145deg,${C.bg1} 0%,#0A0A0A 100%)`,border:`1px solid ${s?.color}30`,padding:"20px",position:"relative",overflow:"hidden",marginBottom:8}}>
      <div style={{position:"absolute",top:-50,right:-50,width:160,height:160,borderRadius:"50%",background:`${s?.color}12`,filter:"blur(40px)",pointerEvents:"none"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,position:"relative"}}>
        <div>
          <div style={{fontSize:12,color:C.t2,letterSpacing:"0.1em",fontWeight:600,marginBottom:6}}>{truck?"🚛 ACTIVE TRUCK":"🧪 ACTIVE SAMPLE"}</div>
          <div style={{fontSize:26,fontWeight:700,letterSpacing:"-0.03em",lineHeight:1}}>{ticket?.ticketNo||"—"}</div>
          <div style={{fontSize:15,color:C.t2,marginTop:6}}>{truck?`${ticket?.immatriculation||"—"} · ${ticket?.fournisseur||"—"}`:`${ticket?.supplier||"—"} · ${ticket?.mineReference||"—"}`}</div>
        </div>
        <button onClick={onClear} style={{background:C.bg3,border:"none",borderRadius:8,color:C.t2,padding:"8px 12px",fontSize:13,fontWeight:600,fontFamily:"inherit"}}>Clear</button>
      </div>
      <Pill label={s?.label} color={s?.color}/>
      {truck && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:16}}>
          {[["poidsBrut","Brut"],["poidsTare","Tare"],["poidsNet","Net"]].map(([k,l])=>{
            const v=ticket?.[k],ok=v&&v!=="TBD";
            return <div key={k} style={{background:C.bg2,borderRadius:12,padding:"12px"}}><div style={{fontSize:11,color:C.t3,letterSpacing:"0.08em",marginBottom:6}}>{l.toUpperCase()}</div><div style={{fontSize:18,fontWeight:700,color:ok?C.green:C.bg3}}>{v||"—"}</div></div>;
          })}
        </div>
      )}
      {geo && <MapEmbed lat={geo.lat} lng={geo.lng}/>}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({msg,onClose}) {
  if(!msg) return null;
  return (
    <div style={{position:"fixed",bottom:90,left:16,right:16,zIndex:9999,background:"rgba(28,28,30,0.96)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:16,padding:"14px 18px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 8px 32px rgba(0,0,0,0.6)",animation:"slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)"}}>
      <span style={{flex:1,fontSize:14,color:C.t1,lineHeight:1.5,letterSpacing:"-0.01em"}}>{msg}</span>
      <button onClick={onClose} style={{background:"none",border:"none",color:C.t3,fontSize:20,padding:4,lineHeight:1}}>×</button>
    </div>
  );
}

// ─── Sample Module ────────────────────────────────────────────────────────────
function SampleModule({notify,addLog}) {
  const [data,setData]       = useState(null);
  const [loading,setLoading] = useState(true);
  const [manual,setManual]   = useState(false);
  const [form,setForm]       = useState({});
  const lastRef=useRef(null), pollRef=useRef(null);

  async function load(notif=true) {
    try {
      const r=await window.storage.get(SAMPLE_KEY);
      if(r){const d=JSON.parse(r.value);setData(d);
        if(notif&&lastRef.current!==null&&lastRef.current!==d.currentStage){const s=SAMPLE_STAGES.find(x=>x.id===d.currentStage);notify(`🧪 ${d.ticket?.ticketNo||""} → ${s?.label}`);}
        lastRef.current=d.currentStage;
      } else setData(null);
    } catch{setData(null);}
    setLoading(false);
  }
  useEffect(()=>{load(false);pollRef.current=setInterval(()=>load(true),POLL_MS);return()=>clearInterval(pollRef.current);},[]);

  const makeLabel=t=>`SAMPLE: ${t.ticketNo||"—"} / ${t.supplier||"—"} / ${t.mineReference||"—"} / ${t.tonnage||"TBD"}`;

  async function register(raw) {
    const{_scanned,_geo,...ticket}=raw;
    const geo=_geo||null;
    const entry={ticket,currentStage:"collected",history:{collected:new Date().toISOString()},geo};
    await window.storage.set(SAMPLE_KEY,JSON.stringify(entry));
    addLog({id:`S-${Date.now()}`,type:"sample",label:makeLabel(ticket),ticket,stageHistory:[{stage:"collected",label:"Collected",ts:new Date().toISOString()}],geo});
    setData(entry);lastRef.current="collected";setForm({});setManual(false);
    notify(`✓ ${makeLabel(ticket)}`);
  }

  async function advance(stageId,updatedTicket=null) {
    const stage=SAMPLE_STAGES.find(s=>s.id===stageId);
    const t=updatedTicket||data.ticket;
    const updated={...data,ticket:t,currentStage:stageId,history:{...data.history,[stageId]:new Date().toISOString()}};
    await window.storage.set(SAMPLE_KEY,JSON.stringify(updated));
    addLog({id:`S-${Date.now()}`,type:"sample",label:makeLabel(t),ticket:t,stageHistory:[{stage:stageId,label:stage.label,ts:new Date().toISOString()}],geo:data.geo||null});
    setData(updated);lastRef.current=stageId;notify(`🧪 ${t.ticketNo||""} → ${stage.label}`);
  }

  async function clear(){await window.storage.delete(SAMPLE_KEY);setData(null);lastRef.current=null;}

  const ci=data?SAMPLE_STAGES.findIndex(s=>s.id===data.currentStage):-1;
  const SFIELDS=[["ticketNo","Ticket No"],["date","Date"],["supplier","Supplier"],["mineReference","Mine Ref"],["tonnage","Tonnage"],["collectionPoint","Collection Point"],["notes","Notes"]];

  if(loading) return <div style={{padding:"60px",textAlign:"center"}}><Spinner size={28} color={C.t3}/></div>;

  return (
    <div style={{padding:"8px 16px 40px"}} className="fade">
      {!data && (!manual
        ? <ScanPanel context="sample" onScanned={register} onManual={()=>setManual(true)}/>
        : <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <span style={{fontSize:17,fontWeight:600}}>Manual Entry</span>
              <button onClick={()=>setManual(false)} style={{background:"none",border:"none",color:C.blue,fontSize:15,fontFamily:"inherit"}}>← Scan</button>
            </div>
            <Card>{SFIELDS.map(([k,l],i)=>(<div key={k} style={{padding:"10px 16px",borderBottom:i<SFIELDS.length-1?`1px solid ${C.sep}`:"none"}}><div style={{fontSize:12,color:C.t2,marginBottom:5}}>{l}</div><input className="ios-input" value={form[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={l}/></div>))}</Card>
            <div style={{height:12}}/>
            <PrimaryBtn label="Register Sample" onPress={()=>register(form)} disabled={!form.ticketNo} color={C.orange} icon="🧪"/>
          </div>
      )}
      {data && (
        <div>
          <HeroCard type="sample" ticket={data.ticket} stage={data.currentStage} stages={SAMPLE_STAGES} geo={data.geo} onClear={clear}/>
          <div style={{height:16}}/>
          <Pipeline stages={SAMPLE_STAGES} currentIndex={ci} history={data.history}>
            {(stage,i,isCurrent)=>(<div>{i===ci+1&&<div style={{marginTop:14}}><ScanPanel context="sample" onScanned={s=>advance(stage.id,{...data.ticket,...s})}/></div>}</div>)}
          </Pipeline>
          {ci===SAMPLE_STAGES.length-1&&<div style={{textAlign:"center",padding:"40px 16px"}} className="fade"><div style={{fontSize:40,marginBottom:12,opacity:0.5}}>✦</div><div style={{fontSize:18,fontWeight:600,color:C.purple}}>All stages complete</div><div style={{fontSize:14,color:C.t2,marginTop:6}}>Sample has reached the lab</div></div>}
        </div>
      )}
    </div>
  );
}

// ─── Truck Module ─────────────────────────────────────────────────────────────
function TruckModule({notify,addLog}) {
  const [data,setData]       = useState(null);
  const [loading,setLoading] = useState(true);
  const [manual,setManual]   = useState(false);
  const [form,setForm]       = useState({});
  const lastRef=useRef(null), pollRef=useRef(null);

  async function load(notif=true) {
    try {
      const r=await window.storage.get(TRUCK_KEY);
      if(r){const d=JSON.parse(r.value);setData(d);
        if(notif&&lastRef.current!==null&&lastRef.current!==d.currentStage){const s=TRUCK_STAGES.find(x=>x.id===d.currentStage);notify(`🚛 ${d.ticket?.ticketNo||""} → ${s?.label}`);}
        lastRef.current=d.currentStage;
      } else setData(null);
    } catch{setData(null);}
    setLoading(false);
  }
  useEffect(()=>{load(false);pollRef.current=setInterval(()=>load(true),POLL_MS);return()=>clearInterval(pollRef.current);},[]);

  const makeLabel=t=>{const ton=t.poidsNet&&t.poidsNet!=="TBD"?t.poidsNet:t.poidsBrut&&t.poidsBrut!=="TBD"?"~"+t.poidsBrut:"TBD";return`TRUCK: ${t.ticketNo||"—"} / ${t.immatriculation||"—"} / ${t.fournisseur||"—"} / ${ton}`;};

  async function registerLoaded(ticket) {
    const t={poidsBrut:"TBD",poidsTare:"TBD",poidsNet:"TBD",...ticket};
    const entry={ticket:t,currentStage:"loaded",history:{loaded:new Date().toISOString()}};
    await window.storage.set(TRUCK_KEY,JSON.stringify(entry));
    addLog({id:`T-${Date.now()}`,type:"truck",label:makeLabel(t),ticket:t,stageHistory:[{stage:"loaded",label:"Truck Loaded",ts:new Date().toISOString()}]});
    setData(entry);lastRef.current="loaded";setForm({});setManual(false);notify(`✓ ${makeLabel(t)}`);
  }

  async function logUnloaded(scanned) {
    const merged={...data.ticket,...scanned};
    const updated={...data,ticket:merged,currentStage:"unloaded",history:{...data.history,unloaded:new Date().toISOString()}};
    await window.storage.set(TRUCK_KEY,JSON.stringify(updated));
    addLog({id:`T-${Date.now()}`,type:"truck",label:makeLabel(merged),ticket:merged,stageHistory:[{stage:"unloaded",label:"Truck Unloaded",ts:new Date().toISOString()}]});
    setData(updated);lastRef.current="unloaded";notify(`🚛 ${makeLabel(merged)} → Unloaded`);
  }

  async function clear(){await window.storage.delete(TRUCK_KEY);setData(null);lastRef.current=null;}

  const ci=data?TRUCK_STAGES.findIndex(s=>s.id===data.currentStage):-1;
  const TFIELDS=[["ticketNo","N° Ticket"],["date","Date"],["lieuChargement","Lieu chargement"],["lieuLivraison","Lieu livraison"],["marchandise","Marchandise"],["transporteur","Transporteur"],["immatriculation","Immatriculation"],["heureDepart","Heure départ"],["fournisseur","Fournisseur"],["mineReference","Mine Ref"],["qualiteProduit","Qualité"],["responsableStock","Responsable"],["numeroChauffeur","N° Chauffeur"],["societe","Société"]];

  if(loading) return <div style={{padding:"60px",textAlign:"center"}}><Spinner size={28} color={C.t3}/></div>;

  return (
    <div style={{padding:"8px 16px 40px"}} className="fade">
      {!data && <div>
        <Card style={{marginBottom:16}}><div style={{padding:"16px"}}><div style={{fontSize:16,fontWeight:600,marginBottom:4}}>Bon de Transport</div><div style={{fontSize:14,color:C.t2,lineHeight:1.6}}>Scan the ticket at the mine. Weights will be logged at Agadir.</div></div></Card>
        {!manual
          ? <ScanPanel context="truck" onScanned={registerLoaded} onManual={()=>setManual(true)}/>
          : <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <span style={{fontSize:17,fontWeight:600}}>Manual Entry</span>
                <button onClick={()=>setManual(false)} style={{background:"none",border:"none",color:C.blue,fontSize:15,fontFamily:"inherit"}}>← Scan</button>
              </div>
              <Card>{TFIELDS.map(([k,l],i)=>(<div key={k} style={{padding:"10px 16px",borderBottom:i<TFIELDS.length-1?`1px solid ${C.sep}`:"none"}}><div style={{fontSize:12,color:C.t2,marginBottom:5}}>{l}</div><input className="ios-input" value={form[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={l}/></div>))}</Card>
              <div style={{height:12}}/>
              <PrimaryBtn label="Log Truck Loaded" onPress={()=>registerLoaded(form)} disabled={!form.ticketNo} color={C.orange} icon="🚛"/>
            </div>
        }
      </div>}
      {data && <div>
        <HeroCard type="truck" ticket={data.ticket} stage={data.currentStage} stages={TRUCK_STAGES} geo={null} onClear={clear}/>
        <div style={{height:16}}/>
        <Pipeline stages={TRUCK_STAGES} currentIndex={ci} history={data.history}>
          {(stage,i,isCurrent)=>(<div>{stage.id==="unloaded"&&isCurrent&&<div style={{marginTop:14}}><div style={{fontSize:13,color:C.t2,marginBottom:12}}>Scan ticket — Claude reads weights automatically</div><ScanPanel context="truck" onScanned={logUnloaded} existingData={data.ticket}/></div>}</div>)}
        </Pipeline>
        {ci===TRUCK_STAGES.length-1&&<div style={{textAlign:"center",padding:"40px 16px"}} className="fade"><div style={{fontSize:40,marginBottom:12,opacity:0.5}}>✦</div><div style={{fontSize:18,fontWeight:600,color:C.green}}>Cycle complete</div><div style={{fontSize:14,color:C.t2,marginTop:6}}>Net: {data.ticket?.poidsNet||"—"}</div></div>}
      </div>}
    </div>
  );
}

// ─── Log Module ───────────────────────────────────────────────────────────────
function LogModule({entries}) {
  const [expanded,setExpanded] = useState({});
  if(!entries.length) return (
    <div style={{padding:"80px 16px",textAlign:"center"}} className="fade">
      <div style={{fontSize:48,marginBottom:16,opacity:0.2}}>📋</div>
      <div style={{fontSize:17,fontWeight:600,color:C.t2}}>No entries yet</div>
      <div style={{fontSize:14,color:C.t3,marginTop:6}}>Logged samples and trucks appear here</div>
    </div>
  );
  return (
    <div style={{padding:"8px 16px 40px"}} className="fade">
      <div style={{fontSize:13,color:C.t3,letterSpacing:"0.06em",fontWeight:600,padding:"4px 0 12px"}}>{entries.length} ENTRIES</div>
      {entries.map((entry)=>{
        const truck=entry.type==="truck", color=truck?C.green:C.orange;
        const last=entry.stageHistory?.[entry.stageHistory.length-1];
        const t=entry.ticket||{}, open=expanded[entry.id];
        return (
          <Card key={entry.id} style={{marginBottom:8}}>
            <div onClick={()=>setExpanded(p=>({...p,[entry.id]:!p[entry.id]}))} style={{padding:"14px 16px",cursor:"pointer"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{width:32,height:32,borderRadius:10,background:`${color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{truck?"🚛":"🧪"}</div>
                <Pill label={truck?"TRUCK":"SAMPLE"} color={color}/>
                {entry.geo&&<span style={{fontSize:13}}>📍</span>}
                {entry.ticket?._photoUrl&&<span style={{fontSize:13}}>📸</span>}
                <span style={{marginLeft:"auto",color:C.t3,fontSize:12}}>{open?"▲":"▼"}</span>
              </div>
              <div style={{fontSize:15,fontWeight:600,letterSpacing:"-0.01em",marginBottom:4}}>{truck?`${t.ticketNo||"—"} · ${t.immatriculation||"—"}`:`${t.ticketNo||"—"} · ${t.supplier||"—"}`}</div>
              {last&&<div style={{fontSize:13,color:C.t2}}>{last.label} · {fmt(last.ts)}</div>}
            </div>
            {open&&(
              <div style={{borderTop:`1px solid ${C.sep}`}} className="fade">
                {entry.stageHistory?.length>0&&(
                  <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.sep}`}}>
                    <div style={{fontSize:12,color:C.t3,letterSpacing:"0.06em",fontWeight:600,marginBottom:10}}>STAGE HISTORY</div>
                    {entry.stageHistory.map((sh,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:color,flexShrink:0}}/>
                        <span style={{fontSize:14,color:C.t1,flex:1}}>{sh.label}</span>
                        <span style={{fontSize:13,color:C.t2,fontVariantNumeric:"tabular-nums"}}>{fmt(sh.ts)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{padding:"14px 0"}}>
                  <div style={{fontSize:12,color:C.t3,letterSpacing:"0.06em",fontWeight:600,padding:"0 16px",marginBottom:8}}>TICKET DATA</div>
                  {Object.entries(t).filter(([k,v])=>v&&v!=="TBD"&&!k.startsWith("_")).map(([k,v],i,arr)=>{
                    const isW=["poidsBrut","poidsTare","poidsNet","tonnage"].includes(k);
                    return <Row key={k} label={k.replace(/([A-Z])/g," $1").replace(/^./,s=>s.toUpperCase())} value={v} color={isW?C.green:undefined} last={i===arr.length-1}/>;
                  })}
                </div>
                {t._photoUrl&&(
                  <div style={{padding:"0 16px 14px"}}>
                    <div style={{fontSize:12,color:C.t3,letterSpacing:"0.06em",fontWeight:600,marginBottom:8}}>PHOTO</div>
                    <div style={{borderRadius:12,overflow:"hidden"}}><img src={t._photoUrl} alt="ticket" style={{width:"100%",maxHeight:180,objectFit:"cover",display:"block"}}/></div>
                    <a href={t._photoUrl} target="_blank" rel="noreferrer" style={{display:"block",textAlign:"center",color:C.blue,fontSize:14,marginTop:8,textDecoration:"none"}}>View full size ↗</a>
                  </div>
                )}
                {entry.geo&&<div style={{padding:"0 16px 14px"}}><MapEmbed lat={entry.geo.lat} lng={entry.geo.lng}/></div>}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]     = useState(null);
  const [toast,setToast] = useState(null);
  const [log,setLog]     = useState([]);
  const toastRef=useRef(null), pollRef=useRef(null);

  function notify(msg){setToast(msg);clearTimeout(toastRef.current);toastRef.current=setTimeout(()=>setToast(null),5000);}
  async function loadLog(){try{const r=await window.storage.get(LOG_KEY);if(r)setLog(JSON.parse(r.value));}catch{setLog([]);}}
  async function addLog(e){const u=[e,...log].slice(0,200);setLog(u);await window.storage.set(LOG_KEY,JSON.stringify(u));}
  useEffect(()=>{loadLog();pollRef.current=setInterval(loadLog,POLL_MS);return()=>clearInterval(pollRef.current);},[]);

  const TABS=[
    {id:"sample",icon:"🧪",label:"Sample",color:C.orange},
    {id:"truck", icon:"🚛",label:"Truck", color:C.green},
    {id:"log",   icon:"📋",label:"Log",   color:C.blue, badge:log.length},
  ];

  return (
    <div style={{minHeight:"100vh",background:C.bg0,color:C.t1}}>
      <GlobalStyle/>
      <Toast msg={toast} onClose={()=>setToast(null)}/>

      {/* HEADER */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:`1px solid ${C.sep}`}}>
        <div style={{maxWidth:600,margin:"0 auto",padding:"14px 16px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <div style={{height:40,borderRadius:12,background:`${C.orange}15`,border:`1px solid ${C.orange}25`,display:"flex",alignItems:"center",padding:"4px 10px"}}>
              <img src="/logo.png" alt="BPI" style={{height:28,width:"auto"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:C.t3,letterSpacing:"0.1em",fontWeight:600}}>BPI AGADIR</div>
              <div style={{fontSize:17,fontWeight:700,letterSpacing:"-0.02em"}}>Field Tracker</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",background:`${C.green}12`,borderRadius:8}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:C.green,animation:"pulse 2s infinite"}}/>
              <span style={{fontSize:11,color:C.green,fontWeight:700,letterSpacing:"0.06em"}}>LIVE</span>
            </div>
          </div>
          {/* Tabs */}
          <div style={{display:"flex"}}>
            {TABS.map(t=>{
              const active=tab===t.id;
              return (
                <button key={t.id} onClick={()=>setTab(tab===t.id?null:t.id)}
                  style={{flex:1,position:"relative",background:"transparent",border:"none",padding:"12px 8px 14px",color:active?t.color:C.t3,display:"flex",flexDirection:"column",alignItems:"center",gap:4,fontFamily:"inherit",transition:"color 0.2s"}}>
                  <span style={{fontSize:20}}>{t.icon}</span>
                  <span style={{fontSize:11,fontWeight:600,letterSpacing:"0.04em"}}>{t.label.toUpperCase()}</span>
                  {t.badge>0&&<div style={{position:"absolute",top:8,right:"calc(50% - 22px)",background:t.color,color:"#000",borderRadius:8,padding:"1px 5px",fontSize:9,fontWeight:800,lineHeight:1.6,minWidth:16,textAlign:"center"}}>{t.badge>99?"99+":t.badge}</div>}
                  <div style={{position:"absolute",bottom:0,left:"20%",right:"20%",height:2,borderRadius:1,background:active?t.color:"transparent",transition:"background 0.2s"}}/>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{maxWidth:600,margin:"0 auto"}}>
        {tab==="sample"&&<SampleModule notify={notify} addLog={addLog}/>}
        {tab==="truck" &&<TruckModule  notify={notify} addLog={addLog}/>}
        {tab==="log"   &&<LogModule entries={log}/>}
        {!tab&&(
          <div style={{padding:"60px 16px 40px",textAlign:"center"}} className="fade">
            <div style={{marginBottom:28}}><img src="/logo.png" alt="BPI" style={{height:44,opacity:0.5}}/></div>
            <div style={{fontSize:22,fontWeight:700,letterSpacing:"-0.02em",marginBottom:6}}>BPI Agadir</div>
            <div style={{fontSize:15,color:C.t2,marginBottom:44,lineHeight:1.6}}>Field Operations Tracker</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,maxWidth:300,margin:"0 auto"}}>
              {[{id:"sample",icon:"🧪",label:"New Sample",color:C.orange},{id:"truck",icon:"🚛",label:"New Truck",color:C.green}].map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)}
                  style={{padding:"24px 16px",background:C.bg1,border:`1px solid ${C.sep}`,borderRadius:20,color:C.t1,display:"flex",flexDirection:"column",alignItems:"center",gap:10,fontFamily:"inherit"}}>
                  <span style={{fontSize:32}}>{t.icon}</span>
                  <span style={{fontSize:15,fontWeight:600}}>{t.label}</span>
                </button>
              ))}
            </div>
            <button onClick={()=>setTab("log")}
              style={{marginTop:12,padding:"16px 32px",background:C.bg1,border:`1px solid ${C.sep}`,borderRadius:20,color:C.t2,display:"flex",alignItems:"center",gap:10,fontFamily:"inherit",fontSize:15,fontWeight:500,margin:"12px auto 0"}}>
              <span style={{fontSize:20}}>📋</span>View Log ({log.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
