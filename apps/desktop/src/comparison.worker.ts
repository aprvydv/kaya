import { comparePcm } from './comparison'
import type { PcmFormat } from './pcm'

type Request = { id: number; original: ArrayBuffer; modified: ArrayBuffer; info: PcmFormat }
self.onmessage = (event: MessageEvent<Request>) => {
  const { id, original, modified, info } = event.data
  try {
    const comparison = comparePcm(original, modified, info)
    self.postMessage({ id, comparison })
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : 'Comparison failed' })
  }
}
