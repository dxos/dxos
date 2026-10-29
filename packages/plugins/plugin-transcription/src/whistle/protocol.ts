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

/** Needle 3, Cactus's tool-calling model, from the same revision as the engine that runs it. */
export const NEEDLE_MODEL_URL = `https://huggingface.co/Cactus-Compute/needle3/resolve/${NEEDLE_REVISION}/needle3.cact`;

export type WhistleAssets = typeof WHISTLE_ASSETS;

export type WhistleWord = {
  word: string;
  start: number;
  end: number;
  probability: number;
};

/** A tool as Needle reads it: a name, a plain description of the actions it covers, and a JSON schema. */
export type NeedleTool = {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, Record<string, unknown>>;
    required?: string[];
  };
};

export type NeedleCall = { name: string; arguments: Record<string, unknown> };

/** One turn's answer (`needle_complete`); the fields this code reads. */
export type NeedleAnswer = {
  /** Calls to make; empty when no tool serves the request (refusal). */
  function_calls: NeedleCall[];
  /** Calls the engine withheld (low confidence or ungrounded); worth a confirmation, never run unasked. */
  suppressed_calls: NeedleCall[];
  /** How each argument was derived; null when the token budget left no room for it. */
  reasoning: string | null;
  confidence: number | null;
};

/** Needle, loaded beside Whistle, answers each ended stream against these tools. */
export type AssistantConfig = {
  modelUrl: string;
  tools: NeedleTool[];
  /** Environment facts (`key: value; ...`), never instructions: the model does not follow prose here. */
  system?: string;
};

export type WhistleRequest =
  | {
      type: 'init';
      assets: WhistleAssets;
      language?: string;
      /** Seconds already in the recording, so word times continue from there. */
      offset?: number;
      assistant?: AssistantConfig;
    }
  /**
   * Settings that change without reloading the model, from the next pass on: the smallest batch of new audio
   * worth a pass, terms to bias recognition towards (names, jargon), and the assistant's token budget.
   */
  | {
      type: 'config';
      minPassMs?: number;
      keywords?: string[];
      maxTokens?: number;
      /**
       * Silence handling, found in the audio as it arrives: passes pause once a stream has heard enough
       * silence, streams that hear nothing are ended, and with `pauseSeconds` a pause that long after speech
       * ends the request. `false` turns it off.
       */
      endpoint?: { pauseSeconds?: number } | false;
    }
  /** 16 kHz mono samples; transferred. */
  | { type: 'audio'; samples: Float32Array }
  /** Commit the unconfirmed tail and end the stream; with an assistant, answer the stream's transcript first. */
  | { type: 'stop' };

export type WhistleResponse =
  | { type: 'progress'; loaded: number; total: number }
  /** The models are loaded and the assistant's tools are being compiled (seconds, once per worker). */
  | { type: 'preparing' }
  | { type: 'ready'; loadMs: number }
  | {
      type: 'result';
      /** Words committed by this pass (two consecutive passes agreed), in seconds into the recording. */
      words: WhistleWord[];
      /** Unconfirmed tail; replaced on every pass. */
      pending: string;
      /** Milliseconds the pass took. */
      passMs: number;
      /** Seconds of audio still queued behind this pass. */
      backlog: number;
      /** Seconds into the recording the stream has reached. */
      received: number;
      /** The stream ended with this result (after `stop`). */
      ended: boolean;
    }
  /** The assistant's answer to an ended stream, posted before the stream's closing pass. */
  | {
      type: 'answer';
      /** What was answered: the stream's committed words and its latest unconfirmed tail. */
      text: string;
      answer: NeedleAnswer;
      /** Milliseconds `needle_complete` took. */
      answerMs: number;
      /** Milliseconds from the end of the request (a stop, or the end of its pause) to this answer. */
      latencyMs: number;
      maxTokens: number;
    }
  | { type: 'error'; message: string };
