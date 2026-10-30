/** Lightweight browser-side WAV header inspector. Rust is the authoritative planned parser. */
export type WavMetadata = {
  container: string; codec: string; channels: number; sampleRate: number;
  bitDepth: number; frames: number; duration: number; dataBytes: number;
  dataOffset: number; sha256: string
}
function hex(bytes: Uint8Array) { return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('') }
export async function inspectWaveFile(bytes: ArrayBuffer): Promise<WavMetadata> {
  const view = new DataView(bytes)
  const data = new Uint8Array(bytes)
  if (bytes.byteLength < 12) throw new Error('WAV header is incomplete')
  const fourcc = (at: number) => String.fromCharCode(...data.slice(at,at+4))
  if (fourcc(0) !== 'RIFF' || fourcc(8) !== 'WAVE') throw new Error('Only classic RIFF/WAVE files are supported')
  const end = view.getUint32(4,true) + 8
  if (end !== bytes.byteLength) throw new Error('RIFF size does not match the file length')
  let fmt: {format:number;channels:number;sampleRate:number;byteRate:number;align:number;bits:number}|undefined
  let audio: {offset:number;size:number}|undefined
  for(let p=12;p<end;) {
    if(end-p<8) throw new Error('Truncated WAV chunk header')
    const id=fourcc(p),size=view.getUint32(p+4,true),start=p+8,stop=start+size,padded=stop+(size%2)
    if(padded>end) throw new Error('Truncated WAV chunk')
    if(id==='fmt ' && !fmt) {
      if(size<16) throw new Error('Invalid WAV format chunk')
      fmt={format:view.getUint16(start,true),channels:view.getUint16(start+2,true),sampleRate:view.getUint32(start+4,true),byteRate:view.getUint32(start+8,true),align:view.getUint16(start+12,true),bits:view.getUint16(start+14,true)}
    }
    if(id==='data' && !audio) audio={offset:start,size}
    p=padded
  }
  if(!fmt || !audio) throw new Error('WAV format or data chunk is missing')
  const integer=fmt.format===1 && [8,16,24,32].includes(fmt.bits)
  const floating=fmt.format===3 && [32,64].includes(fmt.bits)
  if(!integer && !floating) throw new Error('Unsupported WAV audio format')
  const expectedAlign=fmt.channels*(fmt.bits/8)
  if(!fmt.channels || !fmt.sampleRate || !fmt.align || fmt.align!==expectedAlign || fmt.byteRate!==fmt.sampleRate*fmt.align) throw new Error('Inconsistent WAV format fields')
  if(audio.size%fmt.align!==0) throw new Error('Incomplete audio frame')
  const sha256=hex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))
  const frames=audio.size/fmt.align
  return {container:'RIFF / WAVE',codec:floating?'IEEE float':'PCM integer',channels:fmt.channels,sampleRate:fmt.sampleRate,bitDepth:fmt.bits,frames,duration:frames/fmt.sampleRate,dataBytes:audio.size,dataOffset:audio.offset,sha256}
}
