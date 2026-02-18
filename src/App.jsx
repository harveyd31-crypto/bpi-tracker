import { useState, useEffect, useRef } from "react";

const LOGO_SRC = "data:image/jpeg;base64,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";

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const SAMPLE_KEY = "bpi-sample-active-v4";
const TRUCK_KEY  = "bpi-truck-active-v4";
const LOG_KEY    = "bpi-log-v4";
const POLL_MS    = 3000;

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
{"ticketNo":"","date":"","sampleId":"","supplier":"","mineReference":"","tonnage":"","specificGravity":"","collectionPoint":"","samplerName":"","notes":""}
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
  const cameraRef = useRef(null);
  const uploadRef = useRef(null);

  const SFIELDS=[["ticketNo","Ticket No"],["date","Date"],["sampleId","Sample ID"],["supplier","Supplier"],["mineReference","Mine Reference"],["tonnage","Tonnage"],["specificGravity","Specific Gravity"],["collectionPoint","Collection Point"],["samplerName","Sampler Name"],["notes","Notes"]];
  const TFIELDS=[["ticketNo","N° Ticket"],["date","Date"],["lieuChargement","Lieu chargement"],["lieuLivraison","Lieu livraison"],["marchandise","Marchandise"],["transporteur","Transporteur"],["immatriculation","Immatriculation"],["heureDepart","Heure départ"],["fournisseur","Fournisseur"],["mineReference","Mine Reference"],["qualiteProduit","Qualité produit"],["poidsBrut","Poids brut"],["poidsTare","Poids tare"],["poidsNet","Poids net"],["responsableStock","Responsable stock"],["numeroChauffeur","N° Chauffeur"],["societe","Société"]];
  const fields = context==="sample"?SFIELDS:TFIELDS;
  const weightFields = ["poidsBrut","poidsTare","poidsNet"];

  function reset(){setState("idle");setPreview(null);setExtracted(null);setEdited({});}

  async function handle(file) {
    if(!file) return;
    const reader=new FileReader();reader.onload=ev=>setPreview(ev.target.result);reader.readAsDataURL(file);
    setState("scanning");setMsg("Claude is reading your ticket…");
    try {
      const b64 = await fileToB64(file);
      const result = await claudeScan(b64,file.type,context);
      setExtracted(result);setEdited({...existingData,...result});
      setState("done");setMsg("✓ Ticket read — verify below");
    } catch(err) {
      setState("error");setMsg("Scan failed: "+err.message);
      setEdited(existingData||{});
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
          <button onClick={()=>onScanned({...edited,_scanned:true})} style={{...btnBig(SUCCESS),marginTop:20}}>✓ Confirm & Log</button>
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
  const [geoStatus,setGeoStatus] = useState("idle");
  const [pendingGeo,setPendingGeo] = useState(null);
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

  async function register(ticket) {
    const entry={ticket,currentStage:"collected",history:{collected:new Date().toISOString()},geo:pendingGeo||null};
    await window.storage.set(SAMPLE_KEY,JSON.stringify(entry),true);
    addLog({id:`S-${Date.now()}`,type:"sample",label:makeLabel(ticket),ticket,stageHistory:[{stage:"collected",label:"Collected",ts:new Date().toISOString()}],geo:pendingGeo||null});
    setData(entry);lastRef.current="collected";setForm({});setPendingGeo(null);setGeoStatus("idle");setManualMode(false);
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
  const SFIELDS=[["ticketNo","Ticket No"],["date","Date"],["sampleId","Sample ID"],["supplier","Supplier"],["mineReference","Mine Reference"],["tonnage","Tonnage"],["specificGravity","Specific Gravity"],["collectionPoint","Collection Point"],["samplerName","Sampler Name"],["notes","Notes"]];

  if(loading) return <div style={{color:TEXT3,padding:40,fontSize:14,textAlign:"center"}}>Loading…</div>;

  return (
    <div>
      {!data && (
        <div>
          <div style={{...card,borderColor:`${ACCENT}33`}}>
            <div style={{fontSize:15,color:ACCENT,fontWeight:700,marginBottom:16}}>🧪 New Sample Registration</div>
            <GpsCapture geoStatus={geoStatus} setGeoStatus={setGeoStatus} pendingGeo={pendingGeo} setPendingGeo={setPendingGeo}/>
          </div>
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
            <div style={{width:44,height:44,borderRadius:14,background:`${ACCENT}18`,border:`1px solid ${ACCENT}33`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <img src={LOGO_SRC} alt="BPI" style={{height:30,width:"auto",filter:"brightness(0) invert(1)",objectFit:"contain"}}/>
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
