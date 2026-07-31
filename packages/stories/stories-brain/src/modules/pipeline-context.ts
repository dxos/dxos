//
// Copyright 2026 DXOS.org
//

import { createContext, useContext } from 'react';

import { type Parser } from '@dxos/nlp';

import {
  type InputDataset,
  type InputMode,
  type InputPayload,
  type OutputDetail,
  type PipelineInfo,
  type StatItem,
} from '../components';

/**
 * Progress-registry task name for the pipeline run. Producer (the story provider) registers/advances
 * it; consumer modules read it via `useProgress(PIPELINE_RUN)` to derive "running" + progress —
 * replacing the ad-hoc `running`/`processed` state. See {@link AppCapabilities.ProgressRegistry}.
 */
export const PIPELINE_RUN = 'brain.pipeline.run';

/**
 * The Pipeline story's run-controller state, shared across its modules. Mirrors the props the three
 * panels consume: the run logic lives in the story-level provider; the modules are thin surfaces
 * reading their slice. NOTE what is *not* here: `facts` live in Brain's per-space `FactStore` (read
 * reactively by the output module); run status/progress lives in the `ProgressRegistry` (read via
 * `useProgress(PIPELINE_RUN)`); and `objects` is space-derived (read by the output module directly).
 */
export type PipelineStoryState = {
  // Input.
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  initialDocument: string;
  parse: Parser;
  datasets: InputDataset[];
  sampleTranscript: string;
  onLoadDataset: (count: number) => void;
  onInput: (input: InputPayload) => void;

  // Pipeline.
  pipelines: PipelineInfo[];
  selected: string;
  onSelect: (id: string) => void;
  onStart: () => void;
  onStop: () => void;

  // Output.
  stats: StatItem[];
  details: OutputDetail[];
};

export const PipelineStoryContext = createContext<PipelineStoryState | undefined>(undefined);

/** Shared pipeline-story controller state; throws if used outside the story provider. */
export const usePipelineStory = (): PipelineStoryState => {
  const context = useContext(PipelineStoryContext);
  if (!context) {
    throw new Error('usePipelineStory must be used within a PipelineStoryContext provider');
  }
  return context;
};
