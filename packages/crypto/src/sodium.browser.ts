import * as sodiumNs from 'libsodium-wrappers-sumo';

// The sumo build is shipped as UMD/CJS; depending on bundler interop the
// import lands as the sodium object directly OR wrapped under .default.
// Unwrap defensively so `.ready` is always reachable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sodium: any = (sodiumNs as any).default ?? sodiumNs;

let instance: typeof sodium | null = null;
let pending: Promise<typeof sodium> | null = null;

/** Browser entrypoint: native ESM import, no createRequire shim. */
export async function getSodium(): Promise<typeof sodium> {
  if (instance) return instance;
  if (!pending) {
    pending = sodium.ready.then(() => {
      instance = sodium;
      return sodium;
    });
  }
  return pending;
}
