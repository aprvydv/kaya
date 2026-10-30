import { useMemo, useState } from 'react'
import { sampleWindow, type PcmFormat } from './pcm'
type Props={source:ArrayBuffer|null;info:PcmFormat|null;playbackTime:number}
export function SampleInspector({source,info,playbackTime}:Props){
  const [channel,setChannel]=useState(0)
  const [manualFrame,setManualFrame]=useState('')
  const effectiveChannel=info?Math.min(channel,info.channels-1):0
  const frame=info ? (manualFrame.trim() && /^\d+$/.test(manualFrame) ? Math.min(info.frames-1,Number(manualFrame)) : Math.min(info.frames-1,Math.max(0,Math.floor(playbackTime*info.sampleRate)))) : 0
  const available=!!source&&!!info&&info.codec==='PCM integer'&&[8,16,24,32].includes(info.bitDepth)
  const rows=useMemo(()=>available?sampleWindow(source!,info!,frame,9,effectiveChannel):[],[available,source,info,frame,effectiveChannel])
  return <section className="sampleinspector" aria-label="PCM sample inspector">
    <div className="samplehead"><strong>FORENSIC MICROSCOPE <small>ORIGINAL PCM BYTES</small></strong>
      {available&&<div className="samplecontrols"><label>CHANNEL <select value={effectiveChannel} onChange={e=>setChannel(Number(e.target.value))}>{Array.from({length:info!.channels},(_,i)=><option value={i} key={i}>{i+1}</option>)}</select></label><label>FRAME <input type="number" min="0" max={Math.max(0,info!.frames-1)} placeholder="Follow playhead" value={manualFrame} onChange={e=>setManualFrame(e.target.value)}/></label><button onClick={()=>setManualFrame('')}>FOLLOW PLAYHEAD</button></div>}
    </div>
    {available?<><div className="sampletablewrap"><table className="sampletable"><thead><tr><th>FRAME</th><th>TIME</th><th>BYTE OFFSET</th><th>PCM VALUE</th><th>NORMALIZED</th><th>HEX</th><th>BINARY (RAW)</th><th>LSB</th></tr></thead><tbody>{rows.map(row=><tr key={row.frame} className={row.frame===frame?'sampleactive':''}><td>{row.frame}</td><td>{row.timeSeconds.toFixed(5)}s</td><td>{row.byteOffset}</td><td>{row.signedValue}</td><td>{row.normalized.toFixed(6)}</td><td>{row.hex}</td><td className="samplebits">{row.binary}</td><td>{row.lsb}</td></tr>)}</tbody></table></div><p className="samplecaveat">Binary and hex represent original little-endian PCM sample words (displayed most-significant bit first). 8-bit PCM uses unsigned storage with a 128 offset. Bit values are observations only—not proof of steganography. Source bytes remain unchanged.</p></>:<p className="samplecaveat">Import a classic RIFF/WAVE integer PCM file (8, 16, 24 or 32 bit) to inspect source samples. MP3 and float WAV are not supported in this view.</p>}
  </section>
}
