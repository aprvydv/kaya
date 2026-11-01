import test from 'node:test'
import assert from 'node:assert/strict'
import {spectrogram} from '../src/signal.ts'
import {spectrumWindow,calculateWindow} from '../src/spectrumWindow.ts'

test('cropped spectrogram matches full source on zoomed windows',()=>{
 const samples=new Float32Array(10000)
 for(let i=0;i<samples.length;i++)samples[i]=Math.sin(i*.14)*.4+Math.sin(i*.35)*.12
 for(const [start,end] of [[0,3000],[2511,6200],[8900,10000]]){
  for(const fftSize of [512,1024,2048]){
   const window=spectrumWindow(samples,start,end,fftSize)
   const expected=spectrogram(samples,48000,start,end,19,fftSize)
   const actual=calculateWindow(window.data,48000,window.start,window.end,19,fftSize)
   assert.equal(actual.length,expected.length)
   for(let x=0;x<actual.length;x++)
    for(let k=0;k<actual[x].bins.length;k++)
     assert.ok(Math.abs(actual[x].bins[k]-expected[x].bins[k])<1e-4,
       `bin mismatch at ${start}/${end}, fft ${fftSize}, column ${x}, bin ${k}`)
  }
 }
})
test('window is copied and original samples remain untouched',()=>{
 const samples=Float32Array.from({length:1000},(_,i)=>i)
 const window=spectrumWindow(samples,300,600,128)
 window.data[300-window.start]=0
 assert.equal(samples[300],300)
})
test('rejects empty and out of bounds regions',()=>{
 const samples=new Float32Array(100)
 assert.throws(()=>spectrumWindow(samples,5,5,512),RangeError)
 assert.throws(()=>spectrumWindow(samples,-1,30,512),RangeError)
 assert.throws(()=>spectrumWindow(samples,1,101,512),RangeError)
})
