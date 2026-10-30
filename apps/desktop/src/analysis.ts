import { fft } from './signal'

/** PCM sample statistics for a half-open region [start,end). No weighting is applied. */
export type SignalStats = {
  samples: number; peak: number; peakDbfs: number | null; rms: number;
  rmsDbfs: number | null; dcOffset: number; crestDb: number | null;
  clippedSamples: number; clipPercent: number
}
const db = (x: number): number | null => x > 0 ? 20 * Math.log10(x) : null
export function signalStats(samples: Float32Array, start = 0, end = samples.length, clipThreshold = 1): SignalStats {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end > samples.length || start >= end) {
    throw new RangeError('Select a nonempty sample region')
  }
  let peak = 0, sum = 0, power = 0, clippedSamples = 0
  for (let i = start; i < end; i++) {
    const v = samples[i]
    if (!Number.isFinite(v)) throw new Error('Nonfinite audio sample')
    peak = Math.max(peak, Math.abs(v))
    sum += v
    power += v * v
    if (Math.abs(v) >= clipThreshold) clippedSamples++
  }
  const count = end - start, rms = Math.sqrt(power / count)
  return {
    samples: count, peak, peakDbfs: db(peak), rms, rmsDbfs: db(rms),
    dcOffset: sum / count, crestDb: rms > 0 ? 20 * Math.log10(peak / rms) : null,
    clippedSamples, clipPercent: 100 * clippedSamples / count
  }
}
export type FrequencyPeak = { frequencyHz: number; magnitudeDb: number }
/** Single Hann-windowed FFT at region midpoint. Relative magnitude is not a calibrated power spectrum. */
export function dominantFrequencies(samples: Float32Array, sampleRate: number, start: number, end: number, size = 4096, limit = 5): FrequencyPeak[] {
  if (!(sampleRate > 0) || !Number.isSafeInteger(size) || size < 8 || (size & (size - 1)) !== 0 ||
      !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end > samples.length || end <= start) return []
  const real = new Float64Array(size), imag = new Float64Array(size)
  const center = Math.floor((start + end) / 2)
  let energy = 0
  for (let i = 0; i < size; i++) {
    const index = center - Math.floor(size / 2) + i
    const v = index >= start && index < end ? samples[index] : 0
    const window = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (size - 1))
    real[i] = v * window
    energy += real[i] * real[i]
  }
  if (energy === 0) return []
  fft(real, imag)
  const mags = new Float64Array(size / 2)
  for (let k = 0; k < mags.length; k++) mags[k] = Math.hypot(real[k], imag[k])
  const peaks: FrequencyPeak[] = []
  // Exclude DC and Nyquist and only report local maxima above a practical floor.
  for (let k = 1; k < mags.length - 1; k++) {
    if (mags[k] > mags[k - 1] && mags[k] >= mags[k + 1] && mags[k] > 1e-10) {
      const shiftDenom = mags[k-1] - 2*mags[k] + mags[k+1]
      const shift = shiftDenom ? Math.max(-0.5, Math.min(0.5, .5*(mags[k-1]-mags[k+1])/shiftDenom)) : 0
      peaks.push({ frequencyHz: (k+shift)*sampleRate/size, magnitudeDb: 20*Math.log10(Math.max(1e-10,2*mags[k]/size)) })
    }
  }
  return peaks.sort((a,b)=>b.magnitudeDb-a.magnitudeDb).slice(0,Math.max(0,limit))
}
