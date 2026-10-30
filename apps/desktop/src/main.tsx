import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

type Loaded = { name: string; sampleRate: number; channels: number; duration: number; peaks: number[]; url: string; type: string }

function buildPeaks(buffer: AudioBuffer, width = 320): number[] {
  const samples = buffer.getChannelData(0)
  const step = Math.max(1, Math.ceil(samples.length / width))
  const peaks: number[] = []
  for (let i = 0; i < width; i++) {
    let peak = 0
    const end = Math.min(samples.length, (i + 1) * step)
    for (let j = i * step; j < end; j++) peak = Math.max(peak, Math.abs(samples[j]))
    peaks.push(peak)
  }
  return peaks
}

function App() {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  const objectUrl = useRef<string | null>(null)
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current) }, [])

  async function importFile(file?: File) {
    if (!file) return
    setError('')
    try {
      const bytes = await file.arrayBuffer()
      const context = new AudioContext()
      let decoded: AudioBuffer
      try { decoded = await context.decodeAudioData(bytes.slice(0)) }
      finally { await context.close() }
      const url = URL.createObjectURL(file)
      const next: Loaded = {name: file.name, sampleRate: decoded.sampleRate, channels: decoded.numberOfChannels, duration: decoded.duration, peaks: buildPeaks(decoded), url, type: file.type || 'unknown'}
      audio.current?.pause()
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
      objectUrl.current = url
      setPlaying(false)
      setLoaded(next)
    } catch { setError('Unable to decode this file in your browser. Try a WAV file.') }
  }

  function togglePlayback() {
    if (!audio.current || !loaded) return
    if (audio.current.paused) { void audio.current.play().then(() => setPlaying(true)).catch(() => setError('Playback failed.')) }
    else { audio.current.pause(); setPlaying(false) }
  }
  const duration = loaded ? loaded.duration.toFixed(2) : '0.00'

  return <main className="shell">
    <header><div className="mark">K<span>Λ</span>YA</div><div className="topright">AUDIO ENGINEERING / SIGNAL FORENSICS <span className="stage">PRE-ALPHA</span></div></header>
    <section className="hero"><div className="eyebrow">01 / SIGNAL WORKSPACE</div><h1>Explore what<br/><em>sound conceals.</em></h1><p>An open-source workspace for examining audio as both sound and data.</p></section>
    <section className="panel"><div className="panelhead"><div><span className="dot"/> {loaded ? loaded.name : 'UNTITLED SESSION'} <small>{loaded ? 'LOCAL AUDIO · DECODED BY BROWSER' : 'NO FILE LOADED'}</small></div><span>{duration} SEC</span></div>
      <div className="signal"><div className="axis">+1.0<br/><br/>0.0<br/><br/>−1.0</div><div className="waveform" aria-label="Waveform preview">{loaded ? loaded.peaks.map((p,i)=><div className="bar" key={i} style={{height:`${Math.max(1,p*92)}%`}}/>) : <p className="empty">Import an audio file to inspect its waveform.</p>}</div></div>
      <div className="ruler"><span>00:00</span><span>{loaded ? (loaded.duration/2).toFixed(1)+'s' : '—'}</span><span>{loaded ? duration+'s' : '—'}</span></div>
      {loaded && <div className="metadata"><span>{loaded.sampleRate.toLocaleString()} Hz</span><span>{loaded.channels} channel{loaded.channels!==1?'s':''}</span><span>{loaded.type}</span></div>}
      <div className="actions"><label className="import">IMPORT AUDIO<input type="file" accept="audio/*,.wav,.mp3,.ogg,.flac" onChange={e=>void importFile(e.target.files?.[0])}/></label><button onClick={togglePlayback} disabled={!loaded}>{playing ? 'PAUSE' : 'PLAY'}</button><span className="hint">Files remain on your device. No upload.</span></div>
      {error && <p className="error" role="alert">{error}</p>}
      <audio ref={audio} src={loaded?.url} onEnded={()=>setPlaying(false)} onPause={()=>setPlaying(false)}/>
      <div className="tools"><span>◉ &nbsp; WAVEFORM / ACTIVE</span><span>◇ &nbsp; SPECTRUM / PLANNED</span><span>◇ &nbsp; FORENSICS / PLANNED</span></div>
    </section>
    <footer><span>ENGINEERING THE INVISIBLE.</span><span>BUILD 0.1.0 · BROWSER PROTOTYPE</span></footer>
  </main>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
