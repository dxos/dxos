//
// Copyright 2026 DXOS.org
//

import { type Stage } from '../Stage';
import { makeCorrectionStage } from './correction';
import { makeDiarizationStage } from './diarization';
import { makeExtractionStage } from './extraction';
import { makeSummarizationStage } from './summarization';
import { makeTranslationStage } from './translation';

export * from './correction';
export * from './extraction';
export * from './summarization';
export * from './translation';
export * from './diarization';

/**
 * The default registry of stage factories keyed by stage id. Consumers build a stage list for a
 * `PipelineConfig` by selecting enabled ids in config order.
 */
export const STAGE_FACTORIES: Readonly<Record<string, () => Stage<any, any>>> = Object.freeze({
  correct: makeCorrectionStage,
  extract: makeExtractionStage,
  summarize: makeSummarizationStage,
  translate: makeTranslationStage,
  diarize: makeDiarizationStage,
});

/** Build the ordered, enabled stage list for a set of stage configs. */
export const buildStages = (configs: readonly { id: string; enabled: boolean }[]): Stage<any, any>[] =>
  configs
    .filter((config) => config.enabled && STAGE_FACTORIES[config.id])
    .map((config) => STAGE_FACTORIES[config.id]());
