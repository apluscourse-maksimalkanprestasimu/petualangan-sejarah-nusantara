import { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

type Props = { onPoint:(point:{x:number;y:number}|null)=>void; onStatus:(status:string)=>void; enabled:boolean; mirrored?:boolean };
export default function HandCamera({onPoint,onStatus,enabled,mirrored=true}:Props) {
  const videoRef=useRef<HTMLVideoElement>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const landmarkerRef=useRef<HandLandmarker|null>(null);
  const rafRef=useRef<number>(0);
  const lastVideoTime=useRef(-1);
  const [cameraError,setCameraError]=useState("");
  const [loading,setLoading]=useState(false);
  const [cameraOn,setCameraOn]=useState(false);
  const [modelReady,setModelReady]=useState(false);
  const [handFound,setHandFound]=useState(false);

  const stop=useCallback(()=>{
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(track=>track.stop());
    streamRef.current=null;
    if(videoRef.current) videoRef.current.srcObject=null;
    setCameraOn(false); setHandFound(false); onPoint(null);
    onStatus("Kamera dimatikan");
  },[onPoint,onStatus]);

  const start=useCallback(async()=>{
    setCameraError(""); setLoading(true);
    try {
      if(!navigator.mediaDevices?.getUserMedia) throw new Error("Browser ini tidak mendukung akses kamera. Gunakan browser modern melalui HTTPS atau localhost.");
      const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:"user",width:{ideal:1280},height:{ideal:720}}});
      streamRef.current=stream;
      if(!videoRef.current) throw new Error("Elemen video belum siap.");
      videoRef.current.srcObject=stream;
      await videoRef.current.play();
      setCameraOn(true); onStatus("Kamera aktif · memuat sensor tangan…");
      if(!landmarkerRef.current) {
        const vision=await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
        landmarkerRef.current=await HandLandmarker.createFromOptions(vision,{
          baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",delegate:"GPU"},
          runningMode:"VIDEO",numHands:1,minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.5
        });
      }
      setModelReady(true); onStatus("Sensor siap · arahkan telunjuk ke kamera");
      lastVideoTime.current=-1;
      const track=()=>{
        const video=videoRef.current, detector=landmarkerRef.current;
        if(video && detector && video.readyState>=2 && video.currentTime!==lastVideoTime.current) {
          lastVideoTime.current=video.currentTime;
          const result=detector.detectForVideo(video,performance.now());
          const tip=result.landmarks?.[0]?.[8];
          if(tip) {
            setHandFound(true);
            onPoint({x:mirrored?1-tip.x:tip.x,y:tip.y});
            onStatus("Tangan terdeteksi · arahkan ujung telunjuk ke lebah");
          } else {
            setHandFound(false); onPoint(null); onStatus("Arahkan tangan ke depan kamera");
          }
        }
        rafRef.current=requestAnimationFrame(track);
      };
      rafRef.current=requestAnimationFrame(track);
    } catch(error) {
      const message=error instanceof Error?error.message:"Kamera atau model sensor gagal diaktifkan.";
      setCameraError(message); onStatus("Kamera belum aktif"); stop();
    } finally { setLoading(false); }
  },[mirrored,onPoint,onStatus,stop]);

  useEffect(()=>()=>{cancelAnimationFrame(rafRef.current);streamRef.current?.getTracks().forEach(t=>t.stop());landmarkerRef.current?.close();},[]);
  return <div className="camera-panel">
    <div className="camera-preview">
      <video ref={videoRef} muted playsInline className={mirrored?"mirrored":""}/>
      {!cameraOn && <div className="camera-placeholder"><span>📷</span><b>Pratinjau kamera</b><small>Aktifkan kamera untuk menggunakan sensor jari</small></div>}
      <div className="camera-chip"><i className={cameraOn&&modelReady?"live-dot":""}/>{cameraOn?(modelReady?"SENSOR SIAP":"MEMUAT SENSOR"):"KAMERA NONAKTIF"}</div>
      {cameraOn && <div className="hand-chip">{handFound?"✋ Tangan terdeteksi":"☝️ Cari posisi tangan…"}</div>}
    </div>
    {cameraError && <p className="error-text">{cameraError}</p>}
    <div className="camera-actions">
      {!cameraOn?<button className="btn btn-primary" onClick={start} disabled={loading}>{loading?"Mengaktifkan…":"📷 Aktifkan Kamera"}</button>:<button className="btn btn-ghost" onClick={stop}>Matikan kamera</button>}
      <span className="privacy-note">🔒 Video diproses lokal, tidak direkam atau diunggah.</span>
    </div>
  </div>;
}