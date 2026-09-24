//
// Copyright 2026 DXOS.org
//

/**
 * Probes installed into a measured realm, shared by the scripts that install them.
 *
 * One copy rather than one per script: these run as strings in realms reached only over
 * CDP, so a drifted copy is invisible until two instruments disagree about the same run.
 */

/**
 * Records every `WebAssembly.Memory` against the script that created it.
 *
 * Installed as a string because it runs in realms this process only reaches over
 * CDP; `document.currentScript` is unavailable in a worker, so the creating
 * module comes from the stack.
 */
export const WASM_PROBE = `(() => {
  if (globalThis.__wasmProbe) { return 'already'; }
  const entries = [];
  const origin = () => {
    const frames = (new Error().stack ?? '').split('\\n').slice(3);
    for (const frame of frames) {
      const match = frame.match(/https?:\\/\\/[^\\s)]+/);
      if (match) { return match[0].split('/').pop().split('?')[0]; }
    }
    return 'unknown';
  };
  const record = (memory, where) => {
    // Deduped by identity: a memory constructed in JS and then imported by a module
    // is seen by both hooks, and counting it twice inflates the total by its size.
    if (memory instanceof WebAssembly.Memory && !entries.some((entry) => entry.ref.deref() === memory)) {
      entries.push({ where, ref: new WeakRef(memory) });
    }
    return memory;
  };
  const Memory = WebAssembly.Memory;
  WebAssembly.Memory = new Proxy(Memory, {
    construct: (target, args) => record(Reflect.construct(target, args), origin()),
  });
  const wrapResult = (result, where) => {
    for (const value of Object.values(result?.instance?.exports ?? result?.exports ?? {})) { record(value, where); }
    return result;
  };
  for (const name of ['instantiate', 'instantiateStreaming']) {
    const original = WebAssembly[name];
    WebAssembly[name] = (...args) => {
      const where = origin();
      return original.apply(WebAssembly, args).then((result) => wrapResult(result, where));
    };
  }
  globalThis.__wasmProbe = () => {
    const byModule = {};
    for (const { where, ref } of entries) {
      const memory = ref.deref();
      if (!memory) { continue; }
      // Growable-shared memories are visible in every realm they are posted to, so
      // a per-realm sum counts one allocation once per realm without this tag.
      const shared = typeof SharedArrayBuffer !== 'undefined' && memory.buffer instanceof SharedArrayBuffer;
      const key = (shared ? 'shared:' : '') + where;
      byModule[key] = (byModule[key] ?? 0) + memory.buffer.byteLength;
    }
    return byModule;
  };
  return 'installed';
})()`;
