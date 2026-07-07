//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { PipelineRuntime, type RunOptions } from './runtime';
import { makeCorrectionStage, makeExtractionStage, makeSummarizationStage } from './stages';
import { type Stage } from './types';

export type TranscriptionPipelineOptions = Omit<RunOptions, 'stages'> & {
  /** Ordered stages to run; defaults to the standard correction → extraction → summarization set. */
  readonly stages?: readonly Stage<any, any>[];
};

/** The standard transcription stage set, rebuilt per run (stages hold no cross-run state). */
const defaultStages = (): Stage<any, any>[] => [makeCorrectionStage(), makeExtractionStage(), makeSummarizationStage()];

export const TranscriptionPipeline = Object.freeze({
  /**
   * Default assembly over {@link PipelineRuntime}: drives the standard transcription stage set off the
   * event `source`, committing stage writes via `commit`. Unlike the linear rdf/email pipelines the
   * stages are peers fanned out from one broadcast stream (see {@link PipelineRuntime}); pass `stages`
   * to override the default set.
   */
  run: (options: TranscriptionPipelineOptions): Effect.Effect<void> =>
    PipelineRuntime.run({ ...options, stages: options.stages ?? defaultStages() }),
});
