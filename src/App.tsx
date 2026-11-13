import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import HandCamera from "./HandCamera";
import { levels, questions, type Question } from "./data";

type Mode="individual"|"class";
type Phase="home"|"instructions"|"levelIntro"|"playing"|"feedback"|"results";
type Team={name:string;score:number};
const shuffle=<T,>(items:T[])=>[...items].sort(()=>Math.random()-.5);
const badges=["Penjelajah Pemula","Ahli VOC","Penakluk Misi Tanam Paksa","Cendekiawan Politik Etis","Penjaga Sejarah Nusantara"];
export default function App(){
 const [phase,setPhase]=useState<Phase>("home");
 const [mode,setMode]=useState<Mode>("individual");
 const [sensorPoint,setSensorPoint]=useState<{x:number;y:number}|null>(null);
 const [sensorStatus,setSensorStatus]=useState("Kamera belum aktif");
 const [cameraReady,setCameraReady]=useState(false);
 const [cameraReset,setCameraReset]=useState(0);
 const [practice,setPractice]=useState(false);
 const [sound,setSound]=useState(true);
 const [diagnostics,setDiagnostics]=useState(false);
 const [sensitivity,setSensitivity]=useState(1);
 const [dwell,setDwell]=useState(1000);
 const [teams,setTeams]=useState<Team[]>([{name:"Tim Garuda",score:0},{name:"Tim Komodo",score:0}]);
 const [activeTeam,setActiveTeam]=useState(0);
 const [name,setName]=useState("Penjelajah");
 const [deck,setDeck]=useState<Question[]>([]);
 const [index,setIndex]=useState(0);
 const [chosen,setChosen]=useState<string|null>(null);
 const [correct,setCorrect]=useState(false);
 const [score,setScore]=useState(0);
 const [levelScores,setLevelScores]=useState<number[]>([0,0,0,0,0]);
 const [right,setRight]=useState(0);
 const [wrong,setWrong]=useState(0);
 const [unlocked,setUnlocked]=useState(1);
 const [target,setTarget]=useState<string|null>(null);
 const [hold,setHold]=useState(0);
 const dwellStart=useRef(0);
 const lastTarget=useRef<string|null>(null);
 const locked=useRef(false);
 const teamSwitched=useRef(false);
 const optionRefs=useRef<(HTMLButtonElement|null)[]>([]);
 const audioRef=useRef<AudioContext|null>(null);
 const current=deck[index];
 const currentLevel=current?.level??1;
 const progress=deck.length?Math.round(index/deck.length*100):0;
 const playTone=(ok:boolean)=>{
   if(!sound)return;
   try{const ctx=audioRef.current??new AudioContext();audioRef.current=ctx;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.frequency.value=ok?660:220;osc.type="sine";gain.gain.setValueAtTime(.12,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.28);osc.start();osc.stop(ctx.currentTime+.29);}catch{}
 };
 const begin=()=>{
   const next=shuffle(questions).map(q=>({...q,options:shuffle(q.options)}));
   setDeck(next);setIndex(0);setScore(0);setRight(0);setWrong(0);setLevelScores([0,0,0,0,0]);setUnlocked(1);setChosen(null);setPractice(false);setSensorPoint(null);setPhase("levelIntro");locked.current=false;
   setTeams(t=>t.map(x=>({...x,score:0})));setActiveTeam(0);teamSwitched.current=false;
 };
 const beginPractice=()=>{begin();setPractice(true);};
 const answer=(option:string)=>{
   if(locked.current||!current)return;
   locked.current=true;lastTarget.current=null;dwellStart.current=0;setChosen(option);const ok=option===current.answer;setCorrect(ok);setPhase("feedback");setTarget(null);setHold(0);
   if(ok){setScore(s=>s+100);setRight(n=>n+1);setLevelScores(a=>a.map((v,i)=>i===current.level-1?v+100:v));if(mode==="class")setTeams(t=>t.map((v,i)=>i===activeTeam?{...v,score:v.score+100}:v));}
   else setWrong(n=>n+1);
   playTone(ok);
 };
 const nextQuestion=()=>{
   if(index>=deck.length-1){setPhase("results");setSensorPoint(null);return;}
   const nextIndex=index+1;
   if(deck[nextIndex].level!==current.level){setUnlocked(deck[nextIndex].level);setIndex(nextIndex);setPhase("levelIntro");}
   else {setIndex(nextIndex);setChosen(null);setPhase("playing");}
   locked.current=false;lastTarget.current=null;dwellStart.current=0;setTarget(null);setHold(0);
   if(mode==="class"&&!teamSwitched.current)setActiveTeam(t=>1-t);
   teamSwitched.current=false;
 };
 const startLevel=()=>{setChosen(null);setPhase("playing");locked.current=false;};
 const hitTest=(point:{x:number;y:number})=>{
   const px=point.x*window.innerWidth,py=point.y*window.innerHeight;
   let found:string|null=null;
   optionRefs.current.forEach((el,i)=>{if(!el)return;const r=el.getBoundingClientRect();const pad=12;if(px>=r.left-pad&&px<=r.right+pad&&py>=r.top-pad&&py<=r.bottom+pad)found=String(i);});
   if(found!==lastTarget.current){lastTarget.current=found;dwellStart.current=0;setHold(0);}
   setTarget(found);
   if(found===null){dwellStart.current=0;setHold(0);return;}
   if(!dwellStart.current)dwellStart.current=performance.now();
   const elapsed=performance.now()-dwellStart.current;
   setHold(Math.min(1,elapsed/dwell));
   if(elapsed>=dwell){const selected=current?.options[Number(found)];if(selected)answer(selected);dwellStart.current=0;}
 };
 const pointCallback=useCallback((p:{x:number;y:number}|null)=>{const adjusted=p?{x:Math.max(0,Math.min(1,.5+(p.x-.5)*sensitivity)),y:Math.max(0,Math.min(1,.5+(p.y-.5)*sensitivity))}:null;setSensorPoint(adjusted);if(adjusted&&phase==="playing"&&!locked.current)hitTest(adjusted);else if(!adjusted){setTarget(null);setHold(0);dwellStart.current=0;}},[phase,dwell,current,sensitivity]);
 useEffect(()=>{if(phase!=="feedback")return;const id=window.setTimeout(nextQuestion,2600);return()=>window.clearTimeout(id);},[phase,index]);
 const handleSensorStatus=(s:string)=>{setSensorStatus(s);if(s.includes("Kamera aktif")||s.includes("Sensor siap")||s.includes("Tangan terdeteksi")||s.includes("Arahkan tangan ke depan kamera"))setCameraReady(true);if(s==="Kamera dimatikan"||s==="Kamera belum aktif")setCameraReady(false);};
 const restart=()=>{setCameraReady(false);setPhase("home");setSensorPoint(null);setCameraReset(v=>v+1);setDeck([]);setChosen(null);locked.current=false;};
 const cursorStyle=sensorPoint?{left:`${sensorPoint.x*100}%`,top:`${sensorPoint.y*100}%`}:undefined;
 const level=levels[currentLevel-1];
 const percentage=deck.length?Math.round(right/deck.length*100):0;
 const totalScore=mode==="class"?teams.reduce((n,t)=>n+t.score,0):score;
 const teamWinner=teams[0].score===teams[1].score?"Kedua tim bermain hebat! Hasilnya seri.":`${teams[0].score>teams[1].score?teams[0].name:teams[1].name} menjadi pemenang!`;
 return <main className="app-shell">
  <div className="sky-orb orb-one"/><div className="sky-orb orb-two"/>
  <header className="topbar"><div className="brand-mark">🧭</div><div className="brand-copy"><b>JELAJAH NUSANTARA</b><span>GAME EDUKASI SEJARAH · KELAS VI</span></div><div className="top-actions"><button className="icon-btn" onClick={()=>setSound(s=>!s)} title="Pengaturan suara">{sound?"🔊":"🔇"}</button><button className="icon-btn" onClick={()=>setDiagnostics(d=>!d)} title="Diagnostik guru">⚙️</button>{phase!=="home"&&<button className="icon-btn" onClick={restart} title="Keluar">✕</button>}</div></header>
  {phase==="home"&&<section className="home-screen">
    <div className="home-copy"><div className="eyebrow"><span/> MISI SEJARAH DIMULAI</div><h1>PETUALANGAN<br/><em>SEJARAH</em> NUSANTARA</h1><p className="subtitle">Misi Melawan Penjajahan Belanda</p><p className="intro">Jelajahi masa lalu, pecahkan tantangan sejarah, dan kumpulkan bintang untuk menjaga ingatan Nusantara!</p>
     <div className="home-stats"><span>🗺️ 5 LEVEL</span><span>🐝 15 MISI</span><span>🏆 1.500 POIN</span></div>
     <div className="mode-picker"><button className={mode==="individual"?"mode-card selected":"mode-card"} onClick={()=>setMode("individual")}><b>🧑‍🚀 Petualangan Individu</b><small>Satu penjelajah, satu perjalanan</small></button><button className={mode==="class"?"mode-card selected":"mode-card"} onClick={()=>setMode("class")}><b>👥 Tantangan Kelas</b><small>Dua tim bermain bergantian</small></button></div>
     {mode==="class"&&<div className="team-edit"><label>Nama tim pertama<input value={teams[0].name} onChange={e=>setTeams(t=>t.map((v,i)=>i===0?{...v,name:e.target.value}:v))}/></label><label>Nama tim kedua<input value={teams[1].name} onChange={e=>setTeams(t=>t.map((v,i)=>i===1?{...v,name:e.target.value}:v))}/></label></div>}
     <div className="home-buttons"><button className="btn btn-primary btn-large" onClick={()=>{setPractice(false);setPhase("instructions");}}>MULAI PETUALANGAN <span>→</span></button><button className="btn btn-outline" onClick={()=>setPhase("instructions")}>📖 Petunjuk Permainan</button></div>
     <div className="small-print">📷 Sensor kamera berbasis AI · Privasi terjaga di perangkat</div>
    </div>
    <div className="hero-art"><div className="sun-disc"/><div className="map-blob"><span className="island island-a"/><span className="island island-b"/><span className="island island-c"/><span className="island island-d"/><span className="map-label">NUSANTARA</span></div><div className="ship">⛵</div><div className="explorer">🧑🏽‍✈️</div><div className="bee bee-one">🐝</div><div className="bee bee-two">🐝</div><div className="floating-coin">✦</div><div className="hero-caption"><b>Ekspedisi dimulai!</b><span>Siap jadi penjaga sejarah?</span></div></div>
   </section>}
  <section className={phase==="instructions"?"setup-screen":"setup-screen setup-hidden"}>
    <div className="section-heading"><div className="eyebrow">SEBELUM BERANGKAT</div><h2>Siapkan penjelajahanmu!</h2><p>Gunakan jari telunjuk untuk memilih lebah jawaban. Tahan sebentar hingga lingkaran penuh.</p></div>
    <div className="setup-grid"><div className="setup-card"><div className="card-title">📷 SENSOR KAMERA</div><HandCamera key={cameraReset} enabled onPoint={pointCallback} onStatus={handleSensorStatus} shouldStop={phase==="home"||phase==="results"}/><div className="sensor-status"><i className={sensorPoint?"status-live":""}/>{sensorStatus}</div></div>
    <div className="setup-card guide-card"><div className="card-title">🧭 CARA BERMAIN</div><div className="guide-step"><span>1</span><div><b>Aktifkan kamera</b><small>Izinkan browser mengakses kamera. Pastikan tangan terlihat.</small></div></div><div className="guide-step"><span>2</span><div><b>Arahkan ujung telunjuk</b><small>Gerakkan jari ke lebah A, B, atau C pada layar.</small></div></div><div className="guide-step"><span>3</span><div><b>Tahan sampai lingkaran penuh</b><small>Pilihan akan otomatis terpilih setelah sekitar satu detik.</small></div></div><div className="guide-step"><span>4</span><div><b>Kumpulkan bintang</b><small>Jawaban benar bernilai 100 poin. Pelajari penjelasan setiap soal.</small></div></div>
     <div className="setting-row"><label>Durasi memilih <b>{(dwell/1000).toFixed(1)} detik</b></label><input type="range" min="700" max="1800" step="100" value={dwell} onChange={e=>setDwell(Number(e.target.value))}/></div>
     <div className="setting-row"><label>Sensitivitas <b>{sensitivity===1?"Normal":sensitivity===1.3?"Tinggi":"Rendah"}</b></label><input type="range" min=".7" max="1.3" step=".3" value={sensitivity} onChange={e=>setSensitivity(Number(e.target.value))}/></div>
    </div></div>
    <div className="setup-footer"><button className="btn btn-ghost" onClick={()=>setPhase("home")}>← Kembali</button><button className="btn btn-outline" onClick={beginPractice}>Coba mode latihan tanpa kamera</button><button className="btn btn-primary" onClick={()=>{if(cameraReady)begin();else alert("Aktifkan kamera terlebih dahulu, atau pilih mode latihan tanpa kamera.");}}>KAMERA SIAP · MULAI →</button></div>
   </section>
  {phase==="levelIntro"&&<section className="level-intro"><div className="level-map">{levels.map((l,i)=><div key={l.id} className={i+1<=unlocked?"map-stop open":"map-stop"}><span>{i+1<=unlocked?l.icon:"🔒"}</span><small>{l.place}</small></div>)}</div><div className="level-emblem">{level.icon}</div><div className="eyebrow">LEVEL {currentLevel} · DARI 5 MISI</div><h2>{level.title}</h2><p>{level.desc}</p><div className="mission-count">🐝 3 pertanyaan · ⭐ 300 poin tersedia</div><button className="btn btn-primary btn-large" onClick={startLevel}>MULAI MISI <span>→</span></button></section>}
  {(phase==="playing"||phase==="feedback")&&current&&<section className="game-screen">
    <div className="game-head"><div><span className="eyebrow">LEVEL {currentLevel} · {level.tag.toUpperCase()}</span><h2>{level.title}</h2></div><div className="game-score"><small>{mode==="class"?teams[activeTeam].name:"SKOR SEMENTARA"}</small><b>⭐ {mode==="class"?teams[activeTeam].score:score}</b></div></div>
    {mode==="class"&&<div className="team-scoreboard">{teams.map((t,i)=><div className={i===activeTeam?"team-score active":"team-score"} key={i}><span>{t.name}</span><b>{t.score}</b></div>)}</div>}
    <div className="progress-wrap"><div className="progress-meta"><span>PERJALANAN SEJARAH</span><b>{index+1} / {deck.length}</b></div><div className="progress-track"><div style={{width:`${(index+1)/deck.length*100}%`}}/></div></div>
    <div className="question-card"><div className="question-kicker"><span>📜 PERTANYAAN {index+1}</span><span>{current.topic}</span></div><h3>{current.question}</h3><p>Arahkan ujung jari telunjuk ke lebah pilihanmu!</p></div>
    <div className="bee-options">{current.options.map((opt,i)=><button key={opt} ref={el=>{optionRefs.current[i]=el;}} className={`bee-option ${target===String(i)&&phase==="playing"?"targeted":""} ${phase==="feedback"&&opt===current.answer?"is-correct":""} ${phase==="feedback"&&chosen===opt&&!correct?"is-wrong":""}`} onClick={()=>{if(practice)answer(opt);}} disabled={phase==="feedback"||(!practice&&!sensorPoint&&false)}><div className="bee-face">🐝</div><span className="option-letter">{String.fromCharCode(65+i)}</span><b>{opt}</b>{target===String(i)&&phase==="playing"&&<div className="dwell-ring" style={{"--progress":hold} as CSSProperties}><span>TAHAN</span></div>}</button>)}</div>
    {phase==="feedback"&&<div className={correct?"feedback-banner success":"feedback-banner gentle"}><div className="feedback-icon">{correct?"🌟":"💡"}</div><div><b>{correct?"Hebat! Jawabanmu benar!":"Belum tepat. Ayo pelajari penjelasannya!"}</b><p>Jawaban benar: <strong>{current.answer}</strong>. {current.explanation}</p></div><span className="feedback-points">{correct?"+100":"0"} POIN</span></div>}
    {phase==="playing"&&<div className="sensor-instruction"><span>☝️</span>{practice?"Mode latihan: pilih jawaban dengan klik atau sentuh.":"Arahkan telunjuk dan tahan pada lebah selama "+(dwell/1000).toFixed(1)+" detik."}</div>}
    {phase==="feedback"&&<div className="feedback-controls">{mode==="class"&&<button className="btn btn-outline" onClick={()=>{setActiveTeam(t=>1-t);teamSwitched.current=true;}}>↔ Ganti Tim</button>}<button className="btn btn-primary" onClick={nextQuestion}>Soal Berikutnya →</button><span>Misi berlanjut otomatis dalam beberapa saat…</span></div>}
   </section>}
  {phase==="results"&&<section className="results-screen"><div className="trophy">🏆</div><div className="eyebrow">EKSPEDISI SELESAI</div><h2>Penjaga Sejarah Nusantara!</h2><p className="result-lead">Kamu telah menuntaskan lima misi sejarah. Terus jaga semangat belajar dan cinta tanah air!</p>{mode==="class"?<h3 className="winner">{teamWinner}</h3>:<label className="student-name">Nama penjelajah<input value={name} onChange={e=>setName(e.target.value)}/></label>}<div className="result-stats"><div><small>TOTAL POIN</small><b>{mode==="class"?totalScore:score}</b></div><div><small>JAWABAN BENAR</small><b>{right}/15</b></div><div><small>KETEPATAN</small><b>{percentage}%</b></div><div><small>PERLU DIPELAJARI</small><b>{wrong}</b></div></div><div className="level-result-list">{levels.map((l,i)=><span key={l.id}>{l.icon} {l.tag}: <b>{levelScores[i]}</b> poin</span>)}</div><div className="badge-list">{badges.map((b,i)=><span key={b} className={i<Math.ceil(right/3)?"badge-earned":"badge-locked"}>{i<Math.ceil(right/3)?"🏅":"🔒"} {b}</span>)}</div><div className="result-actions"><button className="btn btn-primary" onClick={()=>window.print()}>🖨️ Cetak Piagam</button><button className="btn btn-outline" onClick={begin}>↻ Main Lagi</button><button className="btn btn-ghost" onClick={restart}>Kembali ke Beranda</button></div><div className="certificate-print"><h1>PIAGAM PENJELAJAH SEJARAH</h1><h2>{mode==="class"?teamWinner:name}</h2><p>Telah menyelesaikan Petualangan Sejarah Nusantara</p><h3>{mode==="class"?totalScore:score} POIN · {right} JAWABAN BENAR</h3><p>Terus belajar, bersatu, dan cintai Indonesia!</p></div></section>}
  {diagnostics&&<aside className="diagnostics"><div className="diag-head"><b>🛠 DIAGNOSTIK GURU</b><button onClick={()=>setDiagnostics(false)}>✕</button></div><p>Status kamera: <b>{sensorStatus}</b></p><p>Model: <b>MediaPipe Hand Landmarker</b></p><p>Deteksi tangan: <b>{sensorPoint?"Terdeteksi":"Belum terdeteksi"}</b></p><p>Koordinat telunjuk: <b>{sensorPoint?`${sensorPoint.x.toFixed(3)}, ${sensorPoint.y.toFixed(3)}`:"—"}</b></p><p>Target: <b>{target===null?"Tidak ada":String.fromCharCode(65+Number(target))}</b></p><p>Progres tahan: <b>{Math.round(hold*100)}%</b></p><p>Mode: <b>{practice?"Latihan tanpa kamera":mode==="class"?"Tantangan kelas":"Individu"}</b></p></aside>}
  {sensorPoint&&phase==="playing"&&!practice&&<div className="finger-cursor" style={cursorStyle}><span/></div>}
  <footer className="footer"><span>🇮🇩 BELAJAR SEJARAH · MENJAGA INGATAN NUSANTARA</span><span>DIRANCANG UNTUK PEMBELAJARAN KELAS VI</span></footer>
 </main>;
}