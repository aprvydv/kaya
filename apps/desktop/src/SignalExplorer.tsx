import { useEffect, useMemo, useRef, useState } from 'react'
import { channelSamples, spectrogram, waveformEnvelope, type ChannelMode } from './signal'

type Props = { buffer: AudioBuffer | null; playbackTime: number; seek: (seconds: number) => void }
function drawWave(canvas: HTMLCanvasElement, data: Float32Array, start: number, end: number, cursor: number, duration: number, sampleRate: number) {
  const rect=canvas.getBoundingClientRect()
  if(!rect.width || !rect.height)return
  const ratio=Math.min(window.devicePixelRatio||1,2),w=Math.round(rect.width*ratio),h=Math.round(rect.height*ratio)
  canvas.width=w;canvas.height=h
  const ctx=canvas.getContext('2d')
  if(!ctx)return
  ctx.clearRect(0,0,w,h)
  ctx.fillStyle='#161c22';ctx.fillRect(0,0,w,h)
  ctx.strokeStyle='#35414b';ctx.lineWidth=1
  ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke()
  const env=waveformEnvelope(data,start,end,Math.max(1,Math.round(w/2)))
  ctx.strokeStyle='#cba38b';ctx.lineWidth=1.5*ratio
  ctx.beginPath()
  for(let i=0;i<env.length;i++){
    const x=(i+.5)/env.length*w,lo=h/2-env[i].max*h*.45,hi=h/2-env[i].min*h*.45
    ctx.moveTo(x,lo);ctx.lineTo(x,Math.max(lo+.8,hi))
  }
  ctx.stroke()
  const left=start/sampleRate,right=end/sampleRate
  if(cursor>=left&&cursor<=right){
    const x=(cursor-left)/(right-left)*w
    ctx.strokeStyle='#f1ede5';ctx.lineWidth=1*ratio;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()
  }
}
function drawSpectrum(canvas: HTMLCanvasElement, data: Float32Array, rate: number, start: number, end: number, fftSize: number) {
  const rect=canvas.getBoundingClientRect()
  if(!rect.width||!rect.height)return
  const ratio=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,Math.round(rect.width*ratio)),h=Math.max(1,Math.round(rect.height*ratio))
  canvas.width=w;canvas.height=h
  const ctx=canvas.getContext('2d');if(!ctx)return
  ctx.fillStyle='#131820';ctx.fillRect(0,0,w,h)
  const columns=Math.min(320,Math.max(1,Math.round(w/3)))
  const slices=spectrogram(data,rate,start,end,columns,fftSize)
  const binCount=fftSize/2
  for(let x=0;x<slices.length;x++){
    const bins=slices[x].bins
    const x1=Math.floor(x*w/columns),x2=Math.ceil((x+1)*w/columns)
    for(let y=0;y<h;y+=2){
      const norm=1-y/h
      // log-like frequency mapping, emphasizing low and mid frequencies.
      const f=(Math.pow(1000,norm)-1)/999
      const k=Math.min(binCount-1,Math.floor(f*(binCount-1)))
      const db=bins[k],t=Math.min(1,Math.max(0,(db+95)/90))
      const r=Math.round(18+190*t),g=Math.round(24+127*t*t),b=Math.round(35+103*Math.sqrt(t))
      ctx.fillStyle=`rgb(${r},${g},${b})`
      ctx.fillRect(x1,y,Math.max(1,x2-x1),2)
    }
  }
}
export function SignalExplorer({buffer,playbackTime,seek}:Props){
  const [zoom,setZoom]=useState(1)
  const [offset,setOffset]=useState(0)
  const [channel,setChannel]=useState<ChannelMode>('left')
  const [fftSize,setFftSize]=useState(1024)
  const [width,setWidth]=useState(800)
  const wave=useRef<HTMLCanvasElement>(null),spectrum=useRef<HTMLCanvasElement>(null)
  const holder=useRef<HTMLDivElement>(null)
  const duration=buffer?.duration||0
  const visible=duration/zoom
  const maxStart=Math.max(0,duration-visible)
  const viewStart=Math.min(offset,maxStart),viewEnd=Math.min(duration,viewStart+visible)
  const rangeStart=buffer?Math.floor(viewStart*buffer.sampleRate):0
  const rangeEnd=buffer?Math.min(buffer.length,Math.ceil(viewEnd*buffer.sampleRate)):0
  const samples=useMemo(()=>buffer?channelSamples(buffer,channel):null,[buffer,channel])
  useEffect(()=>{setZoom(1);setOffset(0);setChannel('left')},[buffer])
  useEffect(()=>{
    const observer=new ResizeObserver(entries=>setWidth(entries[0]?.contentRect.width||800))
    if(holder.current)observer.observe(holder.current)
    return()=>observer.disconnect()
  },[])
  useEffect(()=>{
    if(!samples||!buffer)return
    if(wave.current)drawWave(wave.current,samples,rangeStart,rangeEnd,playbackTime,duration,buffer.sampleRate)
  },[samples,buffer,rangeStart,rangeEnd,playbackTime,width,duration])
  useEffect(()=>{
    if(!samples||!buffer)return
    if(spectrum.current)drawSpectrum(spectrum.current,samples,buffer.sampleRate,rangeStart,rangeEnd,fftSize)
  },[samples,buffer,rangeStart,rangeEnd,fftSize,width])
  function seekAt(event:React.MouseEvent<HTMLCanvasElement>){
    if(!buffer)return
    const r=event.currentTarget.getBoundingClientRect()
    seek(Math.max(0,Math.min(duration,viewStart+(event.clientX-r.left)/r.width*(viewEnd-viewStart))))
  }
  return <section className="explorer" aria-label="Signal Explorer">
    <div className="explorerbar"><strong>SIGNAL EXPLORER <small>DECODED PCM · NON-DESTRUCTIVE</small></strong>
      <div className="explorercontrols"><label>CHANNEL <select value={channel} onChange={e=>setChannel(e.target.value as ChannelMode)} disabled={!buffer}><option value="left">{buffer?.numberOfChannels===1?'MONO':'LEFT'}</option>{buffer && buffer.numberOfChannels>1 && <><option value="right">RIGHT</option><option value="mix">L+R MIX</option></>}</select></label><label>FFT <select value={fftSize} onChange={e=>setFftSize(Number(e.target.value))}><option value="512">512</option><option value="1024">1024</option><option value="2048">2048</option></select></label></div></div>
    <div className="canvaswrap" ref={holder}>
      {buffer?<><div className="visualtitle">WAVEFORM <span>min / max envelope</span></div><canvas ref={wave} className="wavecanvas" onClick={seekAt} aria-label="Waveform, click to seek"/>
      <div className="visualtitle">SPECTROGRAM <span>Hann-window FFT · logarithmic display scale · dB</span></div><canvas ref={spectrum} className="spectrocanvas" onClick={seekAt} aria-label="Spectrogram, click to seek"/></>:<div className="explorerempty">Import audio to explore its waveform and frequency spectrum.</div>}
    </div>
    <div className="ruler"><span>{viewStart.toFixed(2)}s</span><span>{((viewStart+viewEnd)/2).toFixed(2)}s</span><span>{viewEnd.toFixed(2)}s</span></div>
    <div className="zoomrow"><label>ZOOM <input type="range" min="1" max="16" step="1" value={zoom} disabled={!buffer} onChange={e=>{setZoom(Number(e.target.value));setOffset(0)}}/></label><span>{zoom}×</span><label className="panlabel">PAN <input type="range" min="0" max={maxStart||1} step={Math.max(.001,maxStart/300)} value={viewStart} disabled={!buffer||zoom===1} onChange={e=>setOffset(Number(e.target.value))}/></label><button disabled={!buffer} onClick={()=>{setZoom(1);setOffset(0)}}>RESET</button></div>
  </section>
}
