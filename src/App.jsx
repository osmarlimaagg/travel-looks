import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// ── Firebase ──────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCbnM7kzK7EFVY2otvdljTZnAclahGW6k8",
  authDomain: "travel-looks.firebaseapp.com",
  projectId: "travel-looks",
  storageBucket: "travel-looks.firebasestorage.app",
  messagingSenderId: "802663801705",
  appId: "1:802663801705:web:f0f7aa68d3406ad83913f8"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function loadFromCloud(userId) {
  try {
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? snap.data() : null;
  } catch (e) { console.error("load error", e); return null; }
}

async function saveToCloud(userId, data) {
  try {
    await setDoc(doc(db, "users", userId), data);
  } catch (e) { console.error("save error", e); }
}

const THEME_KEY = "travel_looks_theme_";
function getTheme(u) { try { return localStorage.getItem(THEME_KEY+u)||"light"; } catch { return "light"; } }
function saveTheme(u,t) { try { localStorage.setItem(THEME_KEY+u,t); } catch {} }

// ── Dates ─────────────────────────────────────────────────────────────────────
const TRIP_START = new Date(2025, 9, 20);
const WEEKDAYS = ["dom","seg","ter","qua","qui","sex","sáb"];
const MONTHS   = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function dateForDay(i) {
  const d = new Date(TRIP_START); d.setDate(d.getDate()+i);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${WEEKDAYS[d.getDay()]}`;
}

function buildDefaultDays() {
  return [
    { id:"d1", title:"Chegada em Bariloche", location:"", looks:[] },
  ];
}

// ── Tags ──────────────────────────────────────────────────────────────────────
const TAGS = ["Voo","Trilha","Passeio","Almoço","Jantar","Show"];
const TAG_COLORS = {
  Passeio:"#E1F5EE:#085041", Jantar:"#EEEDFE:#3C3489", Voo:"#E6F1FB:#0C447C",
  Almoço:"#FAEEDA:#633806", Show:"#FBEAF0:#72243E", Trilha:"#EAF3DE:#27500A"
};
function tagStyle(tag) {
  const [bg,color] = (TAG_COLORS[tag]||"#F1EFE8:#444441").split(":");
  return { background:bg, color };
}

// ── Image compression — target ~150KB to stay inside Firestore 1MB doc ────────
function compress(file, cb) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const MAX = 500; let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = h*MAX/w; w = MAX; } }
      else        { if (h > MAX) { w = w*MAX/h; h = MAX; } }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img,0,0,w,h);
      cb(canvas.toDataURL("image/jpeg", 0.68));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── Theme ─────────────────────────────────────────────────────────────────────
function T(dark) {
  return dark ? {
    bg:"#0f0a1a", card:"#1c1430", border:"#2e2545", text:"#f0ebe8",
    sub:"#8a7f94", input:"#251d38", headerBg:"linear-gradient(135deg,#0f0a1a,#1c1033)",
    pageLabel:"#6a5f74", divider:"#2e2545", lookBg:"#251d38",
    addBorder:"#3e3358", addBg:"#1a1330", addColor:"#6a5f74",
    tagBorder:"#3e3358", modalBg:"#1c1430", toastBg:"#f0ebe8", toastColor:"#1a1025",
    tripBanner:"#1c1430"
  } : {
    bg:"#f8f4fc", card:"#fff", border:"#e8e3ee", text:"#1a1025",
    sub:"#9a8fa0", input:"#f5f0f8", headerBg:"linear-gradient(135deg,#1a1025,#2d1b4e)",
    pageLabel:"#9a8fa0", divider:"#f0eaf5", lookBg:"#f5f0f8",
    addBorder:"#c9bfd1", addBg:"#faf8fc", addColor:"#b8afc0",
    tagBorder:"#ddd", modalBg:"#fff", toastBg:"#1a1025", toastColor:"#f5f0e8",
    tripBanner:"#fff"
  };
}

// ── Photo Viewer / Lightbox ───────────────────────────────────────────────────
function PhotoViewer({ look, allLooks, onClose, onEdit }) {
  const [current, setCurrent] = useState(look);
  const idx = allLooks.findIndex(l => l.id === current.id);
  const hasPrev = idx > 0, hasNext = idx < allLooks.length - 1;
  const touchX = useRef(null);

  const onTouchStart = e => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd   = e => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx >  50 && hasPrev) setCurrent(allLooks[idx-1]);
    if (dx < -50 && hasNext) setCurrent(allLooks[idx+1]);
    touchX.current = null;
  };

  useEffect(() => {
    const fn = e => {
      if (e.key==="ArrowLeft"  && hasPrev) setCurrent(allLooks[idx-1]);
      if (e.key==="ArrowRight" && hasNext) setCurrent(allLooks[idx+1]);
      if (e.key==="Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [idx, hasPrev, hasNext]);

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(0,0,0,0.93)",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>

      {/* Top bar */}
      <div style={{ position:"absolute", top:0, left:0, right:0, display:"flex",
        alignItems:"center", justifyContent:"space-between", padding:"16px 18px",
        background:"linear-gradient(to bottom,rgba(0,0,0,0.7),transparent)" }}>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)", border:"none",
          borderRadius:"50%", width:38, height:38, cursor:"pointer", color:"#fff", fontSize:20,
          display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
        {current.tag && <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px",
          borderRadius:12, letterSpacing:"0.06em", ...tagStyle(current.tag) }}>{current.tag}</span>}
        <button onClick={()=>onEdit(current)} style={{ background:"rgba(255,255,255,0.15)",
          border:"none", borderRadius:20, padding:"8px 14px", cursor:"pointer", color:"#fff",
          fontSize:12, fontFamily:"DM Sans,sans-serif", letterSpacing:"0.06em",
          display:"flex", alignItems:"center", gap:6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span>EDITAR</span>
        </button>
      </div>

      {/* Photo */}
      <div style={{ width:"100%", flex:1, display:"flex", alignItems:"center",
        justifyContent:"center", padding:"70px 0 100px" }}>
        <img src={current.image} alt="look" style={{ maxWidth:"92%", maxHeight:"100%",
          objectFit:"contain", borderRadius:16, boxShadow:"0 8px 40px rgba(0,0,0,0.6)", userSelect:"none" }} />
      </div>

      {/* Side arrows */}
      {hasPrev && <button onClick={()=>setCurrent(allLooks[idx-1])} style={{ position:"absolute",
        left:10, top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.15)",
        border:"none", borderRadius:"50%", width:44, height:44, cursor:"pointer", color:"#fff",
        fontSize:22, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>}
      {hasNext && <button onClick={()=>setCurrent(allLooks[idx+1])} style={{ position:"absolute",
        right:10, top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.15)",
        border:"none", borderRadius:"50%", width:44, height:44, cursor:"pointer", color:"#fff",
        fontSize:22, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>}

      {/* Bottom info */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"12px 18px 24px",
        background:"linear-gradient(to top,rgba(0,0,0,0.75),transparent)" }}>
        {current.description && <p style={{ color:"rgba(255,255,255,0.85)", fontSize:13,
          margin:"0 0 12px", fontFamily:"DM Sans,sans-serif", lineHeight:1.5, textAlign:"center" }}>
          {current.description}</p>}
        {allLooks.length > 1 && <>
          <div style={{ display:"flex", gap:8, overflowX:"auto", justifyContent:"center", paddingBottom:4 }}>
            {allLooks.map(l => (
              <div key={l.id} onClick={()=>setCurrent(l)} style={{ width:current.id===l.id?46:38,
                height:current.id===l.id?58:48, borderRadius:8, overflow:"hidden", flexShrink:0,
                cursor:"pointer", border:current.id===l.id?"2.5px solid #fff":"1.5px solid rgba(255,255,255,0.3)",
                transition:"all 0.18s", opacity:current.id===l.id?1:0.6 }}>
                <img src={l.image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              </div>
            ))}
          </div>
          <div style={{ display:"flex", justifyContent:"center", gap:5, marginTop:10 }}>
            {allLooks.map(l => <div key={l.id} style={{ width:current.id===l.id?18:6, height:6,
              borderRadius:3, background:current.id===l.id?"#fff":"rgba(255,255,255,0.35)",
              transition:"all 0.2s" }} />)}
          </div>
        </>}
      </div>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [name, setName] = useState("");
  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", background:"linear-gradient(160deg,#1a1025 0%,#0d1a2e 100%)",
      padding:"24px", fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ textAlign:"center", marginBottom:40 }}>
        
        <h1 style={{ color:"#f5f0e8", fontSize:34, fontWeight:400, letterSpacing:"0.04em", margin:0 }}>
          Travel Looks</h1>
        <p style={{ color:"#9a8fa0", fontSize:13, marginTop:8, fontFamily:"DM Sans,sans-serif",
          letterSpacing:"0.1em" }}>SEU GUARDA-ROUPA DE VIAGEM</p>
      </div>
      <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:20, padding:"32px 28px",
        width:"100%", maxWidth:340, border:"0.5px solid rgba(255,255,255,0.12)" }}>
        <p style={{ color:"#c9bfd1", fontFamily:"DM Sans,sans-serif", fontSize:12, marginBottom:20,
          textAlign:"center", letterSpacing:"0.08em" }}>QUEM É VOCÊ?</p>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[["Esposa","👩"],["Marido","👨"]].map(([label,emoji]) => (
            <button key={label} onClick={()=>onLogin(label)} style={{
              background:"rgba(255,255,255,0.08)", border:"0.5px solid rgba(255,255,255,0.18)",
              borderRadius:12, padding:"14px 20px", color:"#f0ebe8",
              fontFamily:"DM Sans,sans-serif", fontSize:18, cursor:"pointer",
              textAlign:"left", display:"flex", alignItems:"center", gap:12 }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.15)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"}>
              <span style={{ fontSize:26 }}>{emoji}</span><span>{label}</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop:20, display:"flex", gap:8, alignItems:"center" }}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Outro nome..."
            style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"0.5px solid rgba(255,255,255,0.15)",
              borderRadius:10, padding:"11px 14px", color:"#f0ebe8", fontFamily:"DM Sans,sans-serif",
              fontSize:13, outline:"none" }}
            onKeyDown={e=>e.key==="Enter"&&name.trim()&&onLogin(name.trim())} />
          <button onClick={()=>name.trim()&&onLogin(name.trim())} style={{
            background:"#534AB7", border:"none", borderRadius:10, width:42, height:42,
            cursor:"pointer", color:"#fff", fontSize:18, display:"flex",
            alignItems:"center", justifyContent:"center", flexShrink:0 }}>→</button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Day Modal ────────────────────────────────────────────────────────────
function EditDayModal({ day, onClose, onSave, onDelete, dark }) {
  const tk = T(dark);
  const [title, setTitle] = useState(day.title);
  const [loc,   setLoc]   = useState(day.location);
  const inp = { width:"100%", background:tk.input, border:`0.5px solid ${tk.border}`,
    borderRadius:10, padding:"11px 14px", color:tk.text, fontFamily:"DM Sans,sans-serif",
    fontSize:14, outline:"none", boxSizing:"border-box" };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)",
      display:"flex", alignItems:"flex-end", zIndex:200 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:tk.modalBg, borderRadius:"20px 20px 0 0", width:"100%",
        padding:"24px 20px 40px", fontFamily:"DM Sans,sans-serif" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ fontSize:17, fontWeight:600, color:tk.text, fontFamily:"DM Sans,sans-serif" }}>
            Editar dia</h3>
          <button onClick={onClose} style={{ background:"none", border:"none",
            fontSize:22, cursor:"pointer", color:tk.sub }}>×</button>
        </div>
        <p style={{ fontSize:11, fontWeight:600, color:tk.sub, letterSpacing:"0.08em", marginBottom:6 }}>
          TÍTULO DO DIA</p>
        <input value={title} onChange={e=>setTitle(e.target.value)}
          style={{ ...inp, marginBottom:14 }} placeholder="Ex: Dia em Buenos Aires" />
        <p style={{ fontSize:11, fontWeight:600, color:tk.sub, letterSpacing:"0.08em", marginBottom:6 }}>
          LOCAL / DESTINO</p>
        <input value={loc} onChange={e=>setLoc(e.target.value)}
          style={{ ...inp, marginBottom:20 }} placeholder="Ex: Buenos Aires 🇦🇷" />
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>onDelete(day.id)} style={{ flex:1, padding:13, borderRadius:12,
            border:"0.5px solid #fdc9c9", background:dark?"#3d1a1a":"#fff5f5",
            color:"#c0392b", fontFamily:"DM Sans,sans-serif", fontSize:14, cursor:"pointer" }}>
            Excluir dia</button>
          <button onClick={()=>onSave(day.id, title.trim()||day.title, loc.trim()||day.location)}
            style={{ flex:2, padding:13, borderRadius:12, border:"none", background:"#534AB7",
              color:"#fff", fontFamily:"DM Sans,sans-serif", fontSize:14, fontWeight:600, cursor:"pointer" }}>
            Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ── Look Modal ────────────────────────────────────────────────────────────────
function LookModal({ look, onClose, onSave, onDelete, dark, onViewPhoto }) {
  const tk = T(dark);
  const [desc, setDesc] = useState(look?.description||"");
  const [tag,  setTag]  = useState(look?.tag||"");
  const [img,  setImg]  = useState(look?.image||null);
  const fileRef = useRef();
  const handleFile = e => { const f=e.target.files[0]; if(!f)return; compress(f,setImg); };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)",
      display:"flex", alignItems:"flex-end", zIndex:100 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:tk.modalBg, borderRadius:"20px 20px 0 0", width:"100%",
        maxHeight:"90vh", overflowY:"auto", padding:"24px 20px 40px", fontFamily:"DM Sans,sans-serif" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ fontSize:17, fontWeight:600, color:tk.text, fontFamily:"DM Sans,sans-serif" }}>
            {look?.id ? "Editar look" : "Novo look"}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none",
            fontSize:22, cursor:"pointer", color:tk.sub }}>×</button>
        </div>

        {/* Photo */}
        <div style={{ position:"relative", marginBottom:16 }}>
          <div onClick={()=>fileRef.current.click()} style={{ width:"100%", height:220,
            borderRadius:14, background:img?"none":tk.input,
            border:img?"none":`2px dashed ${tk.addBorder}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", overflow:"hidden" }}>
            {img
              ? <img src={img} alt="look" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <div style={{ textAlign:"center", color:tk.sub }}>
                  <div style={{ fontSize:40, marginBottom:10 }}>📷</div>
                  <p style={{ fontSize:14, margin:0 }}>Toque para adicionar foto</p>
                  <p style={{ fontSize:12, margin:"6px 0 0", opacity:0.6 }}>câmera ou galeria</p>
                </div>}
          </div>
          {img && (
            <div style={{ position:"absolute", bottom:10, left:0, right:0,
              display:"flex", justifyContent:"space-between", padding:"0 10px" }}>
              <button onClick={()=>onViewPhoto&&onViewPhoto()} style={{
                background:"rgba(0,0,0,0.6)", border:"none", borderRadius:8,
                padding:"6px 13px", color:"#fff", fontSize:12, cursor:"pointer",
                fontFamily:"DM Sans,sans-serif", display:"flex", alignItems:"center", gap:5 }}>
                <span>🔍</span><span>Ver ampliado</span>
              </button>
              <button onClick={()=>fileRef.current.click()} style={{
                background:"rgba(0,0,0,0.6)", border:"none", borderRadius:8,
                padding:"6px 13px", color:"#fff", fontSize:12, cursor:"pointer",
                fontFamily:"DM Sans,sans-serif" }}>Trocar foto</button>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*"
          onChange={handleFile} style={{ display:"none" }} />

        <p style={{ fontSize:11, fontWeight:600, color:tk.sub, letterSpacing:"0.08em", marginBottom:8 }}>
          OCASIÃO</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:16 }}>
          {TAGS.map(t => (
            <button key={t} onClick={()=>setTag(tag===t?"":t)} style={{
              padding:"6px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
              border:tag===t?"2px solid #534AB7":`0.5px solid ${tk.tagBorder}`,
              fontWeight:tag===t?600:400, ...tagStyle(t) }}>{t}</button>
          ))}
        </div>

        <p style={{ fontSize:11, fontWeight:600, color:tk.sub, letterSpacing:"0.08em", marginBottom:8 }}>
          DESCRIÇÃO</p>
        <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3}
          placeholder="Ex: vestido floral + sandália bege, bolsa de palha..."
          style={{ width:"100%", borderRadius:10, border:`0.5px solid ${tk.border}`,
            padding:"10px 12px", fontSize:14, fontFamily:"DM Sans,sans-serif", resize:"none",
            outline:"none", color:tk.text, background:tk.input, boxSizing:"border-box" }} />

        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          {look?.id && (
            <button onClick={()=>onDelete(look.id)} style={{ flex:1, padding:13,
              borderRadius:12, border:"0.5px solid #fdc9c9",
              background:dark?"#3d1a1a":"#fff5f5", color:"#c0392b",
              fontFamily:"DM Sans,sans-serif", fontSize:14, cursor:"pointer" }}>Excluir</button>
          )}
          <button onClick={()=>onSave({image:img,description:desc,tag})} disabled={!img}
            style={{ flex:2, padding:13, borderRadius:12, border:"none",
              background:img?"#534AB7":"#555", color:"#fff",
              fontFamily:"DM Sans,sans-serif", fontSize:14, fontWeight:600,
              cursor:img?"pointer":"not-allowed" }}>Salvar look</button>
        </div>
      </div>
    </div>
  );
}

// ── Day Card ──────────────────────────────────────────────────────────────────
function DayCard({ day, index, onAddLook, onEditLook, onEditDay, onViewLook, dark }) {
  const tk = T(dark);
  const [open, setOpen] = useState(index < 2);
  const DOTS = ["#EEEDFE:#534AB7","#E1F5EE:#0F6E56","#FAEEDA:#854F0B","#FAECE7:#993C1D",
    "#E6F1FB:#185FA5","#EAF3DE:#3B6D11","#FBEAF0:#993556","#F1EFE8:#5F5E5A",
    "#E1F5EE:#085041","#FAEEDA:#633806","#EEEDFE:#3C3489","#E6F1FB:#0C447C"];
  const [dotBg, dotColor] = DOTS[index % DOTS.length].split(":");

  return (
    <div style={{ background:tk.card, borderRadius:16, margin:"0 14px 10px",
      border:`0.5px solid ${tk.border}`, overflow:"hidden", fontFamily:"DM Sans,sans-serif" }}>
      <div style={{ display:"flex", alignItems:"center", gap:11, padding:"13px 14px" }}>
        <div onClick={()=>setOpen(!open)}
          style={{ display:"flex", alignItems:"center", gap:11, flex:1, cursor:"pointer" }}>
          <div style={{ width:34, height:34, borderRadius:"50%", background:dotBg, flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:13, fontWeight:700, color:dotColor }}>{index+1}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:600, color:tk.text, whiteSpace:"nowrap",
              overflow:"hidden", textOverflow:"ellipsis" }}>{day.title}</div>
            <div style={{ fontSize:11, color:tk.sub, marginTop:2 }}>
              📍 {day.location} · {dateForDay(index)}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            {day.looks.length > 0 && (
              <span style={{ background:dotBg, color:dotColor, fontSize:10, fontWeight:700,
                padding:"2px 8px", borderRadius:10 }}>{day.looks.length}</span>
            )}
            <span style={{ color:tk.sub, fontSize:18, display:"inline-block",
              transition:"transform 0.2s", transform:open?"rotate(180deg)":"none" }}></span>
          </div>
        </div>
        <button onClick={()=>onEditDay(day)} style={{ background:"none", border:"none",
          cursor:"pointer", color:tk.sub, padding:"4px 6px", lineHeight:1, display:"flex" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>

      {open && (
        <div style={{ borderTop:`0.5px solid ${tk.divider}`, padding:"12px 14px" }}>
          <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:6 }}>
            {day.looks.map(look => (
              <div key={look.id} style={{ flexShrink:0, width:88 }}>
                <div style={{ width:88, height:110, borderRadius:12, overflow:"hidden",
                  border:`0.5px solid ${tk.border}`, position:"relative",
                  background:tk.lookBg, cursor:"pointer" }}
                  onClick={()=>onViewLook(look, day.looks.filter(l=>l.image))}>
                  {look.image
                    ? <img src={look.image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : <div style={{ width:"100%", height:"100%", display:"flex",
                        alignItems:"center", justifyContent:"center", fontSize:28 }}>👗</div>}
                  {look.image && (
                    <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0)",
                      transition:"background 0.15s" }}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(0,0,0,0.15)"}
                      onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0)"} />
                  )}
                  {look.tag && (
                    <span style={{ position:"absolute", bottom:5, left:5, fontSize:9,
                      fontWeight:700, padding:"2px 6px", borderRadius:6,
                      letterSpacing:"0.05em", ...tagStyle(look.tag) }}>{look.tag}</span>
                  )}
                </div>
                <button onClick={()=>onEditLook(day.id, look)} style={{ width:"100%", marginTop:5,
                  padding:"3px 0", borderRadius:6, border:`0.5px solid ${tk.border}`,
                  background:"none", color:tk.sub, fontSize:10, cursor:"pointer",
                  fontFamily:"DM Sans,sans-serif" }}>editar</button>
                {look.description && (
                  <p style={{ fontSize:10, color:tk.sub, marginTop:3, lineHeight:1.3,
                    overflow:"hidden", display:"-webkit-box",
                    WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{look.description}</p>
                )}
              </div>
            ))}
            <div onClick={()=>onAddLook(day.id)} style={{ flexShrink:0, width:88, height:110,
              borderRadius:12, border:`1.5px dashed ${tk.addBorder}`, display:"flex",
              flexDirection:"column", alignItems:"center", justifyContent:"center",
              gap:5, cursor:"pointer", color:tk.addColor, background:tk.addBg }}>
              <span style={{ fontSize:22 }}>+</span>
              <span style={{ fontSize:10, letterSpacing:"0.04em" }}>look</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sync Badge ────────────────────────────────────────────────────────────────
function SyncBadge({ status }) {
  const map = {
    synced:  { icon:"☁️", label:"salvo na nuvem", color:"#5DCAA5" },
    saving:  { icon:"⏳", label:"salvando...",    color:"#d4a84b" },
    error:   { icon:"⚠️", label:"erro ao salvar", color:"#e07060" },
    loading: { icon:"⏳", label:"carregando...",  color:"#7a9fd4" },
  };
  const s = map[status] || map.synced;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11,
      color:s.color, fontFamily:"DM Sans,sans-serif" }}>
      <span>{s.icon}</span><span>{s.label}</span>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [userId,  setUserId]  = useState(null);
  const [days,    setDays]    = useState([]);
  const [dark,    setDark]    = useState(false);
  const [sync,    setSync]    = useState("loading");
  const [modal,   setModal]   = useState(null);
  const [editDay, setEditDay] = useState(null);
  const [viewer,  setViewer]  = useState(null);
  const [toast,   setToast]   = useState("");
  const toastRef  = useRef();
  const saveTimer = useRef();

  useEffect(() => {
    if (!userId) return;
    setSync("loading");
    setDark(getTheme(userId) === "dark");
    loadFromCloud(userId).then(data => {
      setDays(data?.days || buildDefaultDays());
      setSync("synced");
    }).catch(() => setSync("error"));
  }, [userId]);

  const saveDays = (newDays) => {
    setDays(newDays);
    setSync("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveToCloud(userId, { days: newDays })
        .then(() => setSync("synced"))
        .catch(() => setSync("error"));
    }, 1500);
  };

  const toggleTheme = () => {
    const n = !dark; setDark(n); saveTheme(userId, n?"dark":"light");
  };

  const showToast = msg => {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(()=>setToast(""), 2200);
  };

  const addDay = () => {
    const nd = [...days, { id:"d"+Date.now(), title:`Dia ${days.length+1}`, location:"", looks:[] }];
    saveDays(nd); showToast(`Dia ${days.length+1} adicionado!`);
  };

  const handleSaveDay = (dayId, title, location) => {
    saveDays(days.map(d=>d.id===dayId?{...d,title,location}:d));
    setEditDay(null); showToast("Dia atualizado!");
  };
  const handleDeleteDay = dayId => {
    saveDays(days.filter(d=>d.id!==dayId));
    setEditDay(null); showToast("Dia removido");
  };

  const handleSaveLook = ({ image, description, tag }) => {
    const { dayId, look } = modal;
    const nd = days.map(day => {
      if (day.id !== dayId) return day;
      if (look?.id) return { ...day, looks:day.looks.map(l=>l.id===look.id?{...l,image,description,tag}:l) };
      return { ...day, looks:[...day.looks,{id:Date.now().toString(),image,description,tag}] };
    });
    saveDays(nd); setModal(null);
    showToast(look?.id ? "Look atualizado! ✨" : "Look salvo! ✨");
  };

  const handleDeleteLook = lookId => {
    const nd = days.map(d=>d.id!==modal.dayId?d:{...d,looks:d.looks.filter(l=>l.id!==lookId)});
    saveDays(nd); setModal(null); showToast("Look removido");
  };

  const handleEditFromViewer = look => {
    const day = days.find(d=>d.looks.some(l=>l.id===look.id));
    setViewer(null);
    if (day) setModal({ dayId:day.id, look });
  };

  const totalLooks = days.flatMap(d=>d.looks).length;
  const tk = T(dark);

  if (!userId) return <LoginScreen onLogin={setUserId} />;

  return (
    <div style={{ background:tk.bg, minHeight:"100vh", fontFamily:"DM Sans,sans-serif",
      maxWidth:430, margin:"0 auto", transition:"background 0.2s" }}>

      {/* Header */}
      <div style={{ background:tk.headerBg, padding:"20px 16px 18px",
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <p style={{ color:"#9a8fa0", fontSize:10, letterSpacing:"0.1em", margin:"0 0 2px" }}>
            BEM-VINDO(A),</p>
          <h1 style={{ color:"#f5f0e8", fontSize:22, margin:"0 0 5px",
            fontFamily:"DM Sans,sans-serif", fontWeight:400, letterSpacing:"0.03em" }}>
            {userId} ✈️</h1>
          <SyncBadge status={sync} />
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end" }}>
          <button onClick={toggleTheme} style={{ background:dark?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.15)",
            border:"0.5px solid rgba(255,255,255,0.2)", borderRadius:20, padding:"6px 14px",
            color:"#f0ebe8", fontSize:13, cursor:"pointer", display:"flex",
            alignItems:"center", gap:6, fontFamily:"DM Sans,sans-serif" }}>
            {dark ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
            <span style={{ fontSize:11, letterSpacing:"0.06em" }}>{dark?"CLARO":"ESCURO"}</span>
          </button>
          <button onClick={()=>setUserId(null)} style={{ background:"rgba(255,255,255,0.08)",
            border:"0.5px solid rgba(255,255,255,0.15)", borderRadius:10, padding:"5px 12px",
            color:"#9a8fa0", fontSize:10, cursor:"pointer", letterSpacing:"0.06em" }}>
            TROCAR PERFIL</button>
        </div>
      </div>

      {sync === "loading"
        ? <div style={{ textAlign:"center", padding:"80px 20px", color:tk.sub }}>
            <div style={{ fontSize:36, marginBottom:14 }}>☁️</div>
            <p style={{ fontSize:14, margin:0, fontFamily:"DM Sans,sans-serif" }}>Carregando seus looks...</p>
          </div>
        : <>
          {/* Trip banner */}
          <div style={{ margin:"14px 14px 0", background:tk.tripBanner, borderRadius:16,
            padding:"14px 16px", border:`0.5px solid ${tk.border}`,
            display:"flex", alignItems:"center", gap:12 }}>
            
            <div style={{ flex:1 }}>
              <p style={{ fontSize:15, fontWeight:700, color:tk.text, margin:0 }}>
                Argentina & Uruguai</p>
              <p style={{ fontSize:12, color:tk.sub, margin:"2px 0 0" }}>
                20 out – 01 nov · 13 dias</p>
            </div>
            <div style={{ textAlign:"center" }}>
              <p style={{ fontSize:22, fontWeight:700, color:"#534AB7", margin:0,
                fontFamily:"DM Sans,sans-serif" }}>{totalLooks}</p>
              <p style={{ fontSize:10, color:tk.sub, margin:0, letterSpacing:"0.06em" }}>LOOKS</p>
            </div>
          </div>

          {/* Section label */}
          <div style={{ padding:"18px 16px 10px" }}>
            <p style={{ fontSize:10, fontWeight:700, color:tk.pageLabel,
              letterSpacing:"0.1em", margin:0 }}>
              ROTEIRO DE LOOKS · {days.length} DIAS</p>
          </div>

          {/* Days */}
          {days.map((day,i) => (
            <DayCard key={day.id} day={day} index={i} dark={dark}
              onAddLook={dayId=>setModal({dayId,look:null})}
              onEditLook={(dayId,look)=>setModal({dayId,look})}
              onEditDay={d=>setEditDay(d)}
              onViewLook={(look,all)=>setViewer({look,allLooks:all})} />
          ))}

          {/* Add day */}
          <button onClick={addDay} style={{ display:"flex", alignItems:"center",
            justifyContent:"center", gap:10, width:"calc(100% - 28px)",
            margin:"4px 14px 16px", padding:"14px", borderRadius:14,
            border:`1.5px dashed ${tk.addBorder}`, background:tk.addBg,
            color:tk.sub, fontFamily:"DM Sans,sans-serif", fontSize:14, cursor:"pointer" }}>
            <span style={{ fontSize:20, lineHeight:1 }}>+</span>
            <span>Adicionar dia {days.length+1}</span>
          </button>
          <div style={{ height:30 }} />
        </>
      }

      {/* Modals */}
      {modal && (
        <LookModal look={modal.look} dark={dark}
          onClose={()=>setModal(null)} onSave={handleSaveLook} onDelete={handleDeleteLook}
          onViewPhoto={modal.look?.image ? () => {
            const day = days.find(d=>d.id===modal.dayId);
            const all = day?.looks.filter(l=>l.image)||[];
            setViewer({look:modal.look, allLooks:all}); setModal(null);
          } : null} />
      )}
      {editDay && (
        <EditDayModal day={editDay} dark={dark} onClose={()=>setEditDay(null)}
          onSave={handleSaveDay} onDelete={handleDeleteDay} />
      )}
      {viewer && (
        <PhotoViewer look={viewer.look} allLooks={viewer.allLooks}
          onClose={()=>setViewer(null)} onEdit={handleEditFromViewer} />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
          background:tk.toastBg, color:tk.toastColor, borderRadius:20, padding:"10px 20px",
          fontSize:13, letterSpacing:"0.03em", boxShadow:"0 4px 20px rgba(0,0,0,0.3)",
          whiteSpace:"nowrap", zIndex:300 }}>{toast}</div>
      )}
    </div>
  );
}
