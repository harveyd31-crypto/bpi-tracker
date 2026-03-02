import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

// ─── Firebase ─────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDzg3HPJasesSozO7CXFlNBIQ-9n7n3ZN4",
  authDomain: "bpi-tracker-e0dab.firebaseapp.com",
  projectId: "bpi-tracker-e0dab",
  storageBucket: "bpi-tracker-e0dab.firebasestorage.app",
  messagingSenderId: "798502862536",
  appId: "1:798502862536:web:ff49a69f54b5f4b3e9effd"
};
const _app = initializeApp(firebaseConfig);
const _db  = getFirestore(_app);
window.storage = {
  get:    async k => { const s=await getDoc(doc(_db,"bpi",k)); if(!s.exists()) throw new Error("not found"); return {key:k,value:s.data().value}; },
  set:    async (k,v) => { await setDoc(doc(_db,"bpi",k),{value:v,updatedAt:Date.now()}); return {key:k,value:v}; },
  delete: async k => { await deleteDoc(doc(_db,"bpi",k)); return {key:k,deleted:true}; },
};

// ─── Cloudinary ───────────────────────────────────────────────────────────────
const CL_CLOUD  = "digrxz7uv";
const CL_PRESET = "bpi_tracker";
async function uploadPhoto(file, folder) {
  const fd = new FormData();
  fd.append("file", file); fd.append("upload_preset", CL_PRESET); fd.append("folder", `bpi-tracker/${folder}`);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CL_CLOUD}/image/upload`,{method:"POST",body:fd});
  if(!r.ok) throw new Error("Upload failed");
  return (await r.json()).secure_url;
}

// ─── Claude OCR ───────────────────────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
async function claudeScan(b64, mime, ctx) {
  const prompt = ctx==="sample"
    ? `BPI barite sample ticket. Return ONLY JSON: {"ticketNo":"","date":"","supplier":"","mineReference":"","tonnage":"","collectionPoint":"","notes":""}`
    : `BPI Bon de Transport. Return ONLY JSON: {"ticketNo":"","date":"","lieuChargement":"","lieuLivraison":"","marchandise":"","transporteur":"","immatriculation":"","heureDepart":"","fournisseur":"","mineReference":"","qualiteProduit":"","poidsBrut":"","poidsTare":"","poidsNet":"","responsableStock":"","numeroChauffeur":"","societe":""}`;
  const resp = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:mime||"image/jpeg",data:b64}},{type:"text",text:prompt}]}]})
  });
  const data = await resp.json();
  if(data.error) throw new Error(data.error.message);
  return JSON.parse(data.content.map(c=>c.text||"").join("").trim().replace(/```json|```/g,"").trim());
}
async function fileToB64(file) {
  return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SAMPLE_KEY = "bpi-sample-active-v4";
const TRUCK_KEY  = "bpi-truck-active-v4";
const LOG_KEY    = "bpi-log-v4";
const POLL_MS    = 3000;

const SAMPLE_STAGES = [
  { id:"collected",   label:"Collected",     sub:"Ticket scanned at mine",     color:"#FF9F0A" },
  { id:"stock",       label:"At Stockyard",  sub:"Delivered to Agadir stock",  color:"#30D158" },
  { id:"preparation", label:"Preparation",   sub:"Sample being prepared",      color:"#0A84FF" },
  { id:"lab",         label:"At Lab",        sub:"Sent to laboratory",         color:"#BF5AF2" },
];
const TRUCK_STAGES = [
  { id:"loaded",   label:"Truck Loaded",    sub:"Scanned at mine site",      color:"#FF9F0A" },
  { id:"unloaded", label:"Truck Unloaded",  sub:"Weights confirmed Agadir",  color:"#30D158" },
];

const fmt = iso => {
  if(!iso) return "—";
  return new Date(iso).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
};
const fmtCoords = (lat,lng) => lat&&lng
  ? `${Math.abs(lat).toFixed(4)}°${lat>=0?"N":"S"} ${Math.abs(lng).toFixed(4)}°${lng>=0?"E":"W"}`
  : null;

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg0:"#000000", bg1:"#0d0d0d", bg2:"#141414", bg3:"#1c1c1e", bg4:"#242424",
  border:"rgba(255,255,255,0.10)", borderStrong:"rgba(255,255,255,0.18)",
  glass:"rgba(255,255,255,0.05)",
  t1:"#ffffff", t2:"rgba(235,235,245,0.80)", t3:"rgba(235,235,245,0.50)", t4:"rgba(235,235,245,0.25)",
  accent:"#FF9F0A", blue:"#0A84FF", green:"#30D158", purple:"#BF5AF2", red:"#FF453A",
};

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  html,body { margin:0; padding:0; background:#000; overscroll-behavior:none; }
  body { font-family:-apple-system,"SF Pro Display","SF Pro Text",BlinkMacSystemFont,"Helvetica Neue",sans-serif; }
  @keyframes fadeUp   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
  @keyframes scaleIn  { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
  @keyframes slideDown{ from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
  @keyframes spin     { to{transform:rotate(360deg)} }
  @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.25} }
  @keyframes shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  ::-webkit-scrollbar { width:0; }
  input { -webkit-appearance:none; }
  .tap:active  { transform:scale(0.97) !important; }
  .tapSm:active{ transform:scale(0.95) !important; }
  .field-input:focus { outline:none; border-color:rgba(255,159,10,0.6) !important; box-shadow:0 0 0 3px rgba(255,159,10,0.12) !important; background:rgba(255,255,255,0.07) !important; }
  .skeleton { background:linear-gradient(90deg,rgba(255,255,255,.03) 25%,rgba(255,255,255,.07) 50%,rgba(255,255,255,.03) 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:12px; }
`;

// ─── Base components ──────────────────────────────────────────────────────────
const Divider = ({style})=><div style={{height:"0.5px",background:C.border,...style}}/>;

const Spinner = ({size=20,color=C.accent})=>(
  <div style={{width:size,height:size,borderRadius:"50%",border:`2px solid ${color}25`,borderTopColor:color,animation:"spin 0.7s linear infinite",flexShrink:0}}/>
);

function Pill({label,color,small}) {
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:4,
      background:`${color}15`,border:`0.5px solid ${color}35`,
      borderRadius:20,padding:small?"2px 7px":"3px 10px",
      fontSize:small?9:11,color,fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase",
    }}>
      <span style={{width:4,height:4,borderRadius:"50%",background:color,flexShrink:0}}/>
      {label}
    </span>
  );
}

function Card({children,style,accent,tap,onClick}) {
  return (
    <div className={tap?"tap":""} onClick={onClick} style={{
      background:"linear-gradient(145deg,rgba(255,255,255,0.052),rgba(255,255,255,0.025))",
      backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
      border:`0.5px solid ${accent?`${accent}30`:C.border}`,
      borderRadius:22,overflow:"hidden",
      boxShadow:accent?`0 0 0 0.5px ${accent}12 inset,0 8px 32px rgba(0,0,0,0.5)`:"0 4px 24px rgba(0,0,0,0.35)",
      transition:"transform 0.15s",
      ...style,
    }}>{children}</div>
  );
}

function Field({label,value,onChange,placeholder,readOnly,highlight,big}) {
  return (
    <div>
      <div style={{fontSize:10,fontWeight:700,color:highlight?C.accent:C.t4,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:5,paddingLeft:2}}>{label}</div>
      <input className="field-input" value={value||""} onChange={onChange} placeholder={placeholder||""} readOnly={readOnly}
        style={{
          width:"100%",background:readOnly?"rgba(255,255,255,0.02)":"rgba(255,255,255,0.05)",
          border:`0.5px solid ${highlight?`${C.accent}45`:C.border}`,
          borderRadius:11,padding:big?"13px 13px":"11px 13px",
          fontSize:big?17:14,fontWeight:big?600:400,
          color:readOnly?C.t4:highlight?C.accent:C.t1,
          transition:"all 0.2s",cursor:readOnly?"default":"text",
        }}
      />
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({msg,onClose}) {
  if(!msg) return null;
  return (
    <div style={{position:"fixed",bottom:108,left:14,right:14,zIndex:9999,animation:"fadeUp 0.35s cubic-bezier(0.34,1.56,0.64,1)"}}>
      <div style={{
        background:"rgba(28,28,30,0.96)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",
        border:"0.5px solid rgba(255,255,255,0.14)",borderRadius:18,
        padding:"13px 16px",display:"flex",alignItems:"center",gap:12,
        boxShadow:"0 16px 48px rgba(0,0,0,0.7)",
      }}>
        <div style={{width:32,height:32,borderRadius:10,background:`${C.accent}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>◈</div>
        <span style={{flex:1,color:C.t1,fontSize:13,lineHeight:1.4}}>{msg}</span>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.07)",border:"none",borderRadius:7,color:C.t3,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,padding:0,flexShrink:0}}>×</button>
      </div>
    </div>
  );
}

// ─── Map ──────────────────────────────────────────────────────────────────────
function MapEmbed({lat,lng}) {
  const [open,setOpen]=useState(false);
  const url=`https://www.openstreetmap.org/export/embed.html?bbox=${lng-.02},${lat-.015},${lng+.02},${lat+.015}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <div style={{marginTop:10,borderRadius:14,overflow:"hidden",border:`0.5px solid ${C.border}`}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",cursor:"pointer",background:"rgba(255,255,255,0.03)"}}>
        <span style={{fontSize:13,color:C.accent,fontWeight:500}}>📍 {fmtCoords(lat,lng)}</span>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <a href={`https://maps.apple.com/?ll=${lat},${lng}&z=15`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:12,color:C.blue,textDecoration:"none",fontWeight:600}}>Open ↗</a>
          <span style={{color:C.t4,fontSize:12,transition:"transform 0.2s",display:"inline-block",transform:open?"rotate(180deg)":"none"}}>▼</span>
        </div>
      </div>
      {open && <div style={{height:170}}><iframe src={url} style={{width:"100%",height:"100%",border:"none",filter:"invert(88%) hue-rotate(180deg) saturate(0.5)"}} title="map" loading="lazy"/></div>}
    </div>
  );
}

// ─── Scan Panel ───────────────────────────────────────────────────────────────
function ScanPanel({context,onScanned,existingData={},onManual}) {
  const [state,setState]     = useState("idle");
  const [msg,setMsg]         = useState("");
  const [preview,setPreview] = useState(null);
  const [extracted,setExtracted] = useState(null);
  const [edited,setEdited]   = useState({});
  const [geo,setGeo]         = useState(null);
  const [geoMsg,setGeoMsg]   = useState("");
  const [saving,setSaving]   = useState(false);
  const camRef  = useRef(null);
  const upRef   = useRef(null);

  const SF=[["ticketNo","Ticket No"],["date","Date"],["supplier","Supplier"],["mineReference","Mine Ref"],["tonnage","Tonnage"],["collectionPoint","Collection Point"],["notes","Notes"]];
  const TF=[["ticketNo","N° Ticket"],["date","Date"],["lieuChargement","Lieu chargement"],["lieuLivraison","Lieu livraison"],["marchandise","Marchandise"],["transporteur","Transporteur"],["immatriculation","Immatriculation"],["heureDepart","Heure départ"],["fournisseur","Fournisseur"],["mineReference","Mine Ref"],["qualiteProduit","Qualité produit"],["poidsBrut","Poids brut"],["poidsTare","Poids tare"],["poidsNet","Poids net"],["responsableStock","Responsable"],["numeroChauffeur","N° Chauffeur"],["societe","Société"]];
  const fields = context==="sample"?SF:TF;
  const wF = ["poidsBrut","poidsTare","poidsNet"];

  function reset(){setState("idle");setPreview(null);setExtracted(null);setEdited({});setGeo(null);setGeoMsg("");setSaving(false);}

  function captureGps(){
    if(!navigator.geolocation){setGeoMsg("GPS unavailable");return;}
    setGeoMsg("Acquiring location…");
    navigator.geolocation.getCurrentPosition(
      p=>{const g={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:Math.round(p.coords.accuracy)};setGeo(g);setGeoMsg(`${fmtCoords(g.lat,g.lng)} ±${g.accuracy}m`);},
      ()=>setGeoMsg("Location denied"),
      {enableHighAccuracy:true,timeout:12000}
    );
  }

  async function handle(file) {
    if(!file) return;
    const reader=new FileReader(); reader.onload=e=>setPreview(e.target.result); reader.readAsDataURL(file);
    setState("scanning"); setMsg("Reading ticket…");
    captureGps();
    const folder=context==="sample"?"sample-tickets":"truck-tickets";
    const photoP=uploadPhoto(file,folder).catch(()=>null);
    try {
      const b64=await fileToB64(file);
      const result=await claudeScan(b64,file.type,context);
      const photoUrl=await photoP;
      setExtracted(result);
      setEdited({...existingData,...result,...(photoUrl?{_photoUrl:photoUrl}:{})});
      setState("done"); setMsg("Ticket read — verify fields");
    } catch(err) {
      setState("error");
      setMsg(!API_KEY?"API key not configured — fill manually":"Scan failed: "+err.message);
      setEdited({...existingData});
    }
  }

  async function confirm() {
    const filled=Object.keys(edited).filter(k=>edited[k]&&!k.startsWith("_"));
    if(!filled.length){alert("Please fill at least one field.");return;}
    setSaving(true);
    try { const payload={...edited,_scanned:true,_geo:geo||null}; reset(); await onScanned(payload); }
    catch(err){ alert("Error: "+(err.message||String(err))); }
    finally{ setSaving(false); }
  }

  return (
    <div style={{animation:"fadeUp 0.3s ease"}}>
      <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={e=>{reset();setTimeout(()=>handle(e.target.files[0]),50);}} style={{display:"none"}}/>
      <input ref={upRef}  type="file" accept="image/*" onChange={e=>{reset();setTimeout(()=>handle(e.target.files[0]),50);}} style={{display:"none"}}/>

      {/* Scan buttons */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <button className="tap" onClick={()=>{reset();camRef.current?.click();}} style={{
          background:`linear-gradient(145deg,${C.accent},#E8890A)`,border:"none",borderRadius:16,
          padding:"17px 14px",color:"#000",fontWeight:700,fontSize:15,
          display:"flex",alignItems:"center",justifyContent:"center",gap:8,
          boxShadow:`0 6px 20px ${C.accent}45`,transition:"all 0.2s",letterSpacing:"-0.01em",
        }}>📷 Camera</button>
        <button className="tap" onClick={()=>{reset();upRef.current?.click();}} style={{
          background:"rgba(255,255,255,0.06)",border:`0.5px solid ${C.borderStrong}`,
          borderRadius:16,padding:"17px 14px",color:C.t1,fontWeight:600,fontSize:15,
          display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.2s",
        }}>🖼 Upload</button>
      </div>

      {/* Preview */}
      {preview && (
        <div style={{marginBottom:14,borderRadius:16,overflow:"hidden",position:"relative",animation:"scaleIn 0.22s ease"}}>
          <img src={preview} alt="ticket" style={{width:"100%",maxHeight:190,objectFit:"cover",display:"block"}}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.5),transparent)"}}/>
          <button onClick={reset} style={{position:"absolute",top:10,right:10,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(8px)",border:"none",borderRadius:"50%",color:C.t1,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>×</button>
        </div>
      )}

      {/* Status */}
      {state==="scanning" && (
        <Card style={{padding:"16px 18px",marginBottom:12,display:"flex",alignItems:"center",gap:12}}>
          <Spinner/>
          <div>
            <div style={{fontSize:13,color:C.t1,fontWeight:600}}>{msg}</div>
            {geoMsg && <div style={{fontSize:11,color:C.t3,marginTop:2}}>{geoMsg}</div>}
          </div>
        </Card>
      )}
      {state==="error" && (
        <Card accent={C.red} style={{padding:"14px 18px",marginBottom:12}}>
          <div style={{fontSize:13,color:C.red,fontWeight:600,marginBottom:2}}>⚠ Scan Failed</div>
          <div style={{fontSize:12,color:C.t2}}>{msg}</div>
        </Card>
      )}

      {/* GPS */}
      {geoMsg && state!=="idle" && state!=="scanning" && (
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 13px",marginBottom:10,background:geo?"rgba(48,209,88,0.07)":"rgba(255,255,255,0.03)",borderRadius:11,border:`0.5px solid ${geo?`${C.green}28`:C.border}`}}>
          <span style={{fontSize:12}}>📍</span>
          <span style={{fontSize:11,color:geo?C.green:C.t3,fontWeight:500}}>{geoMsg}</span>
        </div>
      )}

      {/* Fields */}
      {(state==="done"||state==="error") && (
        <Card accent={state==="done"?C.green:undefined} style={{overflow:"visible",marginBottom:14,animation:"scaleIn 0.22s ease"}}>
          <div style={{padding:"14px 18px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:11,color:state==="done"?C.green:C.t3,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase"}}>
                {state==="done"?"✓ Fields Extracted":"Manual Entry"}
              </div>
              <div style={{fontSize:12,color:C.t3,marginTop:1}}>Review and confirm</div>
            </div>
            {onManual && <button className="tapSm" onClick={onManual} style={{background:"rgba(255,255,255,0.05)",border:`0.5px solid ${C.border}`,borderRadius:9,padding:"6px 11px",fontSize:11,color:C.t2,fontWeight:600}}>Manual</button>}
          </div>
          <Divider/>
          {context==="truck" && (
            <div style={{padding:"12px 18px",background:"rgba(255,159,10,0.04)"}}>
              <div style={{fontSize:10,color:C.accent,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:10}}>⚖ Weights</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {wF.map(k=>(
                  <Field key={k} label={{poidsBrut:"Brut",poidsTare:"Tare",poidsNet:"Net"}[k]}
                    value={edited[k]||""} onChange={e=>setEdited(p=>({...p,[k]:e.target.value}))} highlight big/>
                ))}
              </div>
            </div>
          )}
          <div style={{padding:"12px 18px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px 12px"}}>
            {fields.filter(([k])=>!wF.includes(k)).map(([k,l])=>(
              <Field key={k} label={l} value={edited[k]||""} onChange={e=>setEdited(p=>({...p,[k]:e.target.value}))} highlight={!!(extracted&&extracted[k])}/>
            ))}
          </div>
          <div style={{padding:"4px 18px 18px"}}>
            {!edited.ticketNo&&!edited.supplier && (
              <div style={{fontSize:11,color:C.accent,marginBottom:8,textAlign:"center",padding:"7px 12px",background:`${C.accent}09`,borderRadius:9,border:`0.5px solid ${C.accent}18`}}>
                Add Ticket No or Supplier first
              </div>
            )}
            <button className="tap" onClick={confirm} disabled={saving} style={{
              width:"100%",background:saving?"rgba(255,255,255,0.05)":`linear-gradient(145deg,${C.green},#25a145)`,
              border:"none",borderRadius:14,padding:"16px 20px",
              color:saving?C.t3:"#000",fontWeight:700,fontSize:15,letterSpacing:"-0.01em",
              display:"flex",alignItems:"center",justifyContent:"center",gap:10,
              boxShadow:saving?"none":`0 6px 20px ${C.green}38`,transition:"all 0.2s",
            }}>
              {saving?<><Spinner size={16} color={C.t3}/> Saving…</>:"✓ Confirm & Log"}
            </button>
          </div>
        </Card>
      )}

      {state==="idle" && onManual && (
        <button onClick={onManual} style={{
          width:"100%",background:"rgba(255,255,255,0.03)",border:`0.5px solid ${C.border}`,
          borderRadius:14,padding:"14px 20px",color:C.t3,fontSize:14,fontWeight:500,
          display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:4,
        }}>✏ Enter manually instead</button>
      )}
    </div>
  );
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────
function Pipeline({stages,currentIndex,history,children}) {
  return (
    <div>
      {stages.map((stage,i)=>{
        const done=i<currentIndex, cur=i===currentIndex, pending=i>currentIndex;
        return (
          <div key={stage.id} style={{display:"flex",gap:14,opacity:pending?0.35:1,transition:"opacity 0.4s"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:38,flexShrink:0}}>
              <div style={{
                width:38,height:38,borderRadius:12,flexShrink:0,
                background:cur?stage.color:done?`${stage.color}18`:"rgba(255,255,255,0.04)",
                border:`0.5px solid ${done||cur?stage.color:C.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:13,fontWeight:700,
                color:cur?"#000":done?stage.color:C.t4,
                boxShadow:cur?`0 4px 18px ${stage.color}55`:"none",
                transition:"all 0.4s",
              }}>{done?"✓":i+1}</div>
              {i<stages.length-1 && <div style={{width:1,flex:1,minHeight:18,background:done?stage.color:"rgba(255,255,255,0.07)",margin:"5px 0",borderRadius:1}}/>}
            </div>
            <div style={{flex:1,paddingBottom:i<stages.length-1?18:0,paddingTop:7}}>
              <div style={{
                background:cur?`${stage.color}09`:"transparent",
                border:cur?`0.5px solid ${stage.color}22`:"0.5px solid transparent",
                borderRadius:15,padding:cur?"15px":"0 0 2px",transition:"all 0.4s",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                  <span style={{fontSize:14,fontWeight:600,color:cur?stage.color:done?C.t1:C.t3}}>{stage.label}</span>
                  {cur && <Pill label="NOW" color={stage.color} small/>}
                </div>
                <div style={{fontSize:11,color:C.t4}}>{history?.[stage.id]?fmt(history[stage.id]):stage.sub}</div>
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
function HeroCard({type,ticket,currentStage,stages,geo,onClear}) {
  const stage=stages.find(s=>s.id===currentStage);
  const isTruck=type==="truck";
  return (
    <Card accent={stage?.color} style={{marginBottom:18,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-50,right:-50,width:160,height:160,borderRadius:"50%",background:`${stage?.color}12`,filter:"blur(40px)",pointerEvents:"none"}}/>
      <div style={{padding:"18px 18px 14px",position:"relative"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            <div style={{fontSize:10,color:C.t4,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>
              {isTruck?"🚛 Active Transport":"🧪 Active Sample"}
            </div>
            <div style={{fontSize:24,fontWeight:700,color:C.t1,letterSpacing:"-0.03em",lineHeight:1.1,marginBottom:4}}>
              {ticket?.ticketNo||"—"}
            </div>
            <div style={{fontSize:13,color:C.t2}}>
              {isTruck?`${ticket?.immatriculation||"—"}  ·  ${ticket?.fournisseur||"—"}`:`${ticket?.supplier||"—"}  ·  ${ticket?.mineReference||"—"}`}
            </div>
          </div>
          <button className="tapSm" onClick={onClear} style={{background:"rgba(255,69,58,0.10)",border:"0.5px solid rgba(255,69,58,0.25)",borderRadius:9,padding:"6px 11px",fontSize:12,color:C.red,fontWeight:600,flexShrink:0}}>Clear</button>
        </div>
        <div style={{display:"inline-flex",alignItems:"center",gap:7,background:`${stage?.color}12`,border:`0.5px solid ${stage?.color}30`,borderRadius:11,padding:"8px 13px"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:stage?.color,animation:"pulse 2s infinite"}}/>
          <span style={{fontSize:13,color:stage?.color,fontWeight:600}}>{stage?.label}</span>
        </div>
        {isTruck && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:12}}>
            {[["poidsBrut","Brut"],["poidsTare","Tare"],["poidsNet","Net"]].map(([k,l])=>{
              const val=ticket?.[k],has=val&&val!=="TBD";
              return (
                <div key={k} style={{background:"rgba(255,255,255,0.04)",borderRadius:11,padding:"9px 11px",border:`0.5px solid ${has?`${C.green}28`:C.border}`}}>
                  <div style={{fontSize:9,color:C.t4,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3}}>{l}</div>
                  <div style={{fontSize:15,fontWeight:700,color:has?C.green:C.t4}}>{val||"TBD"}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {geo && <div style={{padding:"0 18px 16px"}}><MapEmbed lat={geo.lat} lng={geo.lng}/></div>}
    </Card>
  );
}

// ─── Sample Module ────────────────────────────────────────────────────────────
function SampleModule({notify,addLog}) {
  const [data,setData]       = useState(null);
  const [loading,setLoading] = useState(true);
  const [manual,setManual]   = useState(false);
  const [form,setForm]       = useState({});
  const lastS=useRef(null); const poll=useRef(null);
  const SF=[["ticketNo","Ticket No"],["date","Date"],["supplier","Supplier"],["mineReference","Mine Ref"],["tonnage","Tonnage"],["collectionPoint","Collection Point"],["notes","Notes"]];

  async function load(n=true){
    try{const r=await window.storage.get(SAMPLE_KEY, true);if(r){const d=JSON.parse(r.value);setData(d);if(n&&lastS.current!==null&&lastS.current!==d.currentStage){const s=SAMPLE_STAGES.find(x=>x.id===d.currentStage),t=d.ticket||{};notify(`🧪 ${t.ticketNo||""} → ${s?.label}`);}lastS.current=d.currentStage;}else setData(null);}catch{setData(null);}
    setLoading(false);
  }
  useEffect(()=>{load(false);poll.current=setInterval(()=>load(true),POLL_MS);return()=>clearInterval(poll.current);},[]);

  const lbl=t=>`SAMPLE · ${t.ticketNo||"—"} · ${t.supplier||"—"} · ${t.mineReference||"—"} · ${t.tonnage||"TBD"}`;

  async function register(sc){
    const{_scanned,_geo,...ticket}=sc; const geo=_geo||null;
    const entry={ticket,currentStage:"collected",history:{collected:new Date().toISOString()},geo};
    await window.storage.set(SAMPLE_KEY,JSON.stringify(entry), true);
    addLog({id:`S-${Date.now()}`,type:"sample",label:lbl(ticket),ticket,stageHistory:[{stage:"collected",label:"Collected",ts:new Date().toISOString()}],geo});
    setData(entry);lastS.current="collected";setForm({});setManual(false);
    const now = new Date().toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
    notify(
`SAMPLE COLLECTED — ${now}
--------------------
Ticket:      ${ticket.ticketNo||"—"}
Date:        ${ticket.date||"—"}
Supplier:    ${ticket.supplier||"—"}
Mine Ref:    ${ticket.mineReference||"—"}
Tonnage:     ${ticket.tonnage||"—"}
Collection:  ${ticket.collectionPoint||"—"}
${ticket.notes?"Notes:       "+ticket.notes+"\n":""}--------------------
Status: Collected`
    );
  }

  async function advance(stageId,updT=null){
    const stage=SAMPLE_STAGES.find(s=>s.id===stageId),newT=updT||data.ticket;
    const updated={...data,ticket:newT,currentStage:stageId,history:{...data.history,[stageId]:new Date().toISOString()}};
    await window.storage.set(SAMPLE_KEY,JSON.stringify(updated), true);
    addLog({id:`S-${Date.now()}`,type:"sample",label:lbl(newT),ticket:newT,stageHistory:[{stage:stageId,label:stage.label,ts:new Date().toISOString()}],geo:data.geo||null});
    const now2 = new Date().toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
    setData(updated);lastS.current=stageId;
    notify(
`SAMPLE UPDATE — ${now2}
--------------------
Ticket:   ${newT.ticketNo||"—"}
Supplier: ${newT.supplier||"—"}
Mine Ref: ${newT.mineReference||"—"}
Tonnage:  ${newT.tonnage||"—"}
--------------------
Status: ${stage.label}`
    );
  }

  async function clear(){await window.storage.delete(SAMPLE_KEY, true);setData(null);lastS.current=null;}
  const ci=data?SAMPLE_STAGES.findIndex(s=>s.id===data.currentStage):-1;

  if(loading) return <div style={{padding:"20px 0"}}>{[1,2,3].map(i=><div key={i} className="skeleton" style={{height:56,marginBottom:10}}/>)}</div>;

  return (
    <div style={{animation:"fadeUp 0.3s ease"}}>
      {!data ? (
        !manual
          ? <ScanPanel context="sample" onScanned={register} onManual={()=>setManual(true)}/>
          : (
            <Card style={{overflow:"visible"}}>
              <div style={{padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:15,fontWeight:600,color:C.t1}}>Manual Entry</div>
                <button onClick={()=>setManual(false)} style={{background:"rgba(255,255,255,0.05)",border:`0.5px solid ${C.border}`,borderRadius:9,padding:"6px 11px",fontSize:11,color:C.t2,fontWeight:600}}>← Scan</button>
              </div>
              <Divider/>
              <div style={{padding:"14px 18px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px 12px"}}>
                {SF.map(([k,l])=>(<Field key={k} label={l} value={form[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={l}/>))}
              </div>
              <div style={{padding:"4px 18px 18px"}}>
                <button onClick={()=>register(form)} disabled={!form.ticketNo} className="tap" style={{
                  width:"100%",background:form.ticketNo?`linear-gradient(145deg,${C.accent},#E8890A)`:"rgba(255,255,255,0.04)",
                  border:"none",borderRadius:14,padding:"16px",color:form.ticketNo?"#000":C.t4,fontWeight:700,fontSize:15,
                  boxShadow:form.ticketNo?`0 6px 20px ${C.accent}40`:"none",transition:"all 0.2s",
                }}>Register Sample</button>
              </div>
            </Card>
          )
      ) : (
        <>
          <HeroCard type="sample" ticket={data.ticket} currentStage={data.currentStage} stages={SAMPLE_STAGES} geo={data.geo} onClear={clear}/>
          <Pipeline stages={SAMPLE_STAGES} currentIndex={ci} history={data.history}>
            {(stage,i,isCur)=>(
              <div>
                {i===ci+1 && (
                  <div style={{marginTop:12,animation:"fadeIn 0.3s ease"}}>
                    <ScanPanel context="sample" onScanned={sc=>advance(stage.id,{...data.ticket,...sc})}/>
                  </div>
                )}
              </div>
            )}
          </Pipeline>
          {ci===SAMPLE_STAGES.length-1 && (
            <Card accent={C.purple} style={{marginTop:16,padding:"28px 22px",textAlign:"center",animation:"scaleIn 0.35s ease"}}>
              <div style={{fontSize:34,marginBottom:10}}>🔬</div>
              <div style={{fontSize:17,color:C.purple,fontWeight:700,letterSpacing:"-0.02em"}}>All stages complete</div>
              <div style={{fontSize:12,color:C.t4,marginTop:5}}>Sample is at the laboratory</div>
            </Card>
          )}
        </>
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
  const lastS=useRef(null); const poll=useRef(null);
  const TF=[["ticketNo","N° Ticket"],["date","Date"],["lieuChargement","Lieu chargement"],["lieuLivraison","Lieu livraison"],["marchandise","Marchandise"],["transporteur","Transporteur"],["immatriculation","Immatriculation"],["heureDepart","Heure départ"],["fournisseur","Fournisseur"],["mineReference","Mine Ref"],["qualiteProduit","Qualité produit"],["responsableStock","Responsable"],["numeroChauffeur","N° Chauffeur"],["societe","Société"]];

  async function load(n=true){
    try{const r=await window.storage.get(TRUCK_KEY, true);if(r){const d=JSON.parse(r.value);setData(d);if(n&&lastS.current!==null&&lastS.current!==d.currentStage){const s=TRUCK_STAGES.find(x=>x.id===d.currentStage),t=d.ticket||{};notify(`🚛 ${t.ticketNo||""} → ${s?.label}`);}lastS.current=d.currentStage;}else setData(null);}catch{setData(null);}
    setLoading(false);
  }
  useEffect(()=>{load(false);poll.current=setInterval(()=>load(true),POLL_MS);return()=>clearInterval(poll.current);},[]);

  const lbl=t=>{const ton=t.poidsNet&&t.poidsNet!=="TBD"?t.poidsNet:t.poidsBrut&&t.poidsBrut!=="TBD"?"~"+t.poidsBrut:"TBD";return`TRUCK · ${t.ticketNo||"—"} · ${t.immatriculation||"—"} · ${t.fournisseur||"—"} · ${ton}`;};

  async function registerLoaded(ticket){
    const t={poidsBrut:"TBD",poidsTare:"TBD",poidsNet:"TBD",...ticket};
    const entry={ticket:t,currentStage:"loaded",history:{loaded:new Date().toISOString()}};
    await window.storage.set(TRUCK_KEY,JSON.stringify(entry), true);
    addLog({id:`T-${Date.now()}`,type:"truck",label:lbl(t),ticket:t,stageHistory:[{stage:"loaded",label:"Truck Loaded",ts:new Date().toISOString()}]});
    setData(entry);lastS.current="loaded";setForm({});setManual(false);
    const now3 = new Date().toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
    notify(
`TRUCK LOADED — ${now3}
--------------------
Ticket:      ${t.ticketNo||"—"}
Date:        ${t.date||"—"}
Truck:       ${t.immatriculation||"—"}
Fournisseur: ${t.fournisseur||"—"}
Mine Ref:    ${t.mineReference||"—"}
Marchandise: ${t.marchandise||"—"}
De:          ${t.lieuChargement||"—"}
Vers:        ${t.lieuLivraison||"—"}
--------------------
Status: Loaded — weights TBD`
    );
  }

  async function logUnloaded(sc){
    const merged={...data.ticket,...sc};
    const updated={...data,ticket:merged,currentStage:"unloaded",history:{...data.history,unloaded:new Date().toISOString()}};
    await window.storage.set(TRUCK_KEY,JSON.stringify(updated), true);
    addLog({id:`T-${Date.now()}`,type:"truck",label:lbl(merged),ticket:merged,stageHistory:[{stage:"unloaded",label:"Truck Unloaded",ts:new Date().toISOString()}]});
    setData(updated);lastS.current="unloaded";
    const now4 = new Date().toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
    notify(
`TRUCK UNLOADED — ${now4}
--------------------
Ticket:      ${merged.ticketNo||"—"}
Truck:       ${merged.immatriculation||"—"}
Fournisseur: ${merged.fournisseur||"—"}
Mine Ref:    ${merged.mineReference||"—"}
--------------------
Poids brut:  ${merged.poidsBrut||"—"}
Poids tare:  ${merged.poidsTare||"—"}
Poids net:   ${merged.poidsNet||"—"}
--------------------
Status: Unloaded`
    );
  }

  async function clear(){await window.storage.delete(TRUCK_KEY, true);setData(null);lastS.current=null;}
  const ci=data?TRUCK_STAGES.findIndex(s=>s.id===data.currentStage):-1;
  const t=data?.ticket||{};

  if(loading) return <div style={{padding:"20px 0"}}>{[1,2,3].map(i=><div key={i} className="skeleton" style={{height:56,marginBottom:10}}/>)}</div>;

  return (
    <div style={{animation:"fadeUp 0.3s ease"}}>
      {!data ? (
        <>
          <Card style={{marginBottom:14,padding:"14px 18px"}}>
            <div style={{fontSize:13,color:C.accent,fontWeight:600,marginBottom:3}}>Bon de Transport — Loaded</div>
            <div style={{fontSize:12,color:C.t4,lineHeight:1.6}}>Scan at mine. Weights logged later by stock manager in Agadir.</div>
          </Card>
          {!manual
            ? <ScanPanel context="truck" onScanned={registerLoaded} onManual={()=>setManual(true)}/>
            : (
              <Card style={{overflow:"visible"}}>
                <div style={{padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:15,fontWeight:600,color:C.t1}}>Manual Entry</div>
                  <button onClick={()=>setManual(false)} style={{background:"rgba(255,255,255,0.05)",border:`0.5px solid ${C.border}`,borderRadius:9,padding:"6px 11px",fontSize:11,color:C.t2,fontWeight:600}}>← Scan</button>
                </div>
                <Divider/>
                <div style={{padding:"14px 18px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px 12px"}}>
                  {TF.map(([k,l])=>(<Field key={k} label={l} value={form[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={l}/>))}
                </div>
                <div style={{padding:"4px 18px 18px"}}>
                  <button onClick={()=>registerLoaded(form)} disabled={!form.ticketNo} className="tap" style={{
                    width:"100%",background:form.ticketNo?`linear-gradient(145deg,${C.accent},#E8890A)`:"rgba(255,255,255,0.04)",
                    border:"none",borderRadius:14,padding:"16px",color:form.ticketNo?"#000":C.t4,fontWeight:700,fontSize:15,
                    boxShadow:form.ticketNo?`0 6px 20px ${C.accent}40`:"none",transition:"all 0.2s",
                  }}>Log Truck Loaded</button>
                </div>
              </Card>
            )
          }
        </>
      ) : (
        <>
          <HeroCard type="truck" ticket={t} currentStage={data.currentStage} stages={TRUCK_STAGES} geo={null} onClear={clear}/>
          <Pipeline stages={TRUCK_STAGES} currentIndex={ci} history={data.history}>
            {(stage,i,isCur)=>(
              <div>
                {stage.id==="unloaded"&&isCur && (
                  <div style={{marginTop:12,animation:"fadeUp 0.3s ease"}}>
                    <div style={{fontSize:10,color:C.accent,fontWeight:700,marginBottom:8,letterSpacing:"0.07em",textTransform:"uppercase"}}>Scan ticket — Claude reads weights</div>
                    <ScanPanel context="truck" onScanned={logUnloaded} existingData={data.ticket}/>
                  </div>
                )}
              </div>
            )}
          </Pipeline>
          {ci===TRUCK_STAGES.length-1 && (
            <Card accent={C.green} style={{marginTop:16,padding:"28px 22px",textAlign:"center",animation:"scaleIn 0.35s ease"}}>
              <div style={{fontSize:34,marginBottom:10}}>✅</div>
              <div style={{fontSize:17,color:C.green,fontWeight:700,letterSpacing:"-0.02em"}}>Truck cycle complete</div>
              <div style={{fontSize:12,color:C.t4,marginTop:5}}>Net: {t.poidsNet||"—"}</div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Log Module ───────────────────────────────────────────────────────────────
function LogModule({entries, onDelete, onResendAll, onUpdate}) {
  const [expanded,setExpanded] = useState({});
  const [confirming,setConfirming] = useState(null);
  const [resending,setResending] = useState(false);
  const [editing,setEditing] = useState(null); // {id, ticket, type}
  const [editForm,setEditForm] = useState({});

  function startEdit(e, entry) {
    e.stopPropagation();
    setEditing(entry);
    setEditForm({...entry.ticket});
  }
  function cancelEdit() { setEditing(null); setEditForm({}); }
  async function saveEdit() {
    await onUpdate(editing.id, editForm);
    setEditing(null); setEditForm({});
  }

  async function resendAll() {
    setResending(true);
    let sent = 0;
    for (const entry of entries) {
      const t = entry.ticket || {};
      const sh = entry.stageHistory?.[0];
      const ts = sh?.ts ? new Date(sh.ts).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : "—";
      let msg = "";
      if (entry.type === "truck") {
        msg = `TRUCK LOADED — ${ts}
--------------------
Ticket:      ${t.ticketNo||"—"}
Truck:       ${t.immatriculation||"—"}
Fournisseur: ${t.fournisseur||"—"}
Mine Ref:    ${t.mineReference||"—"}
Poids brut:  ${t.poidsBrut||"—"}
Poids tare:  ${t.poidsTare||"—"}
Poids net:   ${t.poidsNet||"—"}
--------------------
Status: ${sh?.label||"—"}`;
      } else {
        msg = `SAMPLE COLLECTED — ${ts}
--------------------
Ticket:      ${t.ticketNo||"—"}
Date:        ${t.date||"—"}
Supplier:    ${t.supplier||"—"}
Mine Ref:    ${t.mineReference||"—"}
Tonnage:     ${t.tonnage||"—"}
${t.notes?"Notes:       "+t.notes+"\n":""}--------------------
Status: ${sh?.label||"—"}`;
      }
      try {
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msg }),
        });
        sent++;
      } catch(e) { console.warn("Failed to send entry", entry.id); }
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));
    }
    setResending(false);
    alert(`Sent ${sent} of ${entries.length} entries to WhatsApp.`);
  }
  const toggle = id=>setExpanded(p=>({...p,[id]:!p[id]}));
  function handleDelete(e, id) {
    e.stopPropagation();
    if (confirming===id) { onDelete(id); setConfirming(null); }
    else { setConfirming(id); setTimeout(()=>setConfirming(null), 3000); }
  }

  if(!entries.length) return (
    <div style={{padding:"80px 24px",textAlign:"center",animation:"fadeUp 0.4s ease"}}>
      <div style={{fontSize:44,marginBottom:14,opacity:0.25}}>📋</div>
      <div style={{fontSize:16,color:C.t2,fontWeight:600,marginBottom:6}}>No entries yet</div>
      <div style={{fontSize:13,color:C.t4,lineHeight:1.6,marginBottom:24}}>Logged samples and trucks appear here</div>
      <button onClick={async()=>{
        try{
          const r=await window.storage.get("bpi-log-v4",true);
          if(r&&r.value){const d=JSON.parse(r.value);alert("Found "+d.length+" entries in Firebase. Reloading...");}
          else{alert("Firebase returned empty for bpi-log-v4");}
        }catch(e){alert("Firebase error: "+e.message);}
      }} style={{background:C.bg2,border:"none",borderRadius:10,color:C.t2,padding:"10px 18px",fontSize:13,fontFamily:"inherit",cursor:"pointer"}}>
        🔄 Check Firebase
      </button>
    </div>
  );

  return (
    <div style={{animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div style={{fontSize:10,color:C.t4,letterSpacing:"0.12em",fontWeight:700,textTransform:"uppercase"}}>
          {entries.length} {entries.length===1?"Entry":"Entries"} — Newest first
        </div>
        <button onClick={resendAll} disabled={resending} style={{
          background:resending?"rgba(255,255,255,0.05)":"rgba(48,209,88,0.12)",
          border:"none",borderRadius:9,
          color:resending?C.t4:C.green,
          fontSize:12,fontWeight:700,
          padding:"7px 13px",fontFamily:"inherit",
          cursor:resending?"default":"pointer",
          transition:"all 0.2s",
        }}>
          {resending?"Sending...":"Resend All"}
        </button>
      </div>
      {entries.map((entry,idx)=>{
        const isTruck=entry.type==="truck",color=isTruck?C.green:C.accent;
        const last=entry.stageHistory?.[entry.stageHistory.length-1];
        const et=entry.ticket||{},open=expanded[entry.id];
        return (
          <Card key={entry.id} style={{marginBottom:9,overflow:"hidden",animation:`fadeUp 0.3s ease ${Math.min(idx,6)*0.04}s both`}}>
            <div className="tap" onClick={()=>toggle(entry.id)} style={{padding:"14px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:40,height:40,borderRadius:12,flexShrink:0,background:`${color}13`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                {isTruck?"🚛":"🧪"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                  <Pill label={isTruck?"TRUCK":"SAMPLE"} color={color} small/>
                  {entry.geo && <span style={{fontSize:11}}>📍</span>}
                </div>
                <div style={{fontSize:13,color:C.t1,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {isTruck?`${et.ticketNo||"—"}  ·  ${et.immatriculation||"—"}  ·  ${et.fournisseur||"—"}`:`${et.ticketNo||"—"}  ·  ${et.supplier||"—"}`}
                </div>
                {last && <div style={{fontSize:11,color:C.t4,marginTop:2}}>{last.label} · {fmt(last.ts)}</div>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                <button
                  onClick={e=>startEdit(e,entry)}
                  style={{
                    background:"rgba(10,132,255,0.12)",
                    border:"none",borderRadius:8,
                    color:"#0A84FF",
                    fontSize:12,fontWeight:700,
                    padding:"6px 10px",fontFamily:"inherit",
                    whiteSpace:"nowrap",
                  }}
                >Edit</button>
                <button
                  onClick={e=>handleDelete(e,entry.id)}
                  style={{
                    background:confirming===entry.id?"#FF453A":"rgba(255,69,58,0.12)",
                    border:"none",borderRadius:8,
                    color:confirming===entry.id?"#fff":"#FF453A",
                    fontSize:12,fontWeight:700,
                    padding:"6px 10px",fontFamily:"inherit",
                    transition:"all 0.2s",
                    whiteSpace:"nowrap",
                  }}
                >
                  {confirming===entry.id?"Confirm?":"Delete"}
                </button>
                <div style={{color:C.t4,fontSize:14,transition:"transform 0.2s",transform:open?"rotate(180deg)":"none"}}>▼</div>
              </div>
            </div>
            {open && (
              <div style={{borderTop:`0.5px solid ${C.border}`,background:"rgba(255,255,255,0.015)",animation:"slideDown 0.2s ease"}}>
                <div style={{padding:"14px 16px"}}>
                  <div style={{fontSize:10,color:C.t4,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:700,marginBottom:10}}>Stage History</div>
                  {entry.stageHistory?.map((sh,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:color,flexShrink:0}}/>
                      <span style={{fontSize:12,color:C.t1,flex:1,fontWeight:500}}>{sh.label}</span>
                      <span style={{fontSize:11,color:C.t4}}>{fmt(sh.ts)}</span>
                    </div>
                  ))}
                </div>
                <Divider/>
                <div style={{padding:"12px 16px"}}>
                  <div style={{fontSize:10,color:C.t4,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:700,marginBottom:10}}>Ticket Data</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 18px"}}>
                    {Object.entries(et).filter(([k,v])=>v&&v!=="TBD"&&!k.startsWith("_")).map(([k,v])=>{
                      const isW=["poidsBrut","poidsTare","poidsNet","tonnage"].includes(k);
                      return (
                        <div key={k}>
                          <div style={{fontSize:9,color:C.t4,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:2}}>{k.replace(/([A-Z])/g," $1").trim()}</div>
                          <div style={{fontSize:13,color:isW?C.green:C.t1,fontWeight:isW?700:400}}>{v}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {et._photoUrl && (
                  <>
                    <Divider/>
                    <div style={{padding:"12px 16px"}}>
                      <div style={{fontSize:10,color:C.t4,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Photo</div>
                      <a href={et._photoUrl} target="_blank" rel="noreferrer">
                        <img src={et._photoUrl} alt="ticket" style={{width:"100%",borderRadius:11,display:"block",maxHeight:180,objectFit:"cover"}}/>
                      </a>
                    </div>
                  </>
                )}
                {entry.geo && <div style={{padding:"0 16px 14px"}}><MapEmbed lat={entry.geo.lat} lng={entry.geo.lng}/></div>}
              </div>
            )}
          </Card>
        );
      })}
      {editing && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1000,display:"flex",alignItems:"flex-end",padding:"0 0 20px 0"}}>
          <div style={{background:"#1C1C1E",borderRadius:"20px 20px 16px 16px",width:"100%",maxHeight:"85vh",overflow:"auto",padding:"20px 16px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
              <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>Edit Entry</div>
              <button onClick={cancelEdit} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:8,color:"rgba(255,255,255,0.6)",padding:"6px 12px",fontSize:13,fontFamily:"inherit"}}>Cancel</button>
            </div>
            {Object.entries(editForm).filter(([k])=>!k.startsWith("_")).map(([k,v])=>(
              <div key={k} style={{marginBottom:12}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:5}}>{k.replace(/([A-Z])/g," $1").trim()}</div>
                <input value={v||""} onChange={e=>setEditForm(p=>({...p,[k]:e.target.value}))}
                  style={{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",color:"#fff",fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}
                />
              </div>
            ))}
            <button onClick={saveEdit} style={{width:"100%",background:"#0A84FF",border:"none",borderRadius:12,color:"#fff",padding:"14px",fontSize:15,fontWeight:700,fontFamily:"inherit",marginTop:8}}>
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode,setMode]     = useState(null);
  const [toast,setToast]   = useState(null);
  const [log,setLog]       = useState([]);
  const toastRef=useRef(null); const pollRef=useRef(null);

  async function sendWhatsApp(msg) {
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("WhatsApp error:", data.error);
        // Show brief error toast so we know it failed
        setToast("⚠️ WhatsApp: " + (data.error || "failed"));
      } else {
        console.log("WhatsApp sent:", data.sid);
      }
    } catch(e) {
      console.warn("WhatsApp notify failed:", e.message);
    }
  }

  function notify(msg) {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(()=>setToast(null), 5000);
    sendWhatsApp(msg);
  }

  async function loadLog(){
    try {
      const r = await window.storage.get(LOG_KEY, true);
      if(r && r.value) {
        const parsed = JSON.parse(r.value);
        setLog(Array.isArray(parsed) ? parsed : []);
      } else {
        setLog([]);
      }
    } catch(e) {
      console.error("loadLog error:", e.message);
      setLog([]);
    }
  }
  async function addLog(entry){const u=[entry,...log].slice(0,200);setLog(u);await window.storage.set(LOG_KEY,JSON.stringify(u), true);}
  async function deleteLog(id){const u=log.filter(e=>e.id!==id);setLog(u);await window.storage.set(LOG_KEY,JSON.stringify(u), true);}
  async function updateLog(id,ticket){const u=log.map(e=>e.id===id?{...e,ticket:{...e.ticket,...ticket}}:e);setLog(u);await window.storage.set(LOG_KEY,JSON.stringify(u),true);}
  useEffect(()=>{loadLog();pollRef.current=setInterval(loadLog,POLL_MS);return()=>clearInterval(pollRef.current);},[]);

  const TABS=[
    {id:"sample",icon:"🧪",label:"Sample",color:C.accent},
    {id:"truck", icon:"🚛",label:"Truck",  color:C.green},
    {id:"log",   icon:"📋",label:"Log",    color:C.blue,badge:log.length},
  ];

  return (
    <div style={{minHeight:"100vh",background:C.bg0,color:C.t1,
      fontFamily:"-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Helvetica Neue',sans-serif",
    }}>
      <style>{GLOBAL_CSS}</style>
      <Toast msg={toast} onClose={()=>setToast(null)}/>

      {/* Ambient top glow */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,
        background:"radial-gradient(ellipse 80% 40% at 50% -15%, rgba(255,159,10,0.06) 0%, transparent 60%)",
      }}/>

      <div style={{position:"relative",zIndex:1,maxWidth:640,margin:"0 auto",paddingBottom:50}}>

        {/* ── HEADER ──────────────────────────────────────────── */}
        <div style={{
          position:"sticky",top:0,zIndex:100,
          background:"rgba(0,0,0,0.85)",
          backdropFilter:"blur(28px) saturate(1.6)",
          WebkitBackdropFilter:"blur(28px) saturate(1.6)",
          borderBottom:`0.5px solid ${C.border}`,
          padding:"13px 18px 11px",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:13}}>
            <div style={{height:40,paddingInline:10,borderRadius:13,background:"rgba(255,159,10,0.09)",border:"0.5px solid rgba(255,159,10,0.22)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <img src="/logo.png" alt="BPI" style={{height:24,width:"auto",objectFit:"contain"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:C.accent,letterSpacing:"0.14em",textTransform:"uppercase",fontWeight:700,marginBottom:1}}>Field Operations</div>
              <div style={{fontSize:17,fontWeight:700,letterSpacing:"-0.03em",color:C.t1}}>BPI Agadir</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(48,209,88,0.09)",border:"0.5px solid rgba(48,209,88,0.22)",borderRadius:20,padding:"5px 10px"}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:C.green,animation:"pulse 2s infinite"}}/>
              <span style={{fontSize:10,color:C.green,fontWeight:700,letterSpacing:"0.08em"}}>LIVE</span>
            </div>
          </div>
        </div>

        {/* ── TAB BAR ─────────────────────────────────────────── */}
        <div style={{padding:"14px 14px 4px"}}>
          <div style={{display:"flex",gap:4,background:"rgba(255,255,255,0.04)",backdropFilter:"blur(10px)",borderRadius:18,border:`0.5px solid ${C.border}`,padding:4}}>
            {TABS.map(tab=>{
              const active=mode===tab.id;
              return (
                <button key={tab.id} className="tap"
                  onClick={()=>setMode(mode===tab.id?null:tab.id)}
                  style={{
                    flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                    padding:"13px 8px",background:active?tab.color:"transparent",border:"none",borderRadius:14,
                    color:active?"#000":C.t3,fontWeight:active?700:500,fontSize:13,
                    letterSpacing:active?"-0.01em":"0.01em",
                    transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
                    boxShadow:active?`0 4px 16px ${tab.color}45`:"none",position:"relative",
                  }}>
                  <span style={{fontSize:15}}>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge>0 && (
                    <div style={{
                      position:"absolute",top:5,right:5,
                      background:active?"rgba(0,0,0,0.25)":tab.color,color:active?"#fff":"#000",
                      borderRadius:10,minWidth:16,height:16,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:8,fontWeight:800,padding:"0 4px",lineHeight:1,
                    }}>{tab.badge>99?"99+":tab.badge}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── CONTENT ─────────────────────────────────────────── */}
        <div style={{padding:"12px 14px 60px"}}>
          {mode==="sample" && <SampleModule notify={notify} addLog={addLog}/>}
          {mode==="truck"  && <TruckModule  notify={notify} addLog={addLog}/>}
          {mode==="log"    && <LogModule entries={log} onDelete={deleteLog} onResendAll={true} onUpdate={updateLog}/>}
          {!mode && (
            <div style={{padding:"80px 24px",textAlign:"center",animation:"fadeUp 0.5s ease"}}>
              <div style={{width:76,height:76,borderRadius:24,background:"rgba(255,159,10,0.09)",border:"0.5px solid rgba(255,159,10,0.18)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
                <img src="/logo.png" alt="BPI" style={{height:44,objectFit:"contain"}}/>
              </div>
              <div style={{fontSize:20,fontWeight:700,color:C.t1,letterSpacing:"-0.03em",marginBottom:8}}>BPI Agadir Tracker</div>
              <div style={{fontSize:14,color:C.t4,lineHeight:1.7,maxWidth:260,margin:"0 auto"}}>
                Select Sample to register a ticket<br/>or Truck to log a transport
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
