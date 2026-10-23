//
// Copyright 2026 DXOS.org
//

import {
  WHISTLE_SAMPLE_RATE,
  type WhistleAssets,
  type WhistleRequest,
  type WhistleResponse,
  type WhistleWord,
} from './protocol.ts';

/**
 * Runs the Whistle speech model (Cactus `needle` engine, Emscripten build) off the main thread: a
 * single pass blocks for hundreds of milliseconds, which would otherwise stall rendering.
 */

/** The subset of the Emscripten module `needle.js` exposes that this worker calls (see `needle.h`). */
type NeedleModule = {
  HEAPU8: Uint8Array;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  _needle_load: (cact: number, size: bigint) => number;
  _needle_last_error: () => number;
  _needle_stream_transcribe_process: (
    pcm: number,
    samples: number,
    language: number,
    keywords: number,
    out: number,
    outCapacity: number,
  ) => number;
  _needle_stream_transcribe_stop: (out: number, outCapacity: number) => number;
};

type CreateNeedle = (options: { wasmBinary: ArrayBuffer }) => Promise<NeedleModule>;

type StreamOutput = {
  text: string;
  words?: WhistleWord[];
  pending?: string;
  received?: number;
};

const OUT_CAPACITY = 64 * 1024;

/**
 * Default smallest batch of new audio worth a pass, as in Cactus's own live demo; anything queued while a
 * pass runs joins the next one. A word commits after two agreeing passes, so this sets the commit floor
 * (≈2×), and passes closer together see nearly the same audio and agree on half-heard words.
 */
const DEFAULT_MIN_PASS_MS = 1_000;

let engine: NeedleModule | undefined;
let minPassSamples = (WHISTLE_SAMPLE_RATE * DEFAULT_MIN_PASS_MS) / 1_000;
let outPtr = 0;
let languagePtr = 0;
let keywordsPtr = 0;
/** Newline-separated bias terms, kept until the engine is loaded to write them into its heap. */
let keywordsText = '';
let pcmPtr = 0;
let pcmCapacity = 0;

/** Audio in arrival order, with a marker where the caller ended the stream. */
let queue: Array<Float32Array | 'stop'> = [];
let queued = 0;
let draining = false;

/** Seconds of audio in the current stream. */
let streamReceived = 0;

const post = (message: WhistleResponse) => globalThis.postMessage(message);

/** Cache Storage bucket for the engine and model; bump the version to drop old entries. */
const ASSET_CACHE = 'whistle-assets-v1';

/**
 * Fetches an asset through Cache Storage. Hugging Face redirects to a signed CDN URL behind a `no-store`
 * redirect, so the HTTP cache never hits; the asset URLs pin a revision, so a cached copy never goes stale.
 */
const fetchCached = async (url: string): Promise<Response> => {
  const cache = globalThis.caches ? await globalThis.caches.open(ASSET_CACHE).catch(() => undefined) : undefined;
  const cached = await cache?.match(url);
  if (cached) {
    return cached;
  }
  const response = await fetch(url);
  if (response.ok && cache) {
    await cache.put(url, response.clone()).catch(() => undefined);
  }
  return response;
};

const fetchWithProgress = async (url: string): Promise<ArrayBuffer> => {
  const response = await fetchCached(url);
  if (!response.ok || !response.body) {
    throw new Error(`${response.status} fetching ${url}`);
  }
  const total = Number(response.headers.get('content-length') ?? 0);
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    parts.push(value);
    loaded += value.length;
    post({ type: 'progress', loaded, total });
  }
  const buffer = new Uint8Array(loaded);
  let offset = 0;
  for (const part of parts) {
    buffer.set(part, offset);
    offset += part.length;
  }
  return buffer.buffer;
};

/**
 * `needle.js` is a classic UMD script, which a module worker cannot `importScripts`; appending an
 * export and importing it as a blob module evaluates it unchanged.
 */
const loadEngineFactory = async (url: string): Promise<CreateNeedle> => {
  const source = await (await fetchCached(url)).text();
  const blobUrl = URL.createObjectURL(
    new Blob([source, '\nexport default createNeedle;\n'], { type: 'text/javascript' }),
  );
  try {
    const module: { default: CreateNeedle } = await import(/* @vite-ignore */ blobUrl);
    return module.default;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
};

const writeString = (module: NeedleModule, value: string | undefined): number => {
  if (!value) {
    return 0;
  }
  const bytes = new TextEncoder().encode(value);
  const ptr = module._malloc(bytes.length + 1);
  module.HEAPU8.set(bytes, ptr);
  module.HEAPU8[ptr + bytes.length] = 0;
  return ptr;
};

const readString = (module: NeedleModule, ptr: number): string => {
  const heap = module.HEAPU8;
  const end = heap.indexOf(0, ptr);
  return new TextDecoder().decode(heap.subarray(ptr, end));
};

const init = async (assets: WhistleAssets, language?: string) => {
  const started = performance.now();
  const [createNeedle, wasmBinary, model] = await Promise.all([
    loadEngineFactory(assets.engineUrl),
    fetchCached(assets.wasmUrl).then((response) => response.arrayBuffer()),
    fetchWithProgress(assets.modelUrl),
  ]);

  const module = await createNeedle({ wasmBinary });
  // The engine reads the container in place, so the copy stays allocated for the worker's lifetime.
  const modelPtr = module._malloc(model.byteLength);
  module.HEAPU8.set(new Uint8Array(model), modelPtr);
  if (module._needle_load(modelPtr, BigInt(model.byteLength)) < 0) {
    throw new Error(`needle_load failed: ${readString(module, module._needle_last_error())}`);
  }

  outPtr = module._malloc(OUT_CAPACITY);
  languagePtr = writeString(module, language);
  keywordsPtr = writeString(module, keywordsText);
  engine = module;
  post({ type: 'ready', loadMs: performance.now() - started });
};

/** Takes the audio up to the next marker, and the marker itself. */
const takeQueued = (): { samples: Float32Array; stop: boolean } => {
  const end = queue.findIndex((item) => typeof item === 'string');
  const chunks = (end < 0 ? queue : queue.slice(0, end)).filter(
    (item): item is Float32Array => typeof item !== 'string',
  );
  const marker = end < 0 ? undefined : queue[end];
  queue = end < 0 ? [] : queue.slice(end + 1);

  const samples = new Float32Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    samples.set(chunk, offset);
    offset += chunk.length;
  }
  queued -= samples.length;
  return { samples, stop: marker === 'stop' };
};

const hasWork = () => queued >= minPassSamples || queue.some((item) => typeof item === 'string');

const parseOutput = (module: NeedleModule): StreamOutput => JSON.parse(readString(module, outPtr));

type PassResult = Omit<Extract<WhistleResponse, { type: 'result' }>, 'type' | 'backlog' | 'ended'>;

/** Ends the stream; its unconfirmed tail becomes committed words. */
const endStream = (module: NeedleModule): WhistleWord[] => {
  if (streamReceived === 0) {
    return [];
  }
  module._needle_stream_transcribe_stop(outPtr, OUT_CAPACITY);
  streamReceived = 0;
  return parseOutput(module).words ?? [];
};

const runPass = (module: NeedleModule, samples: Float32Array): PassResult => {
  if (samples.length > pcmCapacity) {
    if (pcmPtr) {
      module._free(pcmPtr);
    }
    pcmCapacity = samples.length;
    pcmPtr = module._malloc(pcmCapacity * Float32Array.BYTES_PER_ELEMENT);
  }
  new Float32Array(module.HEAPU8.buffer, pcmPtr, samples.length).set(samples);

  const started = performance.now();
  module._needle_stream_transcribe_process(pcmPtr, samples.length, languagePtr, keywordsPtr, outPtr, OUT_CAPACITY);
  const output = parseOutput(module);
  streamReceived = output.received ?? 0;
  return {
    words: output.words ?? [],
    pending: output.pending ?? '',
    passMs: performance.now() - started,
    received: streamReceived,
  };
};

/** Lets queued `audio` messages land between passes; the WASM call itself blocks the event loop. */
const yieldToMessages = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const drain = async () => {
  if (draining || !engine) {
    return;
  }
  draining = true;
  try {
    while (engine && hasWork()) {
      const { samples, stop } = takeQueued();
      const result: PassResult =
        samples.length > 0 ? runPass(engine, samples) : { words: [], pending: '', passMs: 0, received: streamReceived };
      if (stop) {
        result.words.push(...endStream(engine));
        result.pending = '';
      }
      // Posted after the yield so the backlog counts the audio that arrived during the pass.
      await yieldToMessages();
      post({ type: 'result', ...result, backlog: queued / WHISTLE_SAMPLE_RATE, ended: stop });
    }
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  } finally {
    draining = false;
  }
};

globalThis.addEventListener('message', (event: MessageEvent<WhistleRequest>) => {
  const request = event.data;
  switch (request.type) {
    case 'init': {
      init(request.assets, request.language).catch((err) =>
        post({ type: 'error', message: err instanceof Error ? err.message : String(err) }),
      );
      break;
    }
    case 'audio': {
      queue.push(request.samples);
      queued += request.samples.length;
      void drain();
      break;
    }
    case 'config': {
      if (request.minPassMs !== undefined) {
        minPassSamples = Math.round((WHISTLE_SAMPLE_RATE * request.minPassMs) / 1_000);
      }
      if (request.keywords) {
        keywordsText = request.keywords.join('\n');
        if (engine) {
          if (keywordsPtr) {
            engine._free(keywordsPtr);
          }
          keywordsPtr = writeString(engine, keywordsText);
        }
      }
      void drain();
      break;
    }
    case 'stop': {
      queue.push(request.type);
      void drain();
      break;
    }
  }
});
