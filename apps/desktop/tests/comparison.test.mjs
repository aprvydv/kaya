import test from 'node:test'
import assert from 'node:assert/strict'
import {comparePcm} from '../src/comparison.ts'
import {embedMessage} from '../src/lsb.ts'
function fixture(frames=1024){
 const info={codec:'PCM integer',bitDepth:16,channels:1,frames,sampleRate:48000,dataOffset:44,dataBytes:frames*2}
 const bytes=new ArrayBuffer(info.dataOffset+info.dataBytes),view=new DataView(bytes)
 for(let i=0;i<frames;i++)view.setInt16(44+i*2,Math.round(10000*Math.sin(i/17)),true)
 return {bytes,info}
}
test('LSB embedding changes only bit zero and reports MSE/SNR',()=>{
 const {bytes,info}=fixture(2048)
 const changed=embedMessage(bytes,info,'forensics').output
 const r=comparePcm(bytes,changed,info)
 assert.ok(r.changedSamples>0);assert.equal(r.changedOtherBits,0)
 assert.ok(r.snrDb!==null && r.snrDb>40)
 assert.equal(r.mse,r.changedSamples/r.samples)
 assert.equal(r.examples.length,12)
})
test('identical audio gives zero changes and infinite PSNR represented by null',()=>{
 const {bytes,info}=fixture()
 const r=comparePcm(bytes,bytes.slice(0),info)
 assert.equal(r.changedSamples,0);assert.equal(r.mse,0);assert.equal(r.psnrDb,null)
 assert.equal(r.originalLsbOnePercent,r.modifiedLsbOnePercent)
})
test('detects changes to non-LSB sample bits',()=>{
 const {bytes,info}=fixture()
 const after=bytes.slice(0);new Uint8Array(after)[44]^=2
 const r=comparePcm(bytes,after,info)
 assert.equal(r.changedSamples,1);assert.equal(r.changedOtherBits,1)
})
test('rejects changed non-audio container bytes and differing buffers',()=>{
 const {bytes,info}=fixture()
 const after=bytes.slice(0);new Uint8Array(after)[0]^=1
 assert.throws(()=>comparePcm(bytes,after,info),/Non-audio/)
 assert.throws(()=>comparePcm(bytes,new ArrayBuffer(5),info),RangeError)
})
test('silent source with added noise does not have meaningful SNR',()=>{
 const {info}=fixture(),src=new ArrayBuffer(44+info.dataBytes)
 const after=src.slice(0);new Uint8Array(after)[44]=1
 const r=comparePcm(src,after,info)
 assert.equal(r.snrDb,null);assert.ok(r.psnrDb!==null)
})
