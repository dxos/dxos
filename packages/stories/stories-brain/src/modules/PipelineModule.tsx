//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useProgressMonitor } from '@dxos/app-toolkit/ui';

import { PipelinePanel } from '../components/index.ts';
import { PIPELINE_RUN, usePipelineStory } from './pipeline-context.ts';

/** CENTER: the pipeline picker + run controls. Triggers the run; status/progress come from the monitor. */
export const PipelineModule = () => {
  const { pipelines, selected, onSelect, onStart, onStop } = usePipelineStory();
  const progress = useProgressMonitor(PIPELINE_RUN);
  const running = progress?.status === 'running';
  const processed = progress?.current ?? 0;
  return (
    <PipelinePanel
      pipelines={pipelines}
      selected={selected}
      running={running}
      processed={processed}
      onSelect={onSelect}
      onStart={onStart}
      onStop={onStop}
    />
  );
};
