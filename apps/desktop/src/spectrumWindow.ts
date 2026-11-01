import { spectrogram } from './signal.ts'

/** Copy only the viewed audio plus FFT edge context, never the entire track when zoomed. */
export function spectrumWindow(samples:Float32Array,start:number,end:number,fftSize:number) {
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end>samples.length||end<=start)
    throw new RangeError('Invalid spectrogram region')
  const padding=fftSize
  const first=Math.max(0,start-padding)
  const last=Math.min(samples.length,end+padding)
  return {data:samples.slice(first,last),start:start-first,end:end-first}
}
export function calculateWindow(data:Float32Array,rate:number,start:number,end:number,columns:number,fftSize:number) {
  return spectrogram(data,rate,start,end,columns,fftSize)
}
