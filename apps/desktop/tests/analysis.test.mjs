import test from 'node:test'
import assert from 'node:assert/strict'
import { signalStats, dominantFrequencies } from '../src/analysis.ts'

test('silent PCM has zero metrics without NaN', () => {
  const s=signalStats(new Float32Array(256))
  assert.equal(s.peak,0);assert.equal(s.rms,0)
  assert.equal(s.peakDbfs,null);assert.equal(s.crestDb,null)
  assert.equal(s.clippedSamples,0)
})
test('known RMS and crest factor', () => {
  const s=signalStats(new Float32Array([1,-1,0,0]))
  assert.equal(s.peak,1)
  assert.ok(Math.abs(s.rms-Math.sqrt(0.5))<1e-9)
  assert.ok(Math.abs(s.crestDb-3.0102999566)<1e-6)
  assert.equal(s.clippedSamples,2)
  assert.equal(s.clipPercent,50)
})
test('region boundaries isolate the selected samples', () => {
  const s=signalStats(new Float32Array([1,0.25,-0.25,-1]),1,3)
  assert.equal(s.samples,2);assert.equal(s.peak,.25);assert.equal(s.dcOffset,0);assert.equal(s.clippedSamples,0)
})
test('invalid ranges are rejected', () => {
  assert.throws(()=>signalStats(new Float32Array(4),4,4),RangeError)
  assert.throws(()=>signalStats(new Float32Array(4),-1,2),RangeError)
})
test('4096-sample frequency analysis locates 440 Hz tone', () => {
  const n=8192, rate=8192, data=new Float32Array(n)
  for(let i=0;i<n;i++)data[i]=Math.sin(2*Math.PI*440*i/rate)
  const peaks=dominantFrequencies(data,rate,0,n,4096)
  assert.ok(peaks.length>0)
  assert.ok(Math.abs(peaks[0].frequencyHz-440)<2)
})
test('silence produces no spurious dominant peaks', () => {
  assert.deepEqual(dominantFrequencies(new Float32Array(8192),8192,0,8192),[])
})
