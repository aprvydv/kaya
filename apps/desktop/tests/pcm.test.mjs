import test from 'node:test'
import assert from 'node:assert/strict'
import { readPcmSample, sampleWindow } from '../src/pcm.ts'
const format=(depth,channels,frames)=>({codec:'PCM integer',bitDepth:depth,channels,frames,sampleRate:48000,dataOffset:4,dataBytes:frames*channels*(depth/8)})
test('16-bit signed PCM and interleaved stereo offsets',()=>{
 const bytes=Uint8Array.from([1,2,3,4,0xff,0x7f,0x00,0x80,0x01,0x00,0xff,0xff]).buffer
 const f=format(16,2,2)
 const a=readPcmSample(bytes,f,0,0), b=readPcmSample(bytes,f,0,1)
 assert.equal(a.signedValue,32767);assert.equal(a.hex,'7FFF');assert.equal(a.lsb,1)
 assert.equal(b.signedValue,-32768);assert.equal(b.normalized,-1);assert.equal(b.byteOffset,6)
 assert.equal(readPcmSample(bytes,f,1,0).signedValue,1)
 assert.equal(readPcmSample(bytes,f,1,1).signedValue,-1)
})
test('8-bit unsigned PCM is normalized around 128',()=>{
 const b=Uint8Array.from([0,0,0,0,0,128,255]).buffer
 const f=format(8,1,3)
 assert.equal(readPcmSample(b,f,0,0).signedValue,-128)
 assert.equal(readPcmSample(b,f,1,0).normalized,0)
 assert.equal(readPcmSample(b,f,2,0).signedValue,127)
})
test('24-bit sign extension and 32-bit minimum',()=>{
 const p=Uint8Array.from([0,0,0,0,0,0,0x80]).buffer
 assert.equal(readPcmSample(p,format(24,1,1),0,0).signedValue,-8388608)
 const q=Uint8Array.from([0,0,0,0,0,0,0,0x80]).buffer
 assert.equal(readPcmSample(q,format(32,1,1),0,0).signedValue,-2147483648)
})
test('rejects unsupported formats and invalid bounds',()=>{
 const data=new ArrayBuffer(8)
 assert.throws(()=>readPcmSample(data,{...format(16,1,1),codec:'IEEE float'},0,0))
 assert.throws(()=>readPcmSample(data,format(16,1,1),1,0),RangeError)
 assert.throws(()=>readPcmSample(data,format(16,1,1),0,1),RangeError)
 assert.throws(()=>sampleWindow(data,format(16,1,1),0,129),RangeError)
})
test('sample window follows source frames without exceeding ends',()=>{
 const b=new ArrayBuffer(4+10*2),f=format(16,1,10)
 const rows=sampleWindow(b,f,9,9)
 assert.equal(rows.length,9);assert.equal(rows[0].frame,1);assert.equal(rows[8].frame,9)
})
