/** Conservative limits for the in-browser pre-alpha; not a streaming import engine. */
export const MAX_SOURCE_BYTES = 96 * 1024 * 1024
export const MAX_DECODED_PCM_BYTES = 128 * 1024 * 1024
export const MAX_STEGO_BYTES = 48 * 1024 * 1024

export function validateSourceSize(size: number): void {
  if (!Number.isSafeInteger(size) || size < 0) throw new RangeError('Invalid audio file size')
  if (size > MAX_SOURCE_BYTES)
    throw new RangeError('File exceeds the 96 MiB browser-import limit. Use a smaller recording.')
}
export function validateDecodedSize(frames: number, channels: number): void {
  if (!Number.isSafeInteger(frames) || !Number.isSafeInteger(channels) || frames < 0 || channels < 1)
    throw new RangeError('Invalid decoded audio dimensions')
  if (frames * channels * 4 > MAX_DECODED_PCM_BYTES)
    throw new RangeError('Decoded audio exceeds the 128 MiB PCM memory limit. Use a shorter recording.')
}
export function canEmbedInMemory(size: number): boolean {
  return Number.isSafeInteger(size) && size >= 0 && size <= MAX_STEGO_BYTES
}
