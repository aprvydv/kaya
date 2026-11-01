import { calculateWindow } from './spectrumWindow'
type Job={data:Float32Array;rate:number;start:number;end:number;columns:number;fftSize:number}
self.onmessage=(event:MessageEvent<Job>)=>{
  try{
    const {data,rate,start,end,columns,fftSize}=event.data
    const slices=calculateWindow(data,rate,start,end,columns,fftSize)
    const bins=slices.map(slice=>slice.bins)
    self.postMessage({bins},{transfer:bins.map(x=>x.buffer as ArrayBuffer)})
  }catch(e){
    self.postMessage({error:e instanceof Error?e.message:'Spectrogram analysis failed'})
  }
}
