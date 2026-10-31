import test from 'node:test'
import assert from 'node:assert/strict'
import {createImportGeneration} from '../src/importGeneration.ts'

test('latest request wins when imports finish in reverse order',async()=>{
 const g=createImportGeneration()
 const first=g.begin(),second=g.begin()
 const results=[]
 await Promise.resolve().then(()=>{if(g.isCurrent(second))results.push('second')})
 await Promise.resolve().then(()=>{if(g.isCurrent(first))results.push('first')})
 assert.deepEqual(results,['second'])
})
test('invalidating during disposal prevents late asynchronous commits',()=>{
 const g=createImportGeneration(),request=g.begin()
 g.invalidate()
 assert.equal(g.isCurrent(request),false)
})
test('new request supersedes previous failed import',()=>{
 const g=createImportGeneration(),failed=g.begin(),latest=g.begin()
 assert.equal(g.isCurrent(failed),false)
 assert.equal(g.isCurrent(latest),true)
})
