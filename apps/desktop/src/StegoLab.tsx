import { useEffect, useState } from 'react'
import type { WavMetadata } from './wav'
import {capacityBytes,embedMessage,extractMessage,type EmbedResult} from './lsb'
type Props={source:ArrayBuffer|null;info:WavMetadata|null;filename:string}
export function StegoLab({source,info,filename}:Props){
  const [message,setMessage]=useState('')
  const [result,setResult]=useState<EmbedResult|null>(null)
  const [recovered,setRecovered]=useState('')
  const [error,setError]=useState('')
  const [status,setStatus]=useState('')
  useEffect(()=>{setResult(null);setRecovered('');setError('');setStatus('');setMessage('')},[source])
  const supported=!!source&&!!info&&info.codec==='PCM integer'&&info.bitDepth===16
  const capacity=supported?capacityBytes(info!):0
  function embed(){
    if(!source||!info)return
    try{
      const next=embedMessage(source,info,message)
      setResult(next);setRecovered('');setError('')
      setStatus('Embedded in a separate WAV copy. Original audio has not been modified.')
    }catch(e){setError(e instanceof Error?e.message:'Embedding failed')}
  }
  function extract(bytes:ArrayBuffer){
    if(!info)return
    try{setRecovered(extractMessage(bytes,info));setError('');setStatus('KAYA payload recovered and CRC32 verified.')}
    catch(e){setError(e instanceof Error?e.message:'Extraction failed');setRecovered('')}
  }
  function download(){
    if(!result)return
    const url=URL.createObjectURL(new Blob([result.output],{type:'audio/wav'}))
    const a=document.createElement('a')
    a.href=url;a.download=filename.replace(/\.wav$/i,'')+'-kaya-lsb.wav';a.click()
    // Revocation is delayed to allow the browser to start saving.
    window.setTimeout(()=>URL.revokeObjectURL(url),10000)
  }
  return <section className="stegolab" aria-label="LSB steganography laboratory">
    <div className="stegohead"><strong>STEGANOGRAPHY LAB <small>EXPERIMENT 001 / 1-BIT LSB</small></strong><span>16-BIT PCM WAV ONLY</span></div>
    {supported?<><div className="stegocap"><span>MAXIMUM UTF-8 PAYLOAD</span><strong>{capacity.toLocaleString()} bytes</strong><span>1 bit per sample · 12-byte framing overhead</span></div>
      <label className="stegolabel" htmlFor="stego-msg">SECRET MESSAGE (NOT ENCRYPTED)</label>
      <textarea id="stego-msg" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Type a small message to embed into a copy of the WAV file" rows={3}/>
      <div className="stegoactions"><button onClick={embed}>EMBED IN COPY</button><button onClick={()=>result&&extract(result.output)} disabled={!result}>VERIFY EXTRACTION</button><button onClick={download} disabled={!result}>DOWNLOAD WAV</button><button onClick={()=>source&&extract(source)}>SCAN ORIGINAL FOR KAYA PAYLOAD</button></div>
      {result&&<div className="stegoresults"><span>Payload: <strong>{result.payloadBytes.toLocaleString()} bytes</strong></span><span>Samples used: <strong>{result.usedSamples.toLocaleString()}</strong></span><span>LSBs actually changed: <strong>{result.changedSamples.toLocaleString()}</strong></span><span>Changes in all other bits: <strong>0 (by construction)</strong></span></div>}
      {recovered&&<div className="stegorecovered"><small>RECOVERED PAYLOAD</small><pre>{recovered}</pre></div>}
      {status&&<p className="stegostatus" role="status">{status}</p>}{error&&<p className="stegoerror" role="alert">{error}</p>}
    </>:<p className="stegonotice">Import a classic, uncompressed 16-bit PCM WAV file to run this experiment. MP3, float WAV, and other PCM depths are not yet supported.</p>}
    <p className="stegowarning">Educational experiment, not secure communication: the message is unencrypted, and simple LSB embedding is fragile and detectable. Avoid converting the output to MP3 or resampling it before extraction. File contents remain local.</p>
  </section>
}
