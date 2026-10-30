import test from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { inspectWaveFile } from '../src/wav.ts'

globalThis.crypto ??= webcrypto

function makeWav({ channels=1, bits=16, frames=8, extra=false }={}) {
  const align=channels*bits/8, size=frames*align, extraSize=extra?10:0
  const b=new Uint8Array(44+size+extraSize)
  const v=new DataView(b.buffer)
  const text=(i,s)=>{ for(let j=0;j<s.length;j++) b[i+j]=s.charCodeAt(j) }
  text(0,'RIFF');v.setUint32(4,b.length-8,true);text(8,'WAVE')
  let p=12
  if(extra){text(p,'JUNK');v.setUint32(p+4,1,true);b[p+8]=42;p+=10}
  text(p,'fmt ');v.setUint32(p+4,16,true);v.setUint16(p+8,1,true)
  v.setUint16(p+10,channels,true);v.setUint32(p+12,44100,true)
  v.setUint32(p+16,44100*align,true);v.setUint16(p+20,align,true)
  v.setUint16(p+22,bits,true);p+=24
  text(p,'data');v.setUint32(p+4,size,true)
  return b.buffer
}

test('inspects PCM depths, channels and exact original hash',async()=>{
  for(const bits of [8,16,24,32]){
    const b=makeWav({bits,channels:2,frames:10})
    const m=await inspectWaveFile(b)
    assert.equal(m.bitDepth,bits)
    assert.equal(m.channels,2)
    assert.equal(m.frames,10)
    assert.match(m.sha256,/^[0-9a-f]{64}$/)
    assert.equal(new Uint8Array(b).length,44+bits/8*20)
  }
})
test('skips odd padded non-audio chunks',async()=>{
  const m=await inspectWaveFile(makeWav({extra:true}))
  assert.equal(m.dataOffset,54)
})
test('rejects damaged header and inconsistent size',async()=>{
  const a=makeWav();new Uint8Array(a)[0]=88
  await assert.rejects(inspectWaveFile(a),/RIFF/)
  const b=makeWav();new DataView(b).setUint32(4,2,true)
  await assert.rejects(inspectWaveFile(b),/RIFF size/)
})
test('rejects malformed block alignment and unsupported format',async()=>{
  const a=makeWav();new DataView(a).setUint16(32,0,true)
  await assert.rejects(inspectWaveFile(a),/Inconsistent/)
  const b=makeWav();new DataView(b).setUint16(20,6,true)
  await assert.rejects(inspectWaveFile(b),/Unsupported/)
})
test('source hash changes with source bytes',async()=>{
  const a=makeWav(), b=makeWav()
  new Uint8Array(b)[44]=1
  assert.notEqual((await inspectWaveFile(a)).sha256,(await inspectWaveFile(b)).sha256)
})
