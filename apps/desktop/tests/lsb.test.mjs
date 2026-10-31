import test from 'node:test'
import assert from 'node:assert/strict'
import {capacityBytes,embedMessage,extractMessage} from '../src/lsb.ts'
function fixture(samples=1024){
  const info={codec:'PCM integer',channels:1,bitDepth:16,sampleRate:44100,frames:samples,dataOffset:44,dataBytes:samples*2}
  const source=new ArrayBuffer(44+samples*2),out=new Uint8Array(source)
  for(let i=0;i<out.length;i++)out[i]=(i*31+7)%256
  return {source,info}
}
test('embeds and extracts UTF-8 without modifying original',()=>{
 const {source,info}=fixture(2048),before=new Uint8Array(source).slice()
 const result=embedMessage(source,info,'Hello KAYA 🌙')
 assert.equal(extractMessage(result.output,info),'Hello KAYA 🌙')
 assert.deepEqual(new Uint8Array(source),before)
 assert.ok(result.changedSamples>0)
 const after=new Uint8Array(result.output)
 for(let i=0;i<after.length;i++){
  if(i>=info.dataOffset&&i<info.dataOffset+result.usedSamples*2&&((i-info.dataOffset)%2===0))
    assert.equal((before[i]^after[i])&0xfe,0)
  else assert.equal(after[i],before[i])
 }
})
test('capacity checks are based on one bit per 16-bit sample',()=>{
 const {source,info}=fixture(128)
 assert.equal(capacityBytes(info),4)
 assert.throws(()=>embedMessage(source,info,'12345'),RangeError)
 assert.equal(extractMessage(embedMessage(source,info,'1234').output,info),'1234')
})
test('absent marker and malformed payload are reported',()=>{
 const {source,info}=fixture(512)
 assert.throws(()=>extractMessage(source,info),/No KAYA/)
 const result=embedMessage(source,info,'secret')
 const changed=new Uint8Array(result.output)
 changed[info.dataOffset+(12*8)*2]^=1
 assert.throws(()=>extractMessage(result.output,info),/integrity/)
})
test('refuses incompatible input and empty message',()=>{
 const {source,info}=fixture()
 assert.throws(()=>embedMessage(source,{...info,bitDepth:24},'test'),/16-bit/)
 assert.throws(()=>embedMessage(source,info,''),/nonempty/)
})
