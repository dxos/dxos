//
// Copyright 2026 DXOS.org
//

// Runs the Whistle speech model (Cactus `needle` engine, Emscripten build) in Node exactly as the browser story does:
// one stream, a pass every `passMs` of new audio, words two passes agree on committed. The engine and model are the
// revisions the story pins, cached under ~/.cache/dxos/whistle.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInThisContext } from 'node:vm';

import { Endpointer } from '../../../../../packages/plugins/plugin-transcription/src/whistle/endpoint.ts';
import { SAMPLE_RATE } from './audio.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
const PROTOCOL = join(REPO_ROOT, 'packages/plugins/plugin-transcription/src/whistle/protocol.ts');
const CACHE_DIR = join(homedir(), '.cache/dxos/whistle');
const OUT_CAPACITY = 256 * 1024;

/** Capture's render quantum: the story's endpointer sees audio in chunks this size. */
const FRAME = 128;

/** As the story's worker: audio kept from before the stream opens. */
const PRE_ROLL_SECONDS = 0.5;

/** The engine and model URLs, read from the story's pinned revisions so the two never drift apart. */
const assetUrls = () => {
  const source = readFileSync(PROTOCOL, 'utf8');
  const revision = (name) => source.match(new RegExp(`${name} = '([0-9a-f]+)'`))?.[1];
  const needle = revision('NEEDLE_REVISION');
  const whistle = revision('WHISTLE_REVISION');
  if (!needle || !whistle) {
    throw new Error(`Cannot read the pinned revisions from ${PROTOCOL}`);
  }
  return {
    engine: `https://huggingface.co/Cactus-Compute/needle3/resolve/${needle}/wasm/needle.js`,
    wasm: `https://huggingface.co/Cactus-Compute/needle3/resolve/${needle}/wasm/needle.wasm`,
    model: `https://huggingface.co/Cactus-Compute/whistle/resolve/${whistle}/whistle.cact`,
    key: `${needle.slice(0, 8)}-${whistle.slice(0, 8)}`,
  };
};

const cached = async (url, file) => {
  const path = join(CACHE_DIR, file);
  if (!existsSync(path)) {
    mkdirSync(CACHE_DIR, { recursive: true });
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${response.status} fetching ${url}`);
    }
    writeFileSync(path, Buffer.from(await response.arrayBuffer()));
  }
  return readFileSync(path);
};

/** Loads the engine and model; resolves to a transcriber that can run many streams. */
export const loadWhistle = async ({ language = 'en', keywords = [] } = {}) => {
  const urls = assetUrls();
  const [source, wasm, model] = await Promise.all([
    cached(urls.engine, `needle-${urls.key}.js`),
    cached(urls.wasm, `needle-${urls.key}.wasm`),
    cached(urls.model, `whistle-${urls.key}.cact`),
  ]);
  const started = performance.now();
  // `needle.js` is a classic script that reaches for CommonJS `require` under Node, so it runs wrapped as a CommonJS
  // function given those bindings rather than as a module.
  const createNeedle = runInThisContext(
    `(function (require, __filename, __dirname) {\n${source.toString('utf8')}\nreturn createNeedle;\n})`,
    { filename: join(CACHE_DIR, 'needle.js') },
  )(createRequire(import.meta.url), join(CACHE_DIR, 'needle.js'), CACHE_DIR);
  const engine = await createNeedle({ wasmBinary: wasm });
  const modelPtr = engine._malloc(model.length);
  engine.HEAPU8.set(model, modelPtr);
  if (engine._needle_load(modelPtr, BigInt(model.length)) < 0) {
    throw new Error('needle_load failed');
  }
  const writeString = (value) => {
    if (!value) {
      return 0;
    }
    const bytes = new TextEncoder().encode(value);
    const pointer = engine._malloc(bytes.length + 1);
    engine.HEAPU8.set(bytes, pointer);
    engine.HEAPU8[pointer + bytes.length] = 0;
    return pointer;
  };
  const outPtr = engine._malloc(OUT_CAPACITY);
  const languagePtr = writeString(language);
  const keywordsPtr = writeString(keywords.join('\n'));
  const read = () => {
    const end = engine.HEAPU8.indexOf(0, outPtr);
    return JSON.parse(new TextDecoder().decode(engine.HEAPU8.subarray(outPtr, end)));
  };
  const loadMs = performance.now() - started;

  /**
   * Replays `samples` as a live stream: a pass every `passMs` of audio, then the stop that commits the tail.
   * With `gate` (the story's default), the stream opens only once the story's endpointer hears sound, keeping
   * the same pre-roll, so silence before speech is never decoded. Returns one event per pass, timed in audio
   * seconds from the start of `samples` (`at`: how much audio had arrived when the pass ran).
   */
  const replay = (samples, { passMs = 1_000, gate = true } = {}) => {
    const step = Math.max(1, Math.round((SAMPLE_RATE * passMs) / 1_000));
    const events = [];
    const endpointer = gate ? new Endpointer() : undefined;
    const preRollSamples = PRE_ROLL_SECONDS * SAMPLE_RATE;
    let open = !gate;
    // Where the stream's audio starts in `samples`, and how much of it is waiting for a pass.
    let streamStart = 0;
    let pendingFrom = 0;
    const shift = (words = []) =>
      words.map((word) => ({ ...word, start: word.start + streamStart, end: word.end + streamStart }));
    const pass = (from, to) => {
      const chunk = samples.subarray(from, to);
      const pcmPtr = engine._malloc(chunk.length * 4);
      new Float32Array(engine.HEAPU8.buffer, pcmPtr, chunk.length).set(chunk);
      const passStarted = performance.now();
      engine._needle_stream_transcribe_process(pcmPtr, chunk.length, languagePtr, keywordsPtr, outPtr, OUT_CAPACITY);
      const ms = performance.now() - passStarted;
      engine._free(pcmPtr);
      const output = read();
      events.push({
        type: 'pass',
        at: to / SAMPLE_RATE,
        passMs: Math.round(ms),
        committed: shift(output.words),
        pending: (output.pending ?? '').trim(),
      });
    };
    for (let frame = 0; frame < samples.length; frame += FRAME) {
      const end = Math.min(samples.length, frame + FRAME);
      if (!open) {
        endpointer.push(samples.subarray(frame, end));
        if (!endpointer.heard) {
          continue;
        }
        open = true;
        streamStart = Math.max(0, end - preRollSamples) / SAMPLE_RATE;
        pendingFrom = Math.round(streamStart * SAMPLE_RATE);
      }
      if (end - pendingFrom >= step || end === samples.length) {
        pass(pendingFrom, end);
        pendingFrom = end;
      }
    }
    if (open) {
      engine._needle_stream_transcribe_stop(outPtr, OUT_CAPACITY);
    }
    const tail = open ? read() : { words: [] };
    events.push({ type: 'stop', at: samples.length / SAMPLE_RATE, committed: shift(tail.words), pending: '' });
    return events;
  };

  return { loadMs, replay };
};
