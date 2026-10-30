/** KAYA experimental LSB steganography (not encryption or security). 
 * Fixed 16-bit little-endian PCM only. Payload frame: 'KYLS' + uint32 LE byte length
 * + uint32 LE CRC32 + UTF-8 bytes, embedded MSB-first into low byte of successive samples.
 * Source is copied; all non-LSB bits and header chunks remain untouched.
 */
import type { PcmFormat } from './pcm.ts'
const HEADER_SIZE=12
const MAGIC=[75,89,76,83]
function requireFormat(info:PcmFormat) {
  if(info.codec!=='PCM integer'||info.bitDepth!==16||info.channels<1||info.frames<1 ||
    info.dataBytes!==info.frames*info.channels*2) throw new Error('LSB lab supports 16-bit PCM WAV only')
}
function crc32(data:Uint8Array):number {
  let crc=0xffffffff
  for(const byte of data){
    crc^=byte
    for(let i=0;i<8;i++) crc=(crc>>>1)^((crc&1)?0xedb88320:0)
  }
  return (crc^0xffffffff)>>>0
}
export function capacityBytes(info:PcmFormat):number {
  requireFormat(info)
  return Math.max(0,Math.floor(info.dataBytes/2/8)-HEADER_SIZE)
}
function writeBit(out:Uint8Array,info:PcmFormat,index:number,bit:number) {
  const at=info.dataOffset+index*2
  out[at]=(out[at]&0xfe)|bit
}
function readBit(data:Uint8Array,info:PcmFormat,index:number):number {
  return data[info.dataOffset+index*2]&1
}
function assertSource(source:ArrayBuffer,info:PcmFormat) {
  requireFormat(info)
  if(info.dataOffset<0||!Number.isSafeInteger(info.dataOffset)||
     info.dataOffset+info.dataBytes>source.byteLength) throw new Error('Malformed source byte range')
}
export type EmbedResult={output:ArrayBuffer;changedSamples:number;usedSamples:number;capacityBytes:number;payloadBytes:number}
export function embedMessage(source:ArrayBuffer,info:PcmFormat,message:string):EmbedResult {
  assertSource(source,info)
  const payload=new TextEncoder().encode(message)
  const max=capacityBytes(info)
  if(payload.length===0) throw new Error('Enter a nonempty message')
  if(payload.length>max) throw new RangeError(`Message too large (${payload.length} bytes; capacity ${max} bytes)`)
  const frame=new Uint8Array(HEADER_SIZE+payload.length)
  frame.set(MAGIC,0)
  const v=new DataView(frame.buffer)
  v.setUint32(4,payload.length,true)
  v.setUint32(8,crc32(payload),true)
  frame.set(payload,HEADER_SIZE)
  const input=new Uint8Array(source),out=new Uint8Array(source.slice(0))
  let changed=0,bitIndex=0
  for(const byte of frame){
    for(let shift=7;shift>=0;shift--){
      const at=info.dataOffset+bitIndex*2
      const next=(byte>>>shift)&1
      if((input[at]&1)!==next) changed++
      writeBit(out,info,bitIndex,next)
      bitIndex++
    }
  }
  return {output:out.buffer,changedSamples:changed,usedSamples:bitIndex,capacityBytes:max,payloadBytes:payload.length}
}
export function extractMessage(source:ArrayBuffer,info:PcmFormat):string {
  assertSource(source,info)
  const data=new Uint8Array(source)
  const count=info.dataBytes/2
  if(count<HEADER_SIZE*8) throw new Error('Audio too short to contain a KAYA payload')
  const getBytes=(offset:number,n:number)=>{
    const out=new Uint8Array(n)
    for(let i=0;i<n;i++){
      let byte=0
      for(let k=0;k<8;k++)byte=(byte<<1)|readBit(data,info,(offset+i)*8+k)
      out[i]=byte
    }
    return out
  }
  const header=getBytes(0,HEADER_SIZE)
  if(MAGIC.some((v,i)=>header[i]!==v)) throw new Error('No KAYA LSB payload header found')
  const meta=new DataView(header.buffer),length=meta.getUint32(4,true),crc=meta.getUint32(8,true)
  if(length===0||length>Math.floor(count/8)-HEADER_SIZE) throw new Error('Invalid embedded payload length')
  const payload=getBytes(HEADER_SIZE,length)
  if(crc32(payload)!==crc) throw new Error('Payload integrity check failed (CRC32)')
  return new TextDecoder('utf-8',{fatal:true}).decode(payload)
}
