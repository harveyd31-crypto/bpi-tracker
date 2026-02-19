import { useState, useEffect, useRef } from "react";

// Logo is served from /logo.png

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

// ─── Cloudinary config ────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD = "digrxz7uv";
const CLOUDINARY_API_KEY = "726779314616755";
const CLOUDINARY_API_SECRET = "WsjsXW2yg6iJCOiIbp8-4LS_150";
const CLOUDINARY_UPLOAD_PRESET = "bpi_tracker"; // unsigned preset (created below)

async function uploadToCloudinary(file, folder) {
  // Use unsigned upload with a preset named "bpi_tracker"
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", `bpi-tracker/${folder}`);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("Cloudinary upload failed: " + res.status);
  const data = await res.json();
  return data.secure_url; // URL of uploaded image
}

const SAMPLE_KEY = "bpi-sample-active-v4";
const TRUCK_KEY  = "bpi-truck-active-v4";
const LOG_KEY    = "bpi-log-v4";
const POLL_MS    = 3000;

// ─── Storage shim (window.storage in Claude artifacts, localStorage on Vercel) ──
const _localStorage = {
  get: async (key) => {
    const val = localStorage.getItem(key);
    if (val === null) throw new Error("Key not found: " + key);
    return { key, value: val };
  },
  set: async (key, value) => {
    localStorage.setItem(key, value);
    return { key, value };
  },
  delete: async (key) => {
    localStorage.removeItem(key);
    return { key, deleted: true };
  },
  list: async (prefix) => {
    const keys = Object.keys(localStorage).filter(k => !prefix || k.startsWith(prefix));
    return { keys, prefix };
  }
};
if (typeof window !== "undefined" && !window.storage) {
  window.storage = _localStorage;
}

// ─── Design System (Opus redesign) ───────────────────────────────────────────
const BG0    = "#0f0f12";
const BG1    = "#16161a";
const BG2    = "#1c1c22";
const BG3    = "#24242c";
const BORDER = "#27272a";
const GLASS  = "rgba(255,255,255,0.03)";

const ACCENT  = "#d4a853";
const SUCCESS = "#34d399";
const INFO    = "#60a5fa";
const WARNING = "#fbbf24";
const DANGER  = "#f87171";
const ORANGE  = "#fb923c";

const TEXT1 = "#fafafa";
const TEXT2 = "#a1a1aa";
const TEXT3 = "#52525b";

const SAMPLE_STAGES = [
  { id:"collected",   label:"Collected",       sub:"Ticket scanned & logged",   color:ACCENT   },
  { id:"stock",       label:"At Stock",         sub:"Delivered to stockyard",    color:SUCCESS  },
  { id:"preparation", label:"In Preparation",   sub:"Sample being prepared",     color:ORANGE   },
  { id:"lab",         label:"At Lab",           sub:"Sent to laboratory",        color:INFO     },
];
const TRUCK_STAGES = [
  { id:"loaded",   label:"Truck Loaded",    sub:"Ticket scanned at mine",    color:ACCENT  },
  { id:"unloaded", label:"Truck Unloaded",  sub:"Weights logged in Agadir",  color:SUCCESS },
];

const fmt = iso => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
};
const fmtCoords = (lat,lng) => lat&&lng
  ? `${Math.abs(lat).toFixed(4)}°${lat>=0?"N":"S"}  ${Math.abs(lng).toFixed(4)}°${lng>=0?"E":"W"}`
  : null;

// ─── Shared style objects ────────────────────────────────────────────────────
const card = {
  background: `linear-gradient(135deg, ${BG2} 0%, ${BG1} 100%)`,
  border: `1px solid ${BORDER}`,
  borderRadius: 20,
  padding: "24px",
  marginBottom: 16,
  boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 1px 0 ${GLASS} inset`,
};
const inputSt = {
  width:"100%", boxSizing:"border-box",
  padding:"16px 18px", fontSize:16, fontWeight:500,
  borderRadius:14, background:BG1,
  border:`2px solid ${BORDER}`, color:TEXT1,
  outline:"none", fontFamily:"inherit",
  transition:"all 0.2s ease",
};
const lblSt = {
  fontSize:12, fontWeight:600, color:TEXT2,
  letterSpacing:"0.04em", textTransform:"uppercase",
  display:"block", marginBottom:10,
};
const btnBig = (col=ACCENT, disabled=false) => ({
  background: disabled ? BG3 : `linear-gradient(135deg, ${col} 0%, ${col}dd 100%)`,
  color: disabled ? TEXT3 : BG0,
  border:"none", borderRadius:16,
  padding:"20px 28px", cursor:disabled?"not-allowed":"pointer",
  fontFamily:"inherit", fontWeight:700, fontSize:16,
  letterSpacing:"0.02em", width:"100%",
  display:"flex", alignItems:"center", justifyContent:"center", gap:12,
  boxShadow: disabled ? "none" : `0 4px 16px ${col}44`,
  transition:"all 0.2s ease", minHeight:56,
});
const btnMd = (col=ACCENT, ghost=false) => ({
  background: ghost ? "transparent" : col,
  color: ghost ? col : BG0,
  border: `2px solid ${col}`,
  borderRadius:12, padding:"14px 20px",
  cursor:"pointer", fontFamily:"inherit",
  fontWeight:700, fontSize:14,
  letterSpacing:"0.02em", minHeight:52,
  transition:"all 0.2s ease",
});
const btnSm = {
  background:"transparent", border:`1px solid ${BORDER}`,
  borderRadius:8, color:TEXT2, padding:"8px 14px",
  cursor:"pointer", fontFamily:"inherit",
  fontSize:12, fontWeight:600, letterSpacing:"0.04em",
  transition:"all 0.15s ease",
};
const pill = col => ({
  background:`${col}18`, border:`1px solid ${col}44`,
  borderRadius:20, padding:"4px 12px",
  fontSize:11, color:col, fontWeight:700,
  letterSpacing:"0.06em",
});

// ─── Field input ─────────────────────────────────────────────────────────────
function Field({label,value,onChange,placeholder,readOnly=false,highlight=false,big=false}) {
  const [focused,setFocused] = useState(false);
  return (
    <div style={{marginBottom:16}}>
      <label style={{...lblSt,color:highlight?ACCENT:TEXT2}}>{label}</label>
      <input
        value={value||""} onChange={onChange} placeholder={placeholder}
        readOnly={readOnly}
        onFocus={()=>setFocused(true)}
        onBlur={()=>setFocused(false)}
        style={{
          ...inputSt,
          fontSize:big?20:16, fontWeight:big?700:500,
          color:readOnly?TEXT3:highlight?ACCENT:TEXT1,
          borderColor:focused?ACCENT:highlight?`${ACCENT}55`:BORDER,
          boxShadow:focused?`0 0 0 4px ${ACCENT}22`:"none",
          background:readOnly?`${BG3}88`:BG1,
          cursor:readOnly?"default":"text",
        }}
      />
    </div>
  );
}

// ─── Claude OCR ──────────────────────────────────────────────────────────────
async function claudeScan(imageB64, mediaType, context) {
  const prompt = context==="sample"
    ? `BPI Agadir barite sample ticket. Extract ALL fields. Return ONLY JSON:
{"ticketNo":"","date":"","supplier":"","mineReference":"","tonnage":"","collectionPoint":"","notes":""}
ONLY JSON.`
    : `BPI Agadir Bon de Transport. Extract ALL fields. Return ONLY JSON:
{"ticketNo":"","date":"","lieuChargement":"","lieuLivraison":"","marchandise":"","transporteur":"","immatriculation":"","heureDepart":"","fournisseur":"","mineReference":"","qualiteProduit":"","poidsBrut":"","poidsTare":"","poidsNet":"","responsableStock":"","numeroChauffeur":"","societe":""}
ONLY JSON.`;
  const resp = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:mediaType||"image/jpeg",data:imageB64}},{type:"text",text:prompt}]}]})
  });
  const data = await resp.json();
  if(data.error) throw new Error(data.error.message);
  const text = data.content.map(c=>c.text||"").join("").trim().replace(/```json|```/g,"").trim();
  return JSON.parse(text);
}
async function fileToB64(file) {
  return new Promise((res,rej)=>{const r=new FileReader();r.onload=ev=>res(ev.target.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
}

// ─── Map embed ───────────────────────────────────────────────────────────────
function MapEmbed({lat,lng}) {
  const [exp,setExp] = useState(false);
  const url = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.02},${lat-0.015},${lng+0.02},${lat+0.015}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <div style={{marginTop:12,borderRadius:14,overflow:"hidden",border:`1px solid ${BORDER}`}}>
      <div onClick={()=>setExp(e=>!e)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",cursor:"pointer",background:BG3,gap:12}}>
        <span style={{fontSize:13,color:ACCENT,fontWeight:600}}>📍 {fmtCoords(lat,lng)}</span>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{...btnSm,textDecoration:"none",color:ACCENT,borderColor:`${ACCENT}44`,padding:"6px 12px"}}>Open ↗</a>
          <span style={{color:TEXT2,fontSize:13}}>{exp?"▲":"▼"}</span>
        </div>
      </div>
      {exp && <div style={{height:190}}><iframe src={url} style={{width:"100%",height:"100%",border:"none",filter:"invert(90%) hue-rotate(180deg) saturate(0.6)"}} title="map" loading="lazy"/></div>}
    </div>
  );
}

// ─── GPS Capture ─────────────────────────────────────────────────────────────
function GpsCapture({geoStatus,setGeoStatus,pendingGeo,setPendingGeo}) {
  function request() {
    if(!navigator.geolocation){setGeoStatus("denied");return;}
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      pos=>{setPendingGeo({lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:Math.round(pos.coords.accuracy)});setGeoStatus("done");},
      ()=>setGeoStatus("denied"),
      {enableHighAccuracy:true,timeout:12000}
    );
  }
  return (
    <div style={{marginBottom:16}}>
      {geoStatus==="idle" && <button onClick={request} style={{...btnMd(ACCENT,true),width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>📍 Capture GPS Location</button>}
      {geoStatus==="locating" && (
        <div style={{...card,display:"flex",alignItems:"center",gap:14,justifyContent:"center",padding:"18px 24px"}}>
          <div style={{width:20,height:20,border:`3px solid ${ACCENT}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
          <span style={{color:ACCENT,fontSize:15,fontWeight:600}}>Acquiring GPS…</span>
        </div>
      )}
      {geoStatus==="denied" && <div style={{...card,color:ORANGE,fontSize:14,textAlign:"center",padding:"16px 24px"}}>⚠ Location access denied — GPS is optional</div>}
      {geoStatus==="done" && pendingGeo && (
        <div style={{...card,borderColor:`${SUCCESS}44`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"16px 20px"}}>
          <div>
            <div style={{fontSize:13,color:SUCCESS,fontWeight:700,marginBottom:4}}>✓ GPS Captured</div>
            <div style={{fontSize:12,color:TEXT2}}>{fmtCoords(pendingGeo.lat,pendingGeo.lng)} · ±{pendingGeo.accuracy}m</div>
          </div>
          <button onClick={request} style={btnSm}>↻ Recapture</button>
        </div>
      )}
    </div>
  );
}

// ─── Scan Panel ───────────────────────────────────────────────────────────────
function ScanPanel({context,onScanned,existingData={},onManual}) {
  const [state,setState] = useState("idle");
  const [msg,setMsg]     = useState("");
  const [preview,setPreview] = useState(null);
  const [extracted,setExtracted] = useState(null);
  const [edited,setEdited] = useState({});
  const [geoCapture,setGeoCapture] = useState(null);
  const [geoMsg,setGeoMsg] = useState("");
  const [confirming,setConfirming] = useState(false);
  const cameraRef = useRef(null);
  const uploadRef = useRef(null);

  const SFIELDS=[["ticketNo","Ticket No"],["date","Date"],["supplier","Supplier"],["mineReference","Mine Reference"],["tonnage","Tonnage"],["collectionPoint","Collection Point"],["notes","Notes"]];
  const TFIELDS=[["ticketNo","N° Ticket"],["date","Date"],["lieuChargement","Lieu chargement"],["lieuLivraison","Lieu livraison"],["marchandise","Marchandise"],["transporteur","Transporteur"],["immatriculation","Immatriculation"],["heureDepart","Heure départ"],["fournisseur","Fournisseur"],["mineReference","Mine Reference"],["qualiteProduit","Qualité produit"],["poidsBrut","Poids brut"],["poidsTare","Poids tare"],["poidsNet","Poids net"],["responsableStock","Responsable stock"],["numeroChauffeur","N° Chauffeur"],["societe","Société"]];
  const fields = context==="sample"?SFIELDS:TFIELDS;
  const weightFields = ["poidsBrut","poidsTare","poidsNet"];

  function reset(){setState("idle");setPreview(null);setExtracted(null);setEdited({});setGeoCapture(null);setGeoMsg("");setConfirming(false);}

  function captureGpsAuto() {
    if(!navigator.geolocation){setGeoMsg("GPS unavailable");return;}
    setGeoMsg("📍 Capturing GPS…");
    navigator.geolocation.getCurrentPosition(
      pos=>{
        const g={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:Math.round(pos.coords.accuracy)};
        setGeoCapture(g);
        setGeoMsg(`✓ ${fmtCoords(g.lat,g.lng)} ±${g.accuracy}m`);
      },
      ()=>setGeoMsg("GPS denied — location not recorded"),
      {enableHighAccuracy:true,timeout:12000}
    );
  }

  async function handle(file) {
    if(!file) return;
    const reader=new FileReader();reader.onload=ev=>setPreview(ev.target.result);reader.readAsDataURL(file);
    setState("scanning");setMsg("Claude is reading your ticket…");
    captureGpsAuto();
    // Upload photo to Cloudinary (background, non-blocking)
    const folder = context==="sample" ? "sample-tickets" : "truck-tickets";
    let photoUrlPromise = uploadToCloudinary(file, folder).catch(err=>{
      console.warn("Photo upload failed:", err.message);
      return null;
    });
    try {
      const b64 = await fileToB64(file);
      const result = await claudeScan(b64,file.type,context);
      const photoUrl = await photoUrlPromise;
      setExtracted(result);
      setEdited({...existingData,...result,...(photoUrl?{_photoUrl:photoUrl}:{})});
      setState("done");setMsg("✓ Ticket read — verify below" + (photoUrl?" 📸":""));
    } catch(err) {
      setState("error");
      const isKeyMissing = !import.meta.env.VITE_ANTHROPIC_API_KEY;
      setMsg(isKeyMissing ? "API key not set in Vercel — fill fields manually below" : "Scan failed: "+err.message);
      setEdited({...existingData});
    }
  }

  async function handleConfirm() {
    const filled = Object.keys(edited).filter(k=>edited[k]&&k!=="_scanned"&&k!=="_geo");
    if(filled.length===0){alert("Please fill in at least one field before confirming.");return;}
    setConfirming(true);
    try {
      await onScanned({...edited,_scanned:true,_geo:geoCapture||null});
    } catch(err) {
      console.error("Confirm error:",err);
      alert("Error saving: "+(err.message||String(err)));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={e=>{reset();setTimeout(()=>handle(e.target.files[0]),50);}} style={{display:"none"}}/>
      <input ref={uploadRef} type="file" accept="image/*" onChange={e=>{reset();setTimeout(()=>handle(e.target.files[0]),50);}} style={{display:"none"}}/>

      {/* Scan buttons */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <button onClick={()=>{reset();cameraRef.current?.click();}} style={{...btnBig(ACCENT),borderRadius:16,fontSize:15}}>
          📷 Take Photo
        </button>
        <button onClick={()=>{reset();uploadRef.current?.click();}} style={{
          ...btnBig(BG3),color:ACCENT,
          border:`2px solid ${ACCENT}44`,
          boxShadow:"none",borderRadius:16,fontSize:15,
        }}>
          🖼 Upload
        </button>
      </div>

      <div style={{fontSize:12,color:TEXT3,marginBottom:16,textAlign:"center",lineHeight:1.8}}>
        Take a photo or upload an image of the ticket
      </div>

      {preview && (
        <div style={{marginBottom:16,borderRadius:14,overflow:"hidden",border:`1px solid ${BORDER}`,position:"relative"}}>
          <img src={preview} alt="ticket" style={{width:"100%",maxHeight:220,objectFit:"cover",display:"block"}}/>
          <button onClick={reset} style={{position:"absolute",top:10,right:10,background:"rgba(0,0,0,0.7)",border:"none",borderRadius:8,color:TEXT1,padding:"6px 12px",cursor:"pointer",fontSize:13,fontWeight:600}}>✕</button>
        </div>
      )}

      {state==="scanning" && (
        <div style={{...card,display:"flex",alignItems:"center",gap:14,justifyContent:"center",padding:"22px 24px"}}>
          <div style={{width:22,height:22,border:`3px solid ${ACCENT}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
          <span style={{color:ACCENT,fontSize:15,fontWeight:600}}>{msg}</span>
        </div>
      )}
      {state==="error" && <div style={{...card,borderColor:`${DANGER}44`,background:`${DANGER}0a`,color:DANGER,fontSize:14,textAlign:"center",padding:"18px 24px"}}>⚠ {msg}</div>}

      {geoMsg && (state==="scanning"||state==="done"||state==="error") && (
        <div style={{fontSize:12,color:geoCapture?SUCCESS:TEXT2,marginBottom:12,textAlign:"center",fontWeight:600}}>
          {geoMsg}
        </div>
      )}

      {(state==="done"||state==="error") && (
        <div style={{...card,borderColor:state==="done"?`${SUCCESS}44`:BORDER}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <span style={{fontSize:14,color:state==="done"?SUCCESS:TEXT2,fontWeight:700}}>{state==="done"?"✓ Verify extracted fields":"Enter fields manually"}</span>
            {onManual && <button onClick={onManual} style={btnSm}>Manual entry</button>}
          </div>

          {context==="truck" && (
            <div style={{marginBottom:20,background:BG3,borderRadius:14,padding:"16px 18px",border:`1px solid ${ACCENT}33`}}>
              <div style={{...lblSt,color:ACCENT,marginBottom:12}}>⚖ Weights</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 12px"}}>
                {weightFields.map(k=>{
                  const lbl={poidsBrut:"Poids brut",poidsTare:"Poids tare",poidsNet:"Poids net"}[k];
                  return <Field key={k} label={lbl} value={edited[k]||""} onChange={e=>setEdited(p=>({...p,[k]:e.target.value}))} placeholder="e.g. 32 T" highlight big/>;
                })}
              </div>
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
            {fields.filter(([k])=>!weightFields.includes(k)).map(([k,l])=>{
              const changed = extracted&&extracted[k]&&extracted[k]!==existingData?.[k];
              return (
                <div key={k} style={{marginBottom:4}}>
                  <label style={{...lblSt,color:changed?ACCENT:TEXT2}}>{l}</label>
                  <input value={edited[k]||""} onChange={e=>setEdited(p=>({...p,[k]:e.target.value}))}
                    style={{...inputSt,fontSize:14,borderColor:changed?`${ACCENT}55`:BORDER}}/>
                </div>
              );
            })}
          </div>
          <div style={{marginTop:20}}>
            {!edited.ticketNo && !edited.supplier && (
              <div style={{fontSize:12,color:WARNING,marginBottom:10,textAlign:"center"}}>
                ⚠ Fill in at least Ticket No or Supplier before confirming
              </div>
            )}
            <button
              onClick={handleConfirm}
              disabled={confirming}
              style={{...btnBig(SUCCESS,confirming)}}>
              {confirming ? "Saving…" : "✓ Confirm & Log"}
            </button>
          </div>
        </div>
      )}

      {state==="idle" && onManual && (
        <button onClick={onManual} style={{...btnMd(ACCENT,true),width:"100%",marginTop:4,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>✏ Enter manually instead</button>
      )}
    </div>
  );
}

// ─── Pipeline stepper ─────────────────────────────────────────────────────────
function Pipeline({stages,currentIndex,history,children}) {
  return (
    <div style={{padding:"0 4px"}}>
      {stages.map((stage,i)=>{
        const isDone    = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isPending = i > currentIndex;
        const ts = history?.[stage.id];
        return (
          <div key={stage.id} style={{display:"flex",gap:16}}>
            {/* Timeline column */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:44,flexShrink:0}}>
              <div style={{
                width:44,height:44,borderRadius:14,
                background: isCurrent ? stage.color : isDone ? `${stage.color}20` : BG2,
                border:`2px solid ${isDone||isCurrent?stage.color:BORDER}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:15,color:isCurrent?BG0:isDone?stage.color:TEXT3,
                fontWeight:700,transition:"all 0.3s ease",flexShrink:0,
                boxShadow:isCurrent?`0 0 20px ${stage.color}50`:"none",
              }}>
                {isDone ? "✓" : i+1}
              </div>
              {i < stages.length-1 && (
                <div style={{width:3,flex:1,minHeight:28,background:isDone?stage.color:BORDER,borderRadius:2,margin:"8px 0"}}/>
              )}
            </div>
            {/* Content column */}
            <div style={{flex:1,paddingBottom:i<stages.length-1?24:0,paddingTop:4,opacity:isPending?0.4:1,transition:"opacity 0.3s"}}>
              <div style={{
                background:isCurrent?`${stage.color}08`:undefined,
                border:isCurrent?`1px solid ${stage.color}30`:"1px solid transparent",
                borderRadius:isCurrent?16:0,
                padding:isCurrent?"18px 18px":"2px 0",
                transition:"all 0.3s",
              }}>
                <div style={{fontSize:16,fontWeight:600,color:isCurrent?stage.color:isDone?TEXT1:TEXT3,marginBottom:4,display:"flex",alignItems:"center",gap:10}}>
                  {stage.label}
                  {isCurrent && <span style={pill(stage.color)}>NOW</span>}
                </div>
                <div style={{fontSize:13,color:TEXT2}}>{ts?fmt(ts):stage.sub}</div>
                {children?.(stage,i,isCurrent,isDone)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Toast Notification ───────────────────────────────────────────────────────
function Toast({msg,onClose}) {
  if(!msg) return null;
  return (
    <div style={{
      position:"fixed",bottom:100,left:16,right:16,zIndex:3000,
      background:`linear-gradient(135deg,${BG2},${BG1})`,
      border:`1px solid ${ACCENT}44`,
      borderRadius:20,padding:"16px 20px",
      boxShadow:`0 8px 32px rgba(0,0,0,0.6),0 0 0 1px ${ACCENT}22`,
      display:"flex",alignItems:"center",gap:14,
      animation:"slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      <div style={{width:40,height:40,borderRadius:12,background:`${ACCENT}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18}}>◈</div>
      <span style={{flex:1,color:TEXT1,fontSize:14,fontWeight:500,lineHeight:1.5}}>{msg}</span>
      <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:TEXT2,fontSize:20,lineHeight:1,padding:"4px"}}>×</button>
    </div>
  );
}

// ─── Active Card (hero) ───────────────────────────────────────────────────────
function ActiveCard({type,ticket,currentStage,stages,geo,onClear}) {
  const stage = stages.find(s=>s.id===currentStage);
  const isTruck = type==="truck";
  return (
    <div style={{
      ...card,
      borderColor:`${stage?.color}44`,
      background:`linear-gradient(135deg,${BG2} 0%,${BG1} 100%)`,
      position:"relative",overflow:"hidden",
    }}>
      {/* Glow blob */}
      <div style={{position:"absolute",top:-40,right:-40,width:140,height:140,borderRadius:"50%",background:`${stage?.color}12`,filter:"blur(30px)",pointerEvents:"none"}}/>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:16}}>
        <div>
          <div style={{fontSize:11,color:TEXT2,letterSpacing:"0.14em",fontWeight:600,marginBottom:8}}>
            {isTruck?"🚛 ACTIVE TRUCK":"🧪 ACTIVE SAMPLE"}
          </div>
          <div style={{fontSize:22,fontWeight:700,color:TEXT1,lineHeight:1.2,marginBottom:6}}>
            {isTruck ? ticket?.ticketNo||"—" : ticket?.ticketNo||"—"}
          </div>
          <div style={{fontSize:15,color:TEXT2,fontWeight:500}}>
            {isTruck
              ? `${ticket?.immatriculation||"—"} · ${ticket?.fournisseur||"—"}`
              : `${ticket?.supplier||"—"} · ${ticket?.mineReference||"—"}`}
          </div>
        </div>
        <button onClick={onClear} style={{...btnSm,color:DANGER,borderColor:`${DANGER}44`,flexShrink:0}}>✕ Clear</button>
      </div>

      {/* Stage badge */}
      <div style={{display:"inline-flex",alignItems:"center",gap:10,background:`${stage?.color}14`,border:`1px solid ${stage?.color}44`,borderRadius:12,padding:"10px 16px"}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:stage?.color,animation:"pulse 2s infinite"}}/>
        <span style={{fontSize:14,color:stage?.color,fontWeight:700}}>{stage?.label}</span>
      </div>

      {/* Truck weights */}
      {isTruck && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:16}}>
          {[["poidsBrut","Brut"],["poidsTare","Tare"],["poidsNet","Net"]].map(([k,l])=>(
            <div key={k} style={{background:BG3,borderRadius:12,padding:"12px 14px",border:`1px solid ${ticket?.[k]&&ticket?.[k]!=="TBD"?SUCCESS:BORDER}44`}}>
              <div style={{fontSize:10,color:TEXT3,letterSpacing:"0.1em",marginBottom:6}}>{l.toUpperCase()}</div>
              <div style={{fontSize:17,fontWeight:700,color:ticket?.[k]&&ticket?.[k]!=="TBD"?SUCCESS:TEXT3}}>{ticket?.[k]||"TBD"}</div>
            </div>
          ))}
        </div>
      )}

      {geo && <MapEmbed lat={geo.lat} lng={geo.lng}/>}
    </div>
  );
}

// ─── Sample Module ────────────────────────────────────────────────────────────
function SampleModule({notify,addLog}) {
  const [data,setData]       = useState(null);
  const [loading,setLoading] = useState(true);
  const [manualMode,setManualMode] = useState(false);
  const [form,setForm]       = useState({});
  const lastRef = useRef(null); const pollRef = useRef(null);

  async function load(notif=true) {
    try {
      const r = await window.storage.get(SAMPLE_KEY,true);
      if(r){const d=JSON.parse(r.value);setData(d);
        if(notif&&lastRef.current!==null&&lastRef.current!==d.currentStage){
          const s=SAMPLE_STAGES.find(x=>x.id===d.currentStage);const t=d.ticket||{};
          notify(`🧪 ${t.ticketNo||""} / ${t.supplier||""} / ${t.mineReference||""} → ${s?.label}`);
        }
        lastRef.current=d.currentStage;
      } else setData(null);
    } catch {setData(null);}
    setLoading(false);
  }
  useEffect(()=>{load(false);pollRef.current=setInterval(()=>load(true),POLL_MS);return()=>clearInterval(pollRef.current);},[]);

  function makeLabel(t){return`SAMPLE: ${t.ticketNo||"—"} / ${t.supplier||"—"} / ${t.mineReference||"—"} / ${t.tonnage||"TBD"}`;}

  async function register(scannedData) {
    // extract _geo from scanned data, rest is ticket fields
    const {_scanned,_geo,...ticket} = scannedData;
    const geo = _geo || null;
    const entry={ticket,currentStage:"collected",history:{collected:new Date().toISOString()},geo};
    await window.storage.set(SAMPLE_KEY,JSON.stringify(entry),true);
    addLog({id:`S-${Date.now()}`,type:"sample",label:makeLabel(ticket),ticket,stageHistory:[{stage:"collected",label:"Collected",ts:new Date().toISOString()}],geo});
    setData(entry);lastRef.current="collected";setForm({});setManualMode(false);
    notify(`✓ 🧪 ${makeLabel(ticket)} → Collected`);
  }

  async function advance(stageId,updatedTicket=null) {
    const stage=SAMPLE_STAGES.find(s=>s.id===stageId);
    const newT=updatedTicket||data.ticket;
    const updated={...data,ticket:newT,currentStage:stageId,history:{...data.history,[stageId]:new Date().toISOString()}};
    await window.storage.set(SAMPLE_KEY,JSON.stringify(updated),true);
    addLog({id:`S-${Date.now()}`,type:"sample",label:makeLabel(newT),ticket:newT,stageHistory:[{stage:stageId,label:stage.label,ts:new Date().toISOString()}],geo:data.geo||null});
    setData(updated);lastRef.current=stageId;
    notify(`🧪 ${makeLabel(newT)} → ${stage.label}`);
  }

  async function clear(){await window.storage.delete(SAMPLE_KEY,true);setData(null);lastRef.current=null;}

  const ci = data ? SAMPLE_STAGES.findIndex(s=>s.id===data.currentStage) : -1;
  const SFIELDS=[["ticketNo","Ticket No"],["date","Date"],["supplier","Supplier"],["mineReference","Mine Reference"],["tonnage","Tonnage"],["collectionPoint","Collection Point"],["notes","Notes"]];

  if(loading) return <div style={{color:TEXT3,padding:40,fontSize:14,textAlign:"center"}}>Loading…</div>;

  return (
    <div>
      {!data && (
        <div>
          {!manualMode
            ? <ScanPanel context="sample" onScanned={register} onManual={()=>setManualMode(true)}/>
            : (
              <div style={card}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <span style={{fontSize:15,color:TEXT1,fontWeight:700}}>Manual Entry</span>
                  <button onClick={()=>setManualMode(false)} style={btnSm}>← Scan instead</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                  {SFIELDS.map(([k,l])=>(<Field key={k} label={l} value={form[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={l}/>))}
                </div>
                <button onClick={()=>register(form)} disabled={!form.ticketNo} style={btnBig(ACCENT,!form.ticketNo)}>✓ Register Sample</button>
              </div>
            )
          }
        </div>
      )}

      {data && (
        <div>
          <ActiveCard type="sample" ticket={data.ticket} currentStage={data.currentStage} stages={SAMPLE_STAGES} geo={data.geo} onClear={clear}/>
          <Pipeline stages={SAMPLE_STAGES} currentIndex={ci} history={data.history}>
            {(stage,i,isCurrent)=>(
              <div>
                {i===ci+1 && (
                  <div style={{marginTop:16}}>
                    <ScanPanel context="sample" onScanned={scanned=>advance(stage.id,{...data.ticket,...scanned})}/>
                  </div>
                )}
              </div>
            )}
          </Pipeline>
          {ci===SAMPLE_STAGES.length-1 && (
            <div style={{...card,borderColor:`${INFO}44`,background:`${INFO}0a`,marginTop:16,textAlign:"center",padding:"32px 24px"}}>
              <div style={{fontSize:28,marginBottom:12}}>◈</div>
              <div style={{fontSize:18,color:INFO,fontWeight:700}}>All stages complete</div>
              <div style={{fontSize:13,color:TEXT2,marginTop:6}}>Sample has arrived at the lab</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Truck Module ─────────────────────────────────────────────────────────────
function TruckModule({notify,addLog}) {
  const [data,setData]       = useState(null);
  const [loading,setLoading] = useState(true);
  const [manualMode,setManualMode] = useState(false);
  const [form,setForm]       = useState({});
  const lastRef = useRef(null); const pollRef = useRef(null);

  async function load(notif=true) {
    try {
      const r = await window.storage.get(TRUCK_KEY,true);
      if(r){const d=JSON.parse(r.value);setData(d);
        if(notif&&lastRef.current!==null&&lastRef.current!==d.currentStage){
          const s=TRUCK_STAGES.find(x=>x.id===d.currentStage);const t=d.ticket||{};
          const ton=t.poidsNet&&t.poidsNet!=="TBD"?t.poidsNet:"TBD";
          notify(`🚛 ${t.ticketNo||""} / ${t.immatriculation||""} / ${t.fournisseur||""} / ${ton} → ${s?.label}`);
        }
        lastRef.current=d.currentStage;
      } else setData(null);
    } catch {setData(null);}
    setLoading(false);
  }
  useEffect(()=>{load(false);pollRef.current=setInterval(()=>load(true),POLL_MS);return()=>clearInterval(pollRef.current);},[]);

  function makeTruckLabel(t){const ton=t.poidsNet&&t.poidsNet!=="TBD"?t.poidsNet:t.poidsBrut&&t.poidsBrut!=="TBD"?"~"+t.poidsBrut:"TBD";return`TRUCK: ${t.ticketNo||"—"} / ${t.immatriculation||"—"} / ${t.fournisseur||"—"} / ${t.mineReference||"—"} / ${ton}`;}

  async function registerLoaded(ticket) {
    const t={poidsBrut:"TBD",poidsTare:"TBD",poidsNet:"TBD",...ticket};
    const entry={ticket:t,currentStage:"loaded",history:{loaded:new Date().toISOString()}};
    await window.storage.set(TRUCK_KEY,JSON.stringify(entry),true);
    addLog({id:`T-${Date.now()}`,type:"truck",label:makeTruckLabel(t),ticket:t,stageHistory:[{stage:"loaded",label:"Truck Loaded",ts:new Date().toISOString()}]});
    setData(entry);lastRef.current="loaded";setForm({});setManualMode(false);
    notify(`✓ 🚛 ${makeTruckLabel(t)} → Truck Loaded`);
  }

  async function logUnloaded(scanned) {
    const merged={...data.ticket,...scanned};
    const updated={...data,ticket:merged,currentStage:"unloaded",history:{...data.history,unloaded:new Date().toISOString()}};
    await window.storage.set(TRUCK_KEY,JSON.stringify(updated),true);
    addLog({id:`T-${Date.now()}`,type:"truck",label:makeTruckLabel(merged),ticket:merged,stageHistory:[{stage:"unloaded",label:"Truck Unloaded",ts:new Date().toISOString()}]});
    setData(updated);lastRef.current="unloaded";
    notify(`🚛 ${makeTruckLabel(merged)} → Truck Unloaded`);
  }

  async function clear(){await window.storage.delete(TRUCK_KEY,true);setData(null);lastRef.current=null;}

  const ci = data ? TRUCK_STAGES.findIndex(s=>s.id===data.currentStage) : -1;
  const t = data?.ticket||{};
  const TFIELDS=[["ticketNo","N° Ticket"],["date","Date"],["lieuChargement","Lieu chargement"],["lieuLivraison","Lieu livraison"],["marchandise","Marchandise"],["transporteur","Transporteur"],["immatriculation","Immatriculation"],["heureDepart","Heure départ"],["fournisseur","Fournisseur"],["mineReference","Mine Reference"],["qualiteProduit","Qualité produit"],["responsableStock","Responsable stock"],["numeroChauffeur","N° Chauffeur"],["societe","Société"]];

  if(loading) return <div style={{color:TEXT3,padding:40,fontSize:14,textAlign:"center"}}>Loading…</div>;

  return (
    <div>
      {!data && (
        <div>
          <div style={{...card,borderColor:`${ACCENT}33`,marginBottom:16}}>
            <div style={{fontSize:15,color:ACCENT,fontWeight:700,marginBottom:6}}>🚛 Bon de Transport — Truck Loaded</div>
            <div style={{fontSize:13,color:TEXT2,lineHeight:1.7}}>Scan the paper ticket. Weights will be logged by the stock manager in Agadir.</div>
          </div>
          {!manualMode
            ? <ScanPanel context="truck" onScanned={registerLoaded} onManual={()=>setManualMode(true)}/>
            : (
              <div style={card}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <span style={{fontSize:15,color:TEXT1,fontWeight:700}}>Manual Entry</span>
                  <button onClick={()=>setManualMode(false)} style={btnSm}>← Scan instead</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                  {TFIELDS.map(([k,l])=>(<Field key={k} label={l} value={form[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={l}/>))}
                </div>
                <div style={{...card,borderColor:`${ACCENT}33`,marginTop:4,marginBottom:16,padding:"16px 18px"}}>
                  <div style={{...lblSt,color:ACCENT,marginBottom:10}}>⚖ Weights — to be logged at Agadir</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 12px"}}>
                    {["Poids brut","Poids tare","Poids net"].map(l=>(<Field key={l} label={l} value="TBD" readOnly/>))}
                  </div>
                </div>
                <button onClick={()=>registerLoaded(form)} disabled={!form.ticketNo} style={btnBig(ACCENT,!form.ticketNo)}>✓ Log Truck Loaded</button>
              </div>
            )
          }
        </div>
      )}

      {data && (
        <div>
          <ActiveCard type="truck" ticket={t} currentStage={data.currentStage} stages={TRUCK_STAGES} geo={null} onClear={clear}/>
          <Pipeline stages={TRUCK_STAGES} currentIndex={ci} history={data.history}>
            {(stage,i,isCurrent)=>(
              <div>
                {stage.id==="unloaded"&&isCurrent && (
                  <div style={{marginTop:16}}>
                    <div style={{...lblSt,color:ACCENT,marginBottom:12}}>📷 Scan ticket — Claude reads all fields + weights</div>
                    <ScanPanel context="truck" onScanned={logUnloaded} existingData={data.ticket}/>
                  </div>
                )}
              </div>
            )}
          </Pipeline>
          {ci===TRUCK_STAGES.length-1 && (
            <div style={{...card,borderColor:`${SUCCESS}44`,background:`${SUCCESS}0a`,marginTop:16,textAlign:"center",padding:"32px 24px"}}>
              <div style={{fontSize:28,marginBottom:12}}>◈</div>
              <div style={{fontSize:18,color:SUCCESS,fontWeight:700}}>Truck cycle complete</div>
              <div style={{fontSize:13,color:TEXT2,marginTop:6}}>Net weight: {t.poidsNet||"—"}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Log Module ───────────────────────────────────────────────────────────────
function LogModule({entries}) {
  const [expanded,setExpanded] = useState({});
  const toggle = id => setExpanded(p=>({...p,[id]:!p[id]}));

  if(!entries.length) return (
    <div style={{...card,textAlign:"center",padding:"60px 24px"}}>
      <div style={{fontSize:40,marginBottom:16}}>📋</div>
      <div style={{fontSize:16,color:TEXT2,fontWeight:600}}>No log entries yet</div>
      <div style={{fontSize:13,color:TEXT3,marginTop:8}}>Registered samples and trucks will appear here</div>
    </div>
  );

  return (
    <div>
      <div style={{fontSize:11,color:TEXT2,letterSpacing:"0.14em",fontWeight:700,marginBottom:16}}>{entries.length} ENTRIES — NEWEST FIRST</div>
      {entries.map(entry=>{
        const isTruck = entry.type==="truck";
        const color   = isTruck ? SUCCESS : ACCENT;
        const icon    = isTruck ? "🚛" : "🧪";
        const lastStage = entry.stageHistory?.[entry.stageHistory.length-1];
        const et = entry.ticket||{};
        const isOpen = expanded[entry.id];
        return (
          <div key={entry.id} style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
            <div onClick={()=>toggle(entry.id)} style={{padding:"18px 20px",cursor:"pointer",display:"flex",alignItems:"flex-start",gap:14,justifyContent:"space-between"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <div style={{width:36,height:36,borderRadius:10,background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{icon}</div>
                  <span style={pill(color)}>{isTruck?"TRUCK":"SAMPLE"}</span>
                </div>
                <div style={{fontSize:14,color:TEXT1,fontWeight:600,marginBottom:6,lineHeight:1.4}}>{entry.label}</div>
                {lastStage && <div style={{fontSize:12,color:TEXT2}}>⟶ {lastStage.label} · {fmt(lastStage.ts)}</div>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                {entry.geo && <span style={{fontSize:13,color:ACCENT}}>📍</span>}
                <span style={{color:TEXT2,fontSize:14}}>{isOpen?"▲":"▼"}</span>
              </div>
            </div>
            {isOpen && (
              <div style={{borderTop:`1px solid ${BORDER}`,padding:"18px 20px",background:BG1}}>
                {entry.stageHistory?.length>0 && (
                  <div style={{marginBottom:20}}>
                    <div style={{...lblSt,marginBottom:12}}>Stage History</div>
                    {entry.stageHistory.map((sh,i)=>(
                      <div key={i} style={{display:"flex",gap:12,alignItems:"center",marginBottom:10}}>
                        <div style={{width:10,height:10,borderRadius:"50%",background:color,flexShrink:0}}/>
                        <span style={{fontSize:13,color:TEXT1,flex:1,fontWeight:500}}>{sh.label}</span>
                        <span style={{fontSize:12,color:TEXT2}}>{fmt(sh.ts)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{marginBottom:20}}>
                  <div style={{...lblSt,marginBottom:12}}>Ticket Data</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 24px"}}>
                    {Object.entries(et).filter(([k,v])=>v&&v!=="TBD"&&k!=="_scanned").map(([k,v])=>{
                      const isW = ["poidsBrut","poidsTare","poidsNet","tonnage"].includes(k);
                      return (
                        <div key={k}>
                          <div style={{fontSize:10,color:TEXT3,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>{k.replace(/([A-Z])/g," $1").trim()}</div>
                          <div style={{fontSize:14,color:isW?SUCCESS:TEXT1,fontWeight:isW?700:500}}>{v}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {entry.geo && <MapEmbed lat={entry.geo.lat} lng={entry.geo.lng}/>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [mode,setMode]           = useState(null);
  const [toast,setToast]         = useState(null);
  const [logEntries,setLogEntries] = useState([]);
  const toastTimer  = useRef(null);
  const pollLogRef  = useRef(null);

  function notify(msg){setToast(msg);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(null),6000);}

  async function loadLog(){try{const r=await window.storage.get(LOG_KEY,true);if(r)setLogEntries(JSON.parse(r.value));}catch{setLogEntries([]);}}
  async function addLog(entry){const updated=[entry,...logEntries].slice(0,200);setLogEntries(updated);await window.storage.set(LOG_KEY,JSON.stringify(updated),true);}
  useEffect(()=>{loadLog();pollLogRef.current=setInterval(loadLog,POLL_MS);return()=>clearInterval(pollLogRef.current);},[]);

  const TABS = [
    {id:"sample", icon:"🧪", label:"SAMPLE", color:ACCENT},
    {id:"truck",  icon:"🚛", label:"TRUCK",  color:SUCCESS},
    {id:"log",    icon:"📋", label:"LOG",    color:INFO, badge:logEntries.length},
  ];

  return (
    <div style={{minHeight:"100vh",background:BG0,fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,sans-serif",color:TEXT1}}>
      {/* Ambient glow */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",background:`radial-gradient(ellipse 70% 40% at 50% -10%, ${ACCENT}06, transparent)`,zIndex:0}}/>

      <style>{`
        @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}
        input:focus{outline:none;border-color:${ACCENT}!important;box-shadow:0 0 0 4px ${ACCENT}22!important;}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:${BG1}}
        ::-webkit-scrollbar-thumb{background:${BG3};border-radius:2px}
        button:active{transform:scale(0.97)}
      `}</style>

      <Toast msg={toast} onClose={()=>setToast(null)}/>

      <div style={{position:"relative",zIndex:1,maxWidth:680,margin:"0 auto",paddingBottom:40}}>

        {/* ── HEADER ────────────────────────────────────────────── */}
        <div style={{
          position:"sticky",top:0,zIndex:100,
          background:`${BG0}e8`,
          backdropFilter:"blur(16px)",
          WebkitBackdropFilter:"blur(16px)",
          borderBottom:`1px solid ${BORDER}`,
          padding:"16px 20px 14px",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{height:44,borderRadius:14,background:`${ACCENT}18`,border:`1px solid ${ACCENT}33`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,padding:"4px 8px"}}>
              <img src="/logo.png" alt="BPI" style={{height:30,width:"auto",objectFit:"contain"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:ACCENT,letterSpacing:"0.18em",textTransform:"uppercase",fontWeight:700,marginBottom:2}}>Field Operations</div>
              <div style={{fontSize:19,fontWeight:700,color:TEXT1,letterSpacing:"-0.01em"}}>BPI Agadir Tracker</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,background:`${SUCCESS}14`,border:`1px solid ${SUCCESS}33`,borderRadius:10,padding:"6px 12px"}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:SUCCESS,animation:"pulse 2s infinite"}}/>
              <span style={{fontSize:11,color:SUCCESS,fontWeight:700,letterSpacing:"0.1em"}}>LIVE</span>
            </div>
          </div>
        </div>

        {/* ── TAB BAR (floating pills) ─────────────────────────── */}
        <div style={{padding:"20px 16px 4px"}}>
          <div style={{display:"flex",gap:6,padding:6,background:BG1,borderRadius:18,border:`1px solid ${BORDER}`}}>
            {TABS.map(tab=>{
              const active = mode===tab.id;
              return (
                <button key={tab.id} onClick={()=>setMode(mode===tab.id?null:tab.id)}
                  style={{
                    flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                    padding:"15px 10px",
                    background:active?tab.color:"transparent",
                    border:"none", borderRadius:13,
                    color:active?BG0:TEXT2,
                    cursor:"pointer", fontFamily:"inherit",
                    fontWeight:700, fontSize:13,
                    letterSpacing:"0.04em",
                    transition:"all 0.2s ease",
                    position:"relative",
                    boxShadow:active?`0 4px 16px ${tab.color}44`:"none",
                  }}>
                  <span style={{fontSize:16}}>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge>0 && (
                    <div style={{
                      position:"absolute",top:6,right:6,
                      background:active?BG0:tab.color,
                      color:active?tab.color:BG0,
                      borderRadius:10,padding:"2px 7px",
                      fontSize:9,fontWeight:800,lineHeight:1.4,
                    }}>{tab.badge>99?"99+":tab.badge}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── CONTENT ────────────────────────────────────────────── */}
        <div style={{padding:"16px 16px 40px"}}>
          {mode==="sample" && <SampleModule notify={notify} addLog={addLog}/>}
          {mode==="truck"  && <TruckModule  notify={notify} addLog={addLog}/>}
          {mode==="log"    && <LogModule entries={logEntries}/>}
          {!mode && (
            <div style={{...card,textAlign:"center",padding:"64px 24px",borderStyle:"dashed",borderColor:BORDER,background:"transparent",boxShadow:"none"}}>
              <div style={{fontSize:48,marginBottom:20}}>⛏</div>
              <div style={{fontSize:18,color:TEXT2,fontWeight:600,marginBottom:10}}>Select a module above</div>
              <div style={{fontSize:14,color:TEXT3,lineHeight:1.7}}>Tap SAMPLE to register a new sample<br/>or TRUCK to log a transport ticket</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
