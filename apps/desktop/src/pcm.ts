/** Bit-accurate sample inspection for classic little-endian integer PCM in RIFF/WAVE. */
export type PcmFormat = {
  channels:number; bitDepth:number; sampleRate:number; frames:number;
  dataOffset:number; dataBytes:number; codec:string
}
export type PcmSample = {
  frame:number; channel:number; timeSeconds:number; byteOffset:number;
  signedValue:number; normalized:number; hex:string; binary:string; lsb:number
}
export function readPcmSample(bytes: ArrayBuffer, info: PcmFormat, frame:number, channel:number): PcmSample {
  if(info.codec !== 'PCM integer' || ![8,16,24,32].includes(info.bitDepth)) throw new Error('Only integer PCM is supported')
  if(!Number.isSafeInteger(frame) || frame<0 || frame>=info.frames || !Number.isSafeInteger(channel) || channel<0 || channel>=info.channels) throw new RangeError('Sample index outside audio data')
  const width=info.bitDepth/8
  const byteOffset=info.dataOffset+(frame*info.channels+channel)*width
  if(byteOffset<info.dataOffset || byteOffset+width>info.dataOffset+info.dataBytes || byteOffset+width>bytes.byteLength) throw new RangeError('Truncated PCM sample')
  const dv=new DataView(bytes,byteOffset,width)
  let raw=0
  for(let i=0;i<width;i++) raw+=dv.getUint8(i)*2**(8*i)
  let signedValue:number
  if(info.bitDepth===8) signedValue=raw-128 // PCM8 is unsigned
  else signedValue=raw>=2**(info.bitDepth-1)?raw-2**info.bitDepth:raw
  return {
    frame, channel, timeSeconds:frame/info.sampleRate, byteOffset,
    signedValue, normalized:signedValue/(2**(info.bitDepth-1)),
    hex:raw.toString(16).toUpperCase().padStart(width*2,'0'),
    binary:raw.toString(2).padStart(info.bitDepth,'0'),
    lsb:raw%2
  }
}
export function sampleWindow(bytes:ArrayBuffer,info:PcmFormat,center:number,count=9,channel=0):PcmSample[]{
  if(!Number.isSafeInteger(count)||count<1||count>128)throw new RangeError('Invalid window size')
  if(info.frames<1)return []
  const clamped=Math.min(info.frames-1,Math.max(0,Math.trunc(center)))
  const first=Math.min(Math.max(0,clamped-Math.floor(count/2)),Math.max(0,info.frames-count))
  const result:PcmSample[]=[]
  for(let f=first;f<Math.min(info.frames,first+count);f++)result.push(readPcmSample(bytes,info,f,channel))
  return result
}
