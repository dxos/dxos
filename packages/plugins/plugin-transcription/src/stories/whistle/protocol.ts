//
// Copyright 2026 DXOS.org
//

/** Sample rate Whistle consumes (16 kHz mono float PCM in [-1, 1]). */
export const WHISTLE_SAMPLE_RATE = 16_000;

/** Pinned Hugging Face revisions so the engine ABI and model weights cannot drift under the story. */
const NEEDLE_REVISION = '93e88ede867e4311c39151285e74df513e4b835b';
const WHISTLE_REVISION = 'ca5287601bef25af26dcf2e1b2bdc0843a7c19e5';

export const WHISTLE_ASSETS = {
  engineUrl: `https://huggingface.co/Cactus-Compute/needle3/resolve/${NEEDLE_REVISION}/wasm/needle.js`,
  wasmUrl: `https://huggingface.co/Cactus-Compute/needle3/resolve/${NEEDLE_REVISION}/wasm/needle.wasm`,
  modelUrl: `https://huggingface.co/Cactus-Compute/whistle/resolve/${WHISTLE_REVISION}/whistle.cact`,
};

export type WhistleAssets = typeof WHISTLE_ASSETS;

export type WhistleWord = {
  word: string;
  start: number;
  end: number;
  probability: number;
};

export type WhistleRequest =
  | {
      type: 'init';
      assets: WhistleAssets;
      language?: string;
      keywords?: string[];
      /** Smallest batch of new audio, in milliseconds, worth a pass. */
      minPassMs?: number;
    }
  /** 16 kHz mono samples; transferred. */
  | { type: 'audio'; samples: Float32Array }
  /** End of an utterance: commit the unconfirmed tail and start a fresh stream buffer. */
  | { type: 'flush' }
  /** Flush and end the stream; word times restart from zero. */
  | { type: 'stop' };

export type WhistleResponse =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'ready'; loadMs: number }
  | {
      type: 'result';
      /** Words committed by this pass (two consecutive passes agreed). */
      words: WhistleWord[];
      /** Unconfirmed tail; replaced on every pass. */
      pending: string;
      /** Milliseconds the pass took. */
      passMs: number;
      /** Seconds of audio still queued behind this pass. */
      backlog: number;
      /** Seconds of audio received since the stream began. */
      received: number;
    }
  | { type: 'error'; message: string };
