//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type ContentBlock } from '@dxos/types';

import { DEFAULT_STAGE_MODEL } from '../PipelineConfig';
import { type Stage, StageWrite } from '../Stage';

export type CorrectionInput = { window: ContentBlock.Transcript[] };

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
export const makeCorrectionStage = (): Stage<CorrectionInput> => ({
  id: 'correct',
  trigger: 'per-block',
  window: { blocks: 8 },
  concurrency: 'latest-wins',
  model: DEFAULT_STAGE_MODEL,
  run: ({ window }) =>
    Effect.sync(() => {
      // Correct every not-yet-corrected block in the window. Robust under latest-wins: if earlier
      // invocations were interrupted, the surviving run still covers their blocks. Already-corrected
      // blocks are skipped once the write is applied back (production), keeping the call idempotent.
      // TODO(LLM seam): replace with an Operation calling LanguageModel.generateObject over the
      // window to repair words split across batch boundaries; keep the same StageWrite output.
      const updates = window
        .map((block, index) => ({ block, index }))
        .filter(({ block }) => block.corrected === undefined)
        .map(({ block, index }) => ({ index, corrected: correctText(block.text) }));
      return updates.length > 0 ? StageWrite.blocks(updates) : StageWrite.empty();
    }),
});
