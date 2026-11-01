import test from 'node:test'
import assert from 'node:assert/strict'
import {MAX_SOURCE_BYTES,MAX_DECODED_PCM_BYTES,MAX_STEGO_BYTES,validateSourceSize,validateDecodedSize,canEmbedInMemory} from '../src/memoryLimits.ts'
test('source limit permits boundary and rejects oversized files before allocation',()=>{
 assert.doesNotThrow(()=>validateSourceSize(MAX_SOURCE_BYTES))
 assert.throws(()=>validateSourceSize(MAX_SOURCE_BYTES+1),/96 MiB/)
 assert.throws(()=>validateSourceSize(-1),RangeError)
 assert.throws(()=>validateSourceSize(Number.NaN),RangeError)
})
test('decoded PCM guard considers channel count and 32-bit floating memory',()=>{
 assert.doesNotThrow(()=>validateDecodedSize(MAX_DECODED_PCM_BYTES/8,2))
 assert.throws(()=>validateDecodedSize(MAX_DECODED_PCM_BYTES/8+1,2),/128 MiB/)
 assert.throws(()=>validateDecodedSize(1,0),RangeError)
})
test('memory-heavy steganography stays disabled beyond budget',()=>{
 assert.equal(canEmbedInMemory(MAX_STEGO_BYTES),true)
 assert.equal(canEmbedInMemory(MAX_STEGO_BYTES+1),false)
 assert.equal(canEmbedInMemory(-1),false)
})
