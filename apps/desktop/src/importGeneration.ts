/** Monotonic session guard: outdated asynchronous imports must never commit results. */
export function createImportGeneration() {
  let current = 0
  return {
    begin(): number { return ++current },
    isCurrent(token: number): boolean { return token === current },
    invalidate(): void { current++ }
  }
}
