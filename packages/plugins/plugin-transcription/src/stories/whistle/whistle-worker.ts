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

/** Smallest batch worth a pass; anything queued while a pass runs joins the next one. */
const MIN_PASS_SAMPLES = WHISTLE_SAMPLE_RATE / 2;

/**
 * Every pass re-decodes the whole stream buffer, so pass time grows with it until it falls behind
 * real time. Ending the stream bounds the buffer: preferably once the tail is confirmed (a clean
 * break), unconditionally once it gets long.
 */
const SOFT_SEGMENT_SECONDS = 3;
const HARD_SEGMENT_SECONDS = 6;

let engine: NeedleModule | undefined;
let outPtr = 0;
let languagePtr = 0;
let keywordsPtr = 0;
let pcmPtr = 0;
let pcmCapacity = 0;

let queue: Float32Array[] = [];
let queued = 0;
let draining = false;
let stopRequested = false;

/** Seconds of audio in streams already ended, so word times stay absolute across segments. */
let segmentOffset = 0;
/** Seconds of audio in the current stream. */
let segmentReceived = 0;

const post = (message: WhistleResponse) => globalThis.postMessage(message);

const fetchWithProgress = async (url: string): Promise<ArrayBuffer> => {
  const response = await fetch(url);
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
  const source = await (await fetch(url)).text();
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

const init = async (assets: WhistleAssets, language?: string, keywords?: string[]) => {
  const started = performance.now();
  const [createNeedle, wasmBinary, model] = await Promise.all([
    loadEngineFactory(assets.engineUrl),
    fetch(assets.wasmUrl).then((response) => response.arrayBuffer()),
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
  keywordsPtr = writeString(module, keywords?.join('\n'));
  engine = module;
  post({ type: 'ready', loadMs: performance.now() - started });
};

const takeQueued = (): Float32Array => {
  const samples = new Float32Array(queued);
  let offset = 0;
  for (const chunk of queue) {
    samples.set(chunk, offset);
    offset += chunk.length;
  }
  queue = [];
  queued = 0;
  return samples;
};

const parseOutput = (module: NeedleModule): StreamOutput => JSON.parse(readString(module, outPtr));

type PassResult = Omit<Extract<WhistleResponse, { type: 'result' }>, 'type' | 'backlog'>;

const offsetWords = (words: WhistleWord[] = []): WhistleWord[] =>
  words.map((word) => ({ ...word, start: word.start + segmentOffset, end: word.end + segmentOffset }));

/** Ends the current stream; its unconfirmed tail becomes committed words. */
const endSegment = (module: NeedleModule): WhistleWord[] => {
  module._needle_stream_transcribe_stop(outPtr, OUT_CAPACITY);
  const words = offsetWords(parseOutput(module).words);
  segmentOffset += segmentReceived;
  segmentReceived = 0;
  return words;
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
  const words = offsetWords(output.words);
  const received = segmentOffset + (output.received ?? 0);
  let pending = output.pending ?? '';
  segmentReceived = output.received ?? 0;
  if (segmentReceived >= HARD_SEGMENT_SECONDS || (segmentReceived >= SOFT_SEGMENT_SECONDS && pending.trim() === '')) {
    words.push(...endSegment(module));
    pending = '';
  }

  return { words, pending, passMs: performance.now() - started, received };
};

/** Lets queued `audio` messages land between passes; the WASM call itself blocks the event loop. */
const yieldToMessages = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const drain = async () => {
  if (draining || !engine) {
    return;
  }
  draining = true;
  try {
    while (engine && (queued >= MIN_PASS_SAMPLES || (stopRequested && queued > 0))) {
      const result = runPass(engine, takeQueued());
      // Posted after the yield so the backlog counts the audio that arrived during the pass.
      await yieldToMessages();
      post({ type: 'result', ...result, backlog: queued / WHISTLE_SAMPLE_RATE });
    }
    if (engine && stopRequested) {
      stopRequested = false;
      const received = segmentOffset + segmentReceived;
      const words = endSegment(engine);
      segmentOffset = 0;
      post({ type: 'result', words, pending: '', passMs: 0, received, backlog: 0 });
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
      init(request.assets, request.language, request.keywords).catch((err) =>
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
    case 'stop': {
      stopRequested = true;
      void drain();
      break;
    }
  }
});
