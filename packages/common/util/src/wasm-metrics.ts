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
  /**
   * The subset of `bytes` backed by a `SharedArrayBuffer`.
   *
   * A growable shared memory is visible in every realm it is posted to, so summing `bytes` across
   * realms counts one allocation once per realm. Reported separately so a cross-realm total can
   * subtract it rather than silently inflating.
   */
  sharedBytes: number;
  instances: number;
  /**
   * Bytes per creating script, for the NDJSON row only.
   *
   * Deliberately not a PostHog property: a module-keyed column mints a new permanent series on
   * every bundle rename, which is the mistake `REALM_SUFFIX` exists to avoid.
   */
  byModule: Record<string, number>;
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
const memories = new Set<{ where: string; ref: WeakRef<WebAssembly.Memory> }>();

let installed = false;

/**
 * The script that created a memory, taken from the stack.
 *
 * `document.currentScript` is unavailable in a worker, which is the realm that matters here, so
 * the creating module is read off the first frame carrying a URL.
 */
const origin = (): string => {
  const located = (new Error().stack ?? '')
    .split('\n')
    .map((frame) => frame.match(/https?:\/\/[^\s)]+/)?.[0])
    .filter((url): url is string => url !== undefined)
    .map((url) => url.split('?')[0]);
  // The first located frame is this module's own, whatever bundle it was inlined into, so the
  // caller is the first frame from a DIFFERENT file — a fixed frame count gets this wrong as soon
  // as the probe is bundled with the code it measures.
  const strip = (url: string) => url.replace(/:\d+:\d+$/, '');
  const own = located[0] === undefined ? undefined : strip(located[0]);
  const caller = located.find((url) => strip(url) !== own) ?? located[0];
  if (caller === undefined) {
    return 'unknown';
  }
  // The last non-empty path segment, so an inline module script in the document itself lands under
  // the document rather than under the empty string a trailing slash leaves behind.
  return strip(caller).split('/').filter(Boolean).pop() ?? 'document';
};

/** The `.wasm` file's own name, or `undefined` for a module with no URL behind it. */
const moduleName = (url: string | undefined): string | undefined => {
  const file = url?.split('?')[0].split('/').filter(Boolean).pop();
  return file?.endsWith('.wasm') ? file : undefined;
};

/**
 * Records a memory once, whatever route reached it.
 *
 * Deduped by identity rather than by insertion: a memory constructed in JS and then passed into a
 * module's imports is seen by two hooks, and counting it twice inflates the realm by its size.
 */
const track = (memory: WebAssembly.Memory, where: string): void => {
  for (const entry of memories) {
    if (entry.ref.deref() === memory) {
      return;
    }
  }
  memories.add({ where, ref: new WeakRef(memory) });
};

/** Every `WebAssembly.Memory` an instance exports — where a wasm-bindgen or Emscripten build keeps it. */
const trackExports = (instance: WebAssembly.Instance, where: string): void => {
  for (const exported of Object.values(instance.exports)) {
    if (exported instanceof WebAssembly.Memory) {
      track(exported, where);
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
const trackImports = (imports: WebAssembly.Imports | undefined, where: string): void => {
  for (const module of Object.values(imports ?? {})) {
    for (const imported of Object.values(module)) {
      if (imported instanceof WebAssembly.Memory) {
        track(imported, where);
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
  let sharedBytes = 0;
  let instances = 0;
  const byModule: Record<string, number> = {};
  for (const entry of memories) {
    const memory = entry.ref.deref();
    if (memory === undefined) {
      memories.delete(entry);
      continue;
    }
    const size = memory.buffer.byteLength;
    bytes += size;
    instances += 1;
    byModule[entry.where] = (byModule[entry.where] ?? 0) + size;
    if (typeof SharedArrayBuffer !== 'undefined' && memory.buffer instanceof SharedArrayBuffer) {
      sharedBytes += size;
    }
  }
  return { bytes, sharedBytes, instances, byModule };
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
    const where = origin();
    trackImports(imports, where);
    const result =
      source instanceof WebAssembly.Module
        ? await originalInstantiate(source, imports)
        : await originalInstantiate(source, imports);
    trackExports(result instanceof WebAssembly.Instance ? result : result.instance, where);
    return result;
  }

  const instantiateStreaming = async (
    source: Response | PromiseLike<Response>,
    imports?: WebAssembly.Imports,
  ): Promise<WebAssembly.WebAssemblyInstantiatedSource> => {
    const resolved = await source;
    // The module's own URL in preference to the creating script, because it is the only stable
    // identity available: a chunk name carries a content hash and changes on every build, while
    // `automerge_wasm_bg.wasm` names the library. `origin()` remains the fallback for a module
    // instantiated from bytes, which carries no URL at all.
    const where = moduleName(resolved?.url) ?? origin();
    trackImports(imports, where);
    const result = await originalInstantiateStreaming(resolved, imports);
    trackExports(result.instance, where);
    return result;
  };

  // The constructor too, because a memory built in JS and handed to a module through its imports
  // is the one route neither instantiation hook sees on its own — an Emscripten pthreads build
  // does exactly that, and its memory is never on `instance.exports`.
  const memory = new Proxy(WebAssembly.Memory, {
    // `newTarget` forwarded, so a class extending `WebAssembly.Memory` is constructed against its
    // own prototype rather than the base one.
    construct: (target, args: [WebAssembly.MemoryDescriptor], newTarget) => {
      const constructed = Reflect.construct(target, args, newTarget);
      track(constructed, origin());
      return constructed;
    },
  });

  // `Object.assign` because both names are properties of a namespace object, which cannot be
  // assigned through the ambient declaration.
  Object.assign(WebAssembly, { instantiate, instantiateStreaming, Memory: memory });
  Object.assign(globalThis, { [WASM_MEMORY_GLOBAL]: getWasmMemoryStats });
};
