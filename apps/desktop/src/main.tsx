import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import { inspectWaveFile, type WavMetadata } from './wav'
import { SignalExplorer } from './SignalExplorer'
import { SampleInspector } from './SampleInspector'

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
  const [wavMeta,setWavMeta] = useState<WavMetadata | null>(null)
  const [wavSource,setWavSource] = useState<ArrayBuffer | null>(null)
  const [wavNotice,setWavNotice] = useState('')
  const [playing, setPlaying] = useState(false)
  const [playbackTime, setPlaybackTime] = useState(0)
  const [decodedBuffer, setDecodedBuffer] = useState<AudioBuffer | null>(null)
  const audio = useRef<HTMLAudioElement>(null)
  const objectUrl = useRef<string | null>(null)
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current) }, [])

  async function importFile(file?: File) {
    if (!file) return
    setError('')
    setWavMeta(null)
    setWavSource(null)
    setWavNotice('')
    try {
      const bytes = await file.arrayBuffer()
      if (new Uint8Array(bytes,0,Math.min(4,bytes.byteLength)).every((v,i)=>v===[82,73,70,70][i]) && bytes.byteLength>=4) {
        try { const metadata = await inspectWaveFile(bytes);setWavMeta(metadata);setWavSource(bytes) }
        catch (e) { setWavNotice(e instanceof Error ? e.message : 'Could not inspect WAV metadata') }
      } else { setWavNotice('This is not a classic RIFF/WAVE file. Binary inspection currently supports WAV only.') }
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
      setPlaybackTime(0)
      setDecodedBuffer(decoded)
      setLoaded(next)
    } catch { setError('Unable to decode this file in your browser. Try a WAV file.') }
  }

  function togglePlayback() {
    if (!audio.current || !loaded) return
    if (audio.current.paused) { void audio.current.play().then(() => setPlaying(true)).catch(() => setError('Playback failed.')) }
    else { audio.current.pause(); setPlaying(false) }
  }
  const duration = loaded ? loaded.duration.toFixed(2) : '0.00'
  function seek(seconds: number) { if(audio.current){audio.current.currentTime=seconds;setPlaybackTime(seconds)} }

  return <main className="shell">
    <header><div className="mark">K<span>Λ</span>YA</div><div className="topright">AUDIO ENGINEERING / SIGNAL FORENSICS <span className="stage">PRE-ALPHA</span></div></header>
    <section className="hero"><div className="eyebrow">01 / SIGNAL WORKSPACE</div><h1>Explore what<br/><em>sound conceals.</em></h1><p>An open-source workspace for examining audio as both sound and data.</p></section>
    <section className="panel"><div className="panelhead"><div><span className="dot"/> {loaded ? loaded.name : 'UNTITLED SESSION'} <small>{loaded ? 'LOCAL AUDIO · DECODED BY BROWSER' : 'NO FILE LOADED'}</small></div><span>{duration} SEC</span></div>
      <SignalExplorer buffer={decodedBuffer} playbackTime={playbackTime} seek={seek}/>
      {loaded && <div className="metadata"><span>{loaded.sampleRate.toLocaleString()} Hz</span><span>{loaded.channels} channel{loaded.channels!==1?'s':''}</span><span>{loaded.type}</span></div>}
      <div className="actions"><label className="import">IMPORT AUDIO<input type="file" accept="audio/*,.wav,.mp3,.ogg,.flac" onChange={e=>void importFile(e.target.files?.[0])}/></label><button onClick={togglePlayback} disabled={!loaded}>{playing ? 'PAUSE' : 'PLAY'}</button><span className="hint">Files remain on your device. No upload.</span></div>
      {wavMeta && <section className="inspector" aria-label="WAV file inspection"><h2>FILE INSPECTOR <small>EXACT SOURCE BYTES</small></h2><div className="inspectorgrid"><span>Container</span><strong>{wavMeta.container}</strong><span>Encoding</span><strong>{wavMeta.codec} · {wavMeta.bitDepth}-bit</strong><span>Sample rate</span><strong>{wavMeta.sampleRate.toLocaleString()} Hz</strong><span>Channels</span><strong>{wavMeta.channels}</strong><span>Frames</span><strong>{wavMeta.frames.toLocaleString()}</strong><span>Audio data</span><strong>{wavMeta.dataBytes.toLocaleString()} bytes · offset {wavMeta.dataOffset}</strong><span>Source SHA-256</span><code className="hash">{wavMeta.sha256}</code></div><p className="inspectorfoot">Metadata and SHA-256 are computed from the original file bytes. Waveform playback is browser-decoded and may be resampled.</p></section>}
      {wavNotice && <p className="notice" role="status">{wavNotice}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <audio ref={audio} src={loaded?.url} onTimeUpdate={e=>setPlaybackTime(e.currentTarget.currentTime)} onEnded={()=>setPlaying(false)} onPause={()=>setPlaying(false)}/>
      <SampleInspector source={wavSource} info={wavMeta} playbackTime={playbackTime}/>
      <div className="tools"><span>◉ &nbsp; WAVEFORM / ACTIVE</span><span>◉ &nbsp; SPECTRUM / ACTIVE</span><span>◉ &nbsp; SAMPLE INSPECTOR / ACTIVE</span></div>
    </section>
    <footer><span>ENGINEERING THE INVISIBLE.</span><span>BUILD 0.1.0 · BROWSER PROTOTYPE</span></footer>
  </main>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
