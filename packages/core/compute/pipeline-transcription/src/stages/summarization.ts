//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type ContentBlock } from '@dxos/types';

import { DEFAULT_STAGE_MODEL } from '../PipelineConfig';
import { type Stage, StageWrite } from '../Stage';

export type SummarizationInput = { window: ContentBlock.Transcript[] };

/**
 * Stage ④: maintain a cumulative summary. Fires on the silence edge, skips if a summary is already
 * in flight. The deterministic implementation concatenates corrected utterances; the LLM seam
 * (see `run`) replaces it with a cumulative model summary plus referent resolution.
 */
export const makeSummarizationStage = (): Stage<SummarizationInput> => ({
  id: 'summarize',
  trigger: 'on-silence',
  concurrency: 'skip-if-busy',
  model: DEFAULT_STAGE_MODEL,
  run: ({ window }) =>
    Effect.sync(() => {
      const utterances = window.map((block) => (block.corrected ?? block.text).trim()).filter(Boolean);
      if (utterances.length === 0) {
        return StageWrite.empty();
      }
      // TODO(LLM seam): replace with a cumulative LLM summary that resolves deictic referents
      // ("I" → speaker, "there" → prior entity) and writes `resolvedReferents`.
      return StageWrite.transcript({
        summary: utterances.join(' '),
        summaryUpdatedAt: new Date().toISOString(),
      });
    }),
});
