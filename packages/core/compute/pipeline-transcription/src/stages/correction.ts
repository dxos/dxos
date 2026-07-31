//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type ContentBlock } from '@dxos/types';

import { DEFAULT_STAGE_MODEL } from '../types/pipeline-config';
import { type Stage, StageWrite } from '../types/stage';

export type CorrectionInput = { window: ContentBlock.Transcript[] };

/**
 * Corrects a window of transcript blocks, returning a `{ index, corrected }` patch per block it
 * changes. The deterministic default is used unless an LLM-backed corrector is injected (see
 * `correctWithLanguageModel`); the consumer binds the AI service and adapts it to this Promise shape.
 */
export type CorrectFn = (
  blocks: readonly ContentBlock.Transcript[],
) => Promise<ReadonlyArray<{ index: number; corrected: string }>>;

export type CorrectionOptions = {
  /** Inject an LLM-backed corrector; omit for the deterministic per-block correction. */
  correct?: CorrectFn;
};

/**
 * Deterministic correction: trim, capitalize the first letter, ensure terminal punctuation.
 * The LLM seam (see `run`) replaces this with cross-batch repair over the window.
 */
export const correctText = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  if (/[.!?]$/.test(capitalized)) {
    return capitalized;
  }
  // Replace a trailing non-terminal mark (comma/semicolon/colon) with the period rather than
  // appending — a Whisper fragment like "Years," would otherwise become "Years,.".
  return `${capitalized.replace(/[,;:]+$/, '')}.`;
};

/**
 * Stage ①: clean up the most recent transcript block (punctuation, capitalization).
 * Windowed for cross-batch context; emits a correction for the newest block.
 */
export const makeCorrectionStage = ({ correct }: CorrectionOptions = {}): Stage<CorrectionInput> => ({
  id: 'correct',
  trigger: 'per-block',
  window: { blocks: 8 },
  concurrency: 'latest-wins',
  model: DEFAULT_STAGE_MODEL,
  run: ({ window }) =>
    correct
      ? // LLM seam: the injected corrector repairs the window (cross-batch word/punctuation fixes).
        Effect.promise(() => correct(window)).pipe(
          Effect.map((updates) => (updates.length > 0 ? StageWrite.blocks([...updates]) : StageWrite.empty())),
        )
      : Effect.sync(() => {
          // Deterministic fallback: correct every not-yet-corrected block in the window. Robust under
          // latest-wins — if earlier invocations were interrupted, the surviving run still covers their
          // blocks; already-corrected blocks are skipped once the write is applied back (idempotent).
          const updates = window
            .map((block, index) => ({ block, index }))
            .filter(({ block }) => block.corrected === undefined)
            .map(({ block, index }) => ({ index, corrected: correctText(block.text) }));
          return updates.length > 0 ? StageWrite.blocks(updates) : StageWrite.empty();
        }),
});
