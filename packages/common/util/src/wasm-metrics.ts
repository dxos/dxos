//
// Copyright 2026 DXOS.org
//

/**
 * Wasm linear memory a realm holds.
 *
 * `instances` is the integrity column, the same role `realms` plays for the SQLite VFS counters: a
 * byte count of zero is either "no wasm here" or "the probe was installed after the module was",
 * and nothing in the bytes tells the two apart.
 */
export type WasmMemoryStats = {
  bytes: number;
  instances: number;
};

/**
 * Global name the reader is published under, for a caller OUTSIDE the realm.
 *
 * The arrangement `@dxos/sql-sqlite` uses for its VFS counters, and for the same reason: the
 * memory that matters is held in the dedicated worker, where nothing in the tab can call a module
 * export. A measurement harness attached over CDP evaluates this name in each realm.
 */
export const WASM_MEMORY_GLOBAL = '__dxosWasmMemory';

// Weak, because holding a memory alive would make the probe the reason a realm never releases it.
const memories = new Set<WeakRef<WebAssembly.Memory>>();

let installed = false;

const track = (memory: WebAssembly.Memory): void => {
  memories.add(new WeakRef(memory));
};

/** Every `WebAssembly.Memory` an instance exports — where a wasm-bindgen or Emscripten build keeps it. */
const trackExports = (instance: WebAssembly.Instance): void => {
  for (const exported of Object.values(instance.exports)) {
    if (exported instanceof WebAssembly.Memory) {
      track(exported);
    }
  }
};

/**
 * Every `WebAssembly.Memory` passed IN through the import object.
 *
 * A module can take its memory rather than export it — an Emscripten build with pthreads does —
 * and that memory is never visible on `instance.exports`, so tracking exports alone would report
 * zero bytes for a module holding hundreds of megabytes.
 */
const trackImports = (imports?: WebAssembly.Imports): void => {
  for (const module of Object.values(imports ?? {})) {
    for (const imported of Object.values(module)) {
      if (imported instanceof WebAssembly.Memory) {
        track(imported);
      }
    }
  }
};

/**
 * Bytes of wasm linear memory live in this realm right now.
 *
 * `buffer.byteLength` rather than a remembered size, because `memory.grow()` replaces the buffer
 * and a wasm heap only ever grows — the number this returns is the one that never comes back down,
 * which is the whole reason it is worth a column.
 */
export const getWasmMemoryStats = (): WasmMemoryStats => {
  let bytes = 0;
  let instances = 0;
  for (const ref of memories) {
    const memory = ref.deref();
    if (memory === undefined) {
      memories.delete(ref);
      continue;
    }
    bytes += memory.buffer.byteLength;
    instances += 1;
  }
  return { bytes, instances };
};

/**
 * Starts counting wasm linear memory in this realm, and publishes the reader.
 *
 * **Call it before the realm's first wasm module loads.** It works by wrapping instantiation, so a
 * module already compiled when this runs is invisible to it — which is what `instances` exists to
 * make visible.
 *
 * Wrapping instantiation rather than reading a per-library handle, because every wasm the app
 * loads (automerge, subduction, SQLite) goes through these two functions and none of them exposes
 * its memory on a stable API. Idempotent, and the cost is one `Object.values` walk per module
 * instantiated — a few per realm, for the lifetime of the realm.
 *
 * Nothing in CDP counts this memory: `Runtime.getHeapUsage` reports the JS heap, and wasm linear
 * memory is outside it. Process RSS covers it and cannot be split by realm.
 */
export const installWasmMemoryProbe = (): void => {
  if (installed || typeof WebAssembly === 'undefined') {
    return;
  }
  installed = true;

  const originalInstantiate = WebAssembly.instantiate;
  const originalInstantiateStreaming = WebAssembly.instantiateStreaming;

  // Overloads rather than one union signature: `WebAssembly.instantiate` resolves to an `Instance`
  // for a compiled module and to `{ module, instance }` for bytes, and a caller must keep that.
  function instantiate(
    source: BufferSource,
    imports?: WebAssembly.Imports,
  ): Promise<WebAssembly.WebAssemblyInstantiatedSource>;
  function instantiate(source: WebAssembly.Module, imports?: WebAssembly.Imports): Promise<WebAssembly.Instance>;
  async function instantiate(
    source: BufferSource | WebAssembly.Module,
    imports?: WebAssembly.Imports,
  ): Promise<WebAssembly.WebAssemblyInstantiatedSource | WebAssembly.Instance> {
    trackImports(imports);
    const result =
      source instanceof WebAssembly.Module
        ? await originalInstantiate(source, imports)
        : await originalInstantiate(source, imports);
    trackExports(result instanceof WebAssembly.Instance ? result : result.instance);
    return result;
  }

  const instantiateStreaming = async (
    source: Response | PromiseLike<Response>,
    imports?: WebAssembly.Imports,
  ): Promise<WebAssembly.WebAssemblyInstantiatedSource> => {
    trackImports(imports);
    const result = await originalInstantiateStreaming(source, imports);
    trackExports(result.instance);
    return result;
  };

  // `Object.assign` because both names are properties of a namespace object, which cannot be
  // assigned through the ambient declaration.
  Object.assign(WebAssembly, { instantiate, instantiateStreaming });
  Object.assign(globalThis, { [WASM_MEMORY_GLOBAL]: getWasmMemoryStats });
};
