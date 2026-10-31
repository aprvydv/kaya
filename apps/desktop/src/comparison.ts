/** Exact-source 16-bit PCM comparison; descriptive metrics, not steganalysis proof. */
import type { PcmFormat } from './pcm.ts'
export type Comparison = {
 samples:number; changedSamples:number; changedPercent:number; changedOtherBits:number;
 mse:number; snrDb:number|null; psnrDb:number|null;
 originalLsbOnePercent:number; modifiedLsbOnePercent:number;
 transitions:number; examples:Array<{index:number;before:number;after:number;beforeLsb:number;afterLsb:number}>
}
export function comparePcm(original:ArrayBuffer,modified:ArrayBuffer,info:PcmFormat):Comparison {
 if(info.codec!=='PCM integer'||info.bitDepth!==16||info.dataBytes%2!==0)
   throw new Error('Comparison requires 16-bit PCM WAV')
 if(original.byteLength!==modified.byteLength||info.dataOffset<0||
    info.dataOffset+info.dataBytes>original.byteLength) throw new RangeError('Audio dimensions or length do not match')
 const a=new Uint8Array(original),b=new Uint8Array(modified)
 for(let i=0;i<a.length;i++)if((i<info.dataOffset||i>=info.dataOffset+info.dataBytes)&&a[i]!==b[i])
   throw new Error('Non-audio bytes differ')
 let changedSamples=0,changedOtherBits=0,aOnes=0,bOnes=0,transitions=0,sumSignal=0,sumError=0
 const examples:Comparison['examples']=[]
 const dvA=new DataView(original),dvB=new DataView(modified)
 const samples=info.dataBytes/2
 for(let i=0;i<samples;i++){
   const p=info.dataOffset+i*2
   const before=dvA.getInt16(p,true),after=dvB.getInt16(p,true)
   const first=a[p]&1,second=b[p]&1
   aOnes+=first;bOnes+=second
   if(i>0 && (a[p-2]&1)!==first)transitions++
   if(before!==after){
     changedSamples++
     if(((a[p]^b[p])&0xfe)!==0||a[p+1]!==b[p+1])changedOtherBits++
     if(examples.length<12)examples.push({index:i,before,after,beforeLsb:first,afterLsb:second})
   }
   sumSignal+=before*before
   const delta=before-after
   sumError+=delta*delta
 }
 const mse=samples?sumError/samples:0
 const snrDb=sumError===0?null:(sumSignal===0?null:10*Math.log10(sumSignal/sumError))
 const psnrDb=mse===0?null:10*Math.log10(32768**2/mse)
 return {samples,changedSamples,changedPercent:samples?changedSamples*100/samples:0,
 changedOtherBits,mse,snrDb,psnrDb,originalLsbOnePercent:samples?aOnes*100/samples:0,
 modifiedLsbOnePercent:samples?bOnes*100/samples:0,transitions,examples}
}
