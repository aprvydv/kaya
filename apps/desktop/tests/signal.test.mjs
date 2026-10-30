import test from 'node:test'
import assert from 'node:assert/strict'
import { fft, waveformEnvelope, spectrogram } from '../src/signal.ts'

test('min/max envelope preserves negative and positive peaks',()=>{
  const values=Float32Array.from([-1,-0.25,0.75,0.125,-0.5,0.875])
  assert.deepEqual(waveformEnvelope(values,0,6,3),[
    {min:-1,max:-0.25},{min:0.125,max:0.75},{min:-0.5,max:0.875}
  ])
})
test('FFT impulse has flat magnitude',()=>{
  const re=new Float64Array(8),im=new Float64Array(8);re[0]=1
  fft(re,im)
  for(let i=0;i<8;i++){assert.ok(Math.abs(re[i]-1)<1e-10);assert.ok(Math.abs(im[i])<1e-10)}
})
test('FFT finds a sine wave at the correct bin',()=>{
  const n=1024,k=16,re=new Float64Array(n),im=new Float64Array(n)
  for(let i=0;i<n;i++) re[i]=Math.sin(2*Math.PI*k*i/n)
  fft(re,im)
  const amps=Array.from(re.slice(0,n/2),(x,i)=>Math.hypot(x,im[i]))
  assert.equal(amps.indexOf(Math.max(...amps)),k)
})
test('spectrogram detects a stationary tone',()=>{
  const rate=8192,n=8192,tone=1024,samples=new Float32Array(n)
  for(let i=0;i<n;i++)samples[i]=.8*Math.sin(2*Math.PI*tone*i/rate)
  const spec=spectrogram(samples,rate,1024,7168,12,1024)
  assert.equal(spec.length,12)
  for(const col of spec){
    const bins=col.bins
    const peak=bins.indexOf(Math.max(...bins))
    assert.ok(Math.abs(peak-128)<=1)
  }
})
test('invalid inputs do not produce misleading spectra',()=>{
  assert.deepEqual(spectrogram(new Float32Array(4),0,0,4),[])
  assert.deepEqual(waveformEnvelope(new Float32Array(4),2,2,10),[])
})
