//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type ContentBlock } from '@dxos/types';

import { DEFAULT_STAGE_MODEL } from '../PipelineConfig';
import { type Stage, StageWrite } from '../Stage';

export type TranslationInput = { window: ContentBlock.Transcript[] };

/**
 * Stage ③ (interface only / deferred): translate the newest block into `targetLanguage`.
 * Conforms to the `Stage` contract and is inert until a translation backend is wired.
 */
export const makeTranslationStage = (_targetLanguage = 'en'): Stage<TranslationInput> => ({
  id: 'translate',
  trigger: 'per-block',
  window: { blocks: 1 },
  concurrency: 'latest-wins',
  model: DEFAULT_STAGE_MODEL,
  // TODO: implement translation (per-block; writes block.translation via a model call).
  run: () => Effect.succeed(StageWrite.empty()),
});
