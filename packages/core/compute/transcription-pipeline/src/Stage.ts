//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';

import { DXN, type Ref } from '@dxos/echo';
import { type ContentBlock } from '@dxos/types';

import { type EntityLookup } from './lookup';

/**
 * When a stage's discrete computation fires, relative to the pipeline stream.
 * - `per-block`: on every new transcript block.
 * - `on-silence`: when the speaker pauses (silence edge).
 * - `periodic`: on a timer tick.
 */
export type StageTrigger = 'per-block' | 'on-silence' | 'periodic';

/**
 * Policy applied when a stage is triggered while a previous invocation is still in flight.
 * - `latest-wins`: interrupt the in-flight invocation and start a new one over the latest window.
 * - `skip-if-busy`: drop the new trigger and let the in-flight invocation complete.
 */
export type StageConcurrency = 'latest-wins' | 'skip-if-busy';

/** Fields of a transcript block that stages may patch. */
export type BlockPatch = Partial<{
  corrected: string;
  references: Ref.Ref<any>[];
  candidates: ContentBlock.Candidate[];
  translation: string;
}>;

/** A patch to a single block, keyed by its index within the window snapshot passed to the stage. */
export type BlockUpdate = { index: number } & BlockPatch;

/** A patch to the `Transcript` object itself. */
export type TranscriptUpdate = Partial<{
  summary: string;
  summaryUpdatedAt: string;
  resolvedReferents: { surface: string; referent: string; ref?: Ref.Ref<any> }[];
}>;

/** The result of a stage invocation: a typed description of ECHO mutations. */
export type StageWrite = {
  blockUpdates?: BlockUpdate[];
  transcriptUpdate?: TranscriptUpdate;
};

export const StageWrite = Object.freeze({
  blocks: (blockUpdates: BlockUpdate[]): StageWrite => ({ blockUpdates }),
  transcript: (transcriptUpdate: TranscriptUpdate): StageWrite => ({ transcriptUpdate }),
  empty: (): StageWrite => ({}),
});

/** Context supplied to a stage's `run` by the runtime. */
export type StageContext = {
  /** Resolves entity references for extraction. Backend-agnostic (full-text, vector, …). */
  readonly lookup?: EntityLookup;
  /** The model resolved for this stage by the runtime (config → stage → preset default). */
  readonly model: DXN.DXN;
};

/**
 * A pipeline stage: a discrete, repeatedly-invoked transform over a window of the transcript stream.
 *
 * The runtime — not the stage — owns the continuous stream; it builds `input` from a window snapshot
 * (`select`) and invokes `run` once per trigger, enforcing `concurrency` and injecting `model`.
 *
 * LLM-backed stages delegate `run` to an `Operation` (typed I/O, memoized-LLM tests, standalone
 * re-invocation). Pure stages implement `run` directly.
 */
export interface Stage<In = unknown, E = unknown> {
  readonly id: string;
  readonly trigger: StageTrigger;
  /** Sliding context size in blocks. Absent → the runtime passes the full current window. */
  readonly window?: { blocks: number };
  readonly concurrency: StageConcurrency;
  /** Default model for the stage; overridden by per-stage config in the runtime. */
  readonly model?: DXN.DXN;
  /** Build the stage input from the current window snapshot. Defaults to `{ window }`. */
  readonly select?: (window: ContentBlock.Transcript[]) => In;
  /** The discrete per-trigger computation. */
  run(input: In, ctx: StageContext): Effect.Effect<StageWrite, E>;
}
