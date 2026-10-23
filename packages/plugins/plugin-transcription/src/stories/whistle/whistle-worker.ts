//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

import { Endpointer } from './endpoint.ts';
import {
  type AssistantConfig,
  type NeedleAnswer,
  WHISTLE_SAMPLE_RATE,
  type WhistleAssets,
  type WhistleRequest,
  type WhistleResponse,
  type WhistleWord,
} from './protocol.ts';

/**
 * Runs the Whistle speech model (Cactus `needle` engine, Emscripten build) off the main thread: a
 * single pass blocks for hundreds of milliseconds, which would otherwise stall rendering. With an
 * assistant, Needle 3 is loaded into the same engine and answers each ended stream against its tools.
 */

/** The subset of the Emscripten module `needle.js` exposes that this worker calls (see `needle.h`). */
type NeedleModule = {
  HEAPU8: Uint8Array;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  _needle_load: (cact: number, size: bigint) => number;
  _needle_last_error: () => number;
  _needle_init: (systemPrompt: number, toolsJson: number, toolIndexPath: number) => number;
  _needle_reset: () => void;
  _needle_complete: (
    input: number,
    pcm: number,
    samples: number,
    maxNewTokens: number,
    out: number,
    outCapacity: number,
  ) => number;
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

/**
 * Default answer budget. The model writes a short derivation before its calls; a budget too small for it
 * skips the derivation (≈0.5 s sooner), but then only the first of several requested calls survives.
 */
const DEFAULT_MAX_TOKENS = 128;

/** Requests that ask for several things, which need the full budget whatever the setting. */
const COMPOUND_REQUEST = /\b(and|then|also)\b/i;

let engine: NeedleModule | undefined;
/** The engine failed to load; audio is no longer queued. */
let failed = false;
let assistantReady = false;
let maxTokens = DEFAULT_MAX_TOKENS;
let minPassSamples = (WHISTLE_SAMPLE_RATE * DEFAULT_MIN_PASS_MS) / 1_000;
let outPtr = 0;
let languagePtr = 0;
let keywordsPtr = 0;
/** Newline-separated bias terms, kept until the engine is loaded to write them into its heap. */
let keywordsText = '';
let pcmPtr = 0;
let pcmCapacity = 0;

/** Where a stream ends, when (worker time) it was found to end, and the silence the audio ended in then. */
type StreamEnd = { endedAt: number; silentSeconds: number };

/** Audio left out before a stream opened, so word times still count it. */
type Skipped = { skipped: number };

type QueueItem = Float32Array | StreamEnd | Skipped;

/** Audio kept from before a stream opens, so the first word is heard from its onset. */
const PRE_ROLL_SECONDS = 0.5;

/**
 * Once the stream's last pass has heard this much silence, passes wait for sound or the stream's end: more
 * passes on silence change nothing, and one in progress when the request ends would delay its answer.
 */
const HOLD_SECONDS = 0.15;

/** Audio in arrival order, with a marker wherever a stream ends. */
let queue: QueueItem[] = [];
let queued = 0;
let draining = false;

/** Ends streams at pauses (hands-free), when configured. */
let endpointer: Endpointer | undefined;

/**
 * With an endpointer, a stream opens only once it hears sound: Whistle invents words in silence and room
 * tone ("Thank you."), so audio before that is held here (the latest `PRE_ROLL_SECONDS`) instead of decoded.
 */
let streamOpen = false;
let preRoll: Float32Array[] = [];

/** Seconds of audio in the current stream. */
let streamReceived = 0;

/** Seconds into the recording: where this worker's audio starts, and where the current stream started. */
let offset = 0;
let streamStart = 0;
/** Samples taken into passes since the worker started. */
let consumed = 0;
/** Words the current stream has committed, and its latest unconfirmed tail, for the assistant. */
let streamWords: string[] = [];
let lastPending = '';

const post = (message: WhistleResponse) => globalThis.postMessage(message);

/** Cache Storage bucket for the engine and model; bump the version to drop old entries. */
const ASSET_CACHE = 'whistle-assets-v1';

/**
 * Fetches an asset through Cache Storage. Hugging Face redirects to a signed CDN URL behind a `no-store`
 * redirect, so the HTTP cache never hits; the asset URLs pin a revision, so a cached copy never goes stale.
 */
const fetchCached = async (url: string): Promise<Response> => {
  // Without Cache Storage the asset is fetched every time, which is slower but not an error.
  const cache = globalThis.caches
    ? await globalThis.caches.open(ASSET_CACHE).catch((err: unknown) => {
        log.warn('whistle cache unavailable', { err });
        return undefined;
      })
    : undefined;
  const cached = await cache?.match(url);
  if (cached) {
    return cached;
  }
  const response = await fetch(url);
  if (response.ok && cache) {
    await cache
      .put(url, response.clone())
      .catch((err: unknown) => log.warn('whistle cache write failed', { url, err }));
  }
  return response;
};

/** Bytes loaded and expected per downloading asset, so concurrent downloads report one progress. */
const downloads = new Map<string, { loaded: number; total: number }>();

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
    downloads.set(url, { loaded, total });
    const sum = [...downloads.values()].reduce(
      (acc, entry) => ({ loaded: acc.loaded + entry.loaded, total: acc.total + entry.total }),
      { loaded: 0, total: 0 },
    );
    post({ type: 'progress', ...sum });
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

const loadModel = (module: NeedleModule, model: ArrayBuffer) => {
  // The engine reads the container in place, so the copy stays allocated for the worker's lifetime.
  const modelPtr = module._malloc(model.byteLength);
  module.HEAPU8.set(new Uint8Array(model), modelPtr);
  if (module._needle_load(modelPtr, BigInt(model.byteLength)) < 0) {
    throw new Error(`needle_load failed: ${readString(module, module._needle_last_error())}`);
  }
};

const init = async (assets: WhistleAssets, language?: string, assistant?: AssistantConfig) => {
  const started = performance.now();
  const [createNeedle, wasmBinary, model, needleModel] = await Promise.all([
    loadEngineFactory(assets.engineUrl),
    fetchCached(assets.wasmUrl).then((response) => response.arrayBuffer()),
    fetchWithProgress(assets.modelUrl),
    assistant ? fetchWithProgress(assistant.modelUrl) : undefined,
  ]);

  const module = await createNeedle({ wasmBinary });
  loadModel(module, model);
  outPtr = module._malloc(OUT_CAPACITY);
  languagePtr = writeString(module, language);
  keywordsPtr = writeString(module, keywordsText);

  if (assistant && needleModel) {
    loadModel(module, needleModel);
    post({ type: 'preparing' });
    // Tokenizes the system facts and tool schemas once; every answer starts from this prefix.
    const systemPtr = writeString(module, assistant.system);
    const toolsPtr = writeString(module, JSON.stringify(assistant.tools));
    const prefix = module._needle_init(systemPtr, toolsPtr, 0);
    module._free(systemPtr);
    module._free(toolsPtr);
    if (prefix < 0) {
      throw new Error(`needle_init failed: ${readString(module, module._needle_last_error())}`);
    }
    assistantReady = true;
  }

  engine = module;
  post({ type: 'ready', loadMs: performance.now() - started });
};

const isAudio = (item: QueueItem): item is Float32Array => item instanceof Float32Array;

const isEnd = (item: QueueItem): item is StreamEnd => 'endedAt' in item;

/** Takes the audio up to the next marker, and the marker itself; skipped audio is counted as consumed. */
const takeQueued = (): { samples: Float32Array; end?: StreamEnd } => {
  const index = queue.findIndex(isEnd);
  const taken = index < 0 ? queue : queue.slice(0, index);
  const chunks = taken.filter(isAudio);
  for (const item of taken) {
    if (!isAudio(item) && !isEnd(item)) {
      consumed += item.skipped;
    }
  }
  const marker = index < 0 ? undefined : queue[index];
  queue = index < 0 ? [] : queue.slice(index + 1);

  const samples = new Float32Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    samples.set(chunk, offset);
    offset += chunk.length;
  }
  queued -= samples.length;
  return { samples, end: marker && isEnd(marker) ? marker : undefined };
};

/** All queued audio is silence that a pass has already heard enough of. */
const holding = () =>
  endpointer !== undefined && endpointer.silentSeconds >= queued / WHISTLE_SAMPLE_RATE + HOLD_SECONDS;

const hasWork = () => queue.some(isEnd) || (queued >= minPassSamples && !holding());

const enqueue = (samples: Float32Array) => {
  queue.push(samples);
  queued += samples.length;
};

/** Feeds arriving audio through the endpointer: held until the stream hears sound, ended at a pause. */
const receive = (samples: Float32Array) => {
  if (!endpointer) {
    enqueue(samples);
    return;
  }
  const silentSeconds = endpointer.silentSeconds;
  const endpoint = endpointer.push(samples);
  if (streamOpen) {
    enqueue(samples);
  } else if (endpointer.heard || endpoint === 'request') {
    streamOpen = true;
    preRoll.forEach(enqueue);
    preRoll = [];
    enqueue(samples);
  } else {
    preRoll.push(samples);
    let held = preRoll.reduce((total, chunk) => total + chunk.length, 0);
    let skipped = 0;
    while (held - preRoll[0].length >= PRE_ROLL_SECONDS * WHISTLE_SAMPLE_RATE) {
      const [first] = preRoll.splice(0, 1);
      held -= first.length;
      skipped += first.length;
    }
    if (skipped > 0) {
      queue.push({ skipped });
    }
  }
  if (endpoint === 'request' && streamOpen) {
    // The marker goes exactly where the pause ends, however far passes have fallen behind the audio; the
    // endpointer restarts there, so the silence before it is what the marker records.
    queue.push({ endedAt: performance.now(), silentSeconds: silentSeconds + samples.length / WHISTLE_SAMPLE_RATE });
    streamOpen = false;
  }
};

const parseOutput = (module: NeedleModule): StreamOutput => JSON.parse(readString(module, outPtr));

type PassResult = Omit<Extract<WhistleResponse, { type: 'result' }>, 'type' | 'backlog' | 'ended'>;

/** Moves word times from the stream's clock to the recording's. */
const toRecording = (words: WhistleWord[] = []): WhistleWord[] =>
  words.map((word) => ({ ...word, start: word.start + streamStart, end: word.end + streamStart }));

/** Ends the stream; its unconfirmed tail becomes committed words. */
const endStream = (module: NeedleModule): WhistleWord[] => {
  streamWords = [];
  lastPending = '';
  if (streamReceived === 0) {
    return [];
  }
  module._needle_stream_transcribe_stop(outPtr, OUT_CAPACITY);
  streamReceived = 0;
  return toRecording(parseOutput(module).words);
};

/** Answers one request against the assistant's tools; each request starts from the tools alone. */
const answer = (module: NeedleModule, text: string, endedAt: number) => {
  const budget = COMPOUND_REQUEST.test(text) ? Math.max(maxTokens, DEFAULT_MAX_TOKENS) : maxTokens;
  const inputPtr = writeString(module, text);
  const started = performance.now();
  module._needle_reset();
  const status = module._needle_complete(inputPtr, 0, 0, budget, outPtr, OUT_CAPACITY);
  const answerMs = performance.now() - started;
  module._free(inputPtr);
  if (status < 0) {
    throw new Error(`needle_complete failed: ${readString(module, module._needle_last_error())}`);
  }
  const output: Partial<NeedleAnswer> = JSON.parse(readString(module, outPtr));
  post({
    type: 'answer',
    text,
    answer: {
      function_calls: output.function_calls ?? [],
      suppressed_calls: output.suppressed_calls ?? [],
      reasoning: output.reasoning ?? null,
      confidence: output.confidence ?? null,
    },
    answerMs,
    latencyMs: performance.now() - endedAt,
    maxTokens: budget,
  });
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

  if (streamReceived === 0) {
    streamStart = offset + consumed / WHISTLE_SAMPLE_RATE;
  }
  consumed += samples.length;
  const started = performance.now();
  module._needle_stream_transcribe_process(pcmPtr, samples.length, languagePtr, keywordsPtr, outPtr, OUT_CAPACITY);
  const output = parseOutput(module);
  streamReceived = output.received ?? 0;
  const words = toRecording(output.words);
  streamWords.push(...words.map(({ word }) => word));
  lastPending = output.pending ?? '';
  return {
    words,
    pending: output.pending ?? '',
    passMs: performance.now() - started,
    received: streamStart + streamReceived,
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
      const { samples, end } = takeQueued();
      const stop = end !== undefined;
      // Silence after a pass that already heard enough of it is skipped, so the request is answered at once.
      const silent = stop && samples.length / WHISTLE_SAMPLE_RATE + HOLD_SECONDS <= end.silentSeconds;
      if (silent) {
        consumed += samples.length;
      }
      const result: PassResult =
        samples.length > 0 && !silent
          ? runPass(engine, samples)
          : { words: [], pending: lastPending, passMs: 0, received: streamStart + streamReceived };
      if (stop) {
        // The latest pass already heard everything, so the request is answered before the closing pass.
        const text = [...streamWords, result.pending.trim()].join(' ').trim();
        if (assistantReady && text) {
          answer(engine, text, end.endedAt);
        }
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
      offset = request.offset ?? 0;
      init(request.assets, request.language, request.assistant).catch((err) => {
        failed = true;
        queue = [];
        queued = 0;
        post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
      });
      break;
    }
    case 'audio': {
      // Audio waits in the queue only until the next pass; with no engine coming it would grow without bound.
      if (failed) {
        break;
      }
      receive(request.samples);
      void drain();
      break;
    }
    case 'config': {
      if (request.endpoint !== undefined) {
        endpointer = request.endpoint ? new Endpointer(request.endpoint.pauseSeconds) : undefined;
        streamOpen = !endpointer;
      }
      if (request.maxTokens !== undefined) {
        maxTokens = request.maxTokens;
      }
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
      // Audio still held never opened a stream; it is counted, not decoded.
      const held = preRoll.reduce((total, chunk) => total + chunk.length, 0);
      if (held > 0) {
        queue.push({ skipped: held });
      }
      preRoll = [];
      queue.push({ endedAt: performance.now(), silentSeconds: endpointer?.silentSeconds ?? 0 });
      endpointer?.reset();
      streamOpen = !endpointer;
      void drain();
      break;
    }
  }
});
