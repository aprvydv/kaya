/** Pure audio-analysis primitives. Operates on decoded PCM, not encoded source bytes. */
export type Envelope = { min: number; max: number }
export type ChannelMode = 'left' | 'right' | 'mix'
export function channelSamples(buffer: AudioBuffer, mode: ChannelMode): Float32Array {
  const left = buffer.getChannelData(0)
  if (mode === 'left' || buffer.numberOfChannels === 1) return left
  const right = buffer.getChannelData(1)
  if (mode === 'right') return right
  const mix = new Float32Array(left.length)
  for (let i = 0; i < left.length; i++) mix[i] = (left[i] + right[i]) / 2
  return mix
}
export function waveformEnvelope(samples: Float32Array, start: number, end: number, columns: number): Envelope[] {
  if (!Number.isInteger(columns) || columns < 1 || start < 0 || end > samples.length || end <= start) return []
  const length = end - start
  const output: Envelope[] = []
  for (let x = 0; x < columns; x++) {
    const lo = Math.floor(start + x * length / columns)
    const hi = Math.min(end, Math.max(lo + 1, Math.ceil(start + (x + 1) * length / columns)))
    let min = Infinity, max = -Infinity
    for(let i=lo;i<hi;i++){ const v=samples[i]; if(v<min)min=v;if(v>max)max=v }
    output.push({ min: min === Infinity ? 0 : min, max: max === -Infinity ? 0 : max })
  }
  return output
}
/** In-place iterative Cooley–Tukey FFT (power-of-two input), real and imaginary arrays. */
export function fft(real: Float64Array, imag: Float64Array): void {
  const n=real.length
  if(n!==imag.length || n<2 || (n & (n-1))!==0) throw new Error('FFT length must be a power of two >= 2')
  for(let i=1,j=0;i<n;i++){
    let bit=n>>1
    while(j&bit){j^=bit;bit>>=1}
    j^=bit
    if(i<j){[real[i],real[j]]=[real[j],real[i]];[imag[i],imag[j]]=[imag[j],imag[i]]}
  }
  for(let len=2;len<=n;len*=2){
    const angle=-2*Math.PI/len, wr=Math.cos(angle),wi=Math.sin(angle)
    for(let i=0;i<n;i+=len){
      let r=1,im=0
      for(let j=0;j<len/2;j++){
        const a=i+j,b=a+len/2,tr=r*real[b]-im*imag[b],ti=r*imag[b]+im*real[b]
        real[b]=real[a]-tr;imag[b]=imag[a]-ti
        real[a]+=tr;imag[a]+=ti
        const nr=r*wr-im*wi;im=r*wi+im*wr;r=nr
      }
    }
  }
}
export type Spectrum = { bins: Float32Array; maxFrequency: number }
/** Log-amplitude STFT slices, normalized to dBFS-ish FFT magnitude. */
export function spectrogram(
  samples: Float32Array, sampleRate: number, start: number, end: number,
  columns=240, fftSize=1024
): Spectrum[] {
  if(sampleRate<=0 || fftSize<2 || (fftSize&(fftSize-1))!==0 || columns<1 || end<=start) return []
  const output: Spectrum[]=[]
  for(let col=0;col<columns;col++){
    const center=Math.floor(start+(col+0.5)*(end-start)/columns)
    const re=new Float64Array(fftSize), im=new Float64Array(fftSize)
    for(let i=0;i<fftSize;i++){
      const s=center-Math.floor(fftSize/2)+i
      const window=0.5-0.5*Math.cos(2*Math.PI*i/(fftSize-1))
      re[i]=(s>=0 && s<samples.length ? samples[s] : 0)*window
    }
    fft(re,im)
    const bins=new Float32Array(fftSize/2)
    for(let k=0;k<bins.length;k++){
      const amplitude=Math.hypot(re[k],im[k])*4/fftSize
      bins[k]=20*Math.log10(Math.max(amplitude,1e-8))
    }
    output.push({bins,maxFrequency:sampleRate/2})
  }
  return output
}
