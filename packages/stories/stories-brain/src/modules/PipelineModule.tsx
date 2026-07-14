//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useProgress } from '@dxos/app-toolkit/ui';
import { type ModuleProps } from '@dxos/story-modules';

import { PipelinePanel } from '../components';
import { PIPELINE_RUN, usePipelineStory } from './pipeline-context';

/** CENTER: the pipeline picker + run controls. Triggers the run; status/progress come from the monitor. */
export const PipelineModule = (_: ModuleProps) => {
  const { pipelines, selected, onSelect, onStart, onStop } = usePipelineStory();
  const progress = useProgress(PIPELINE_RUN);
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
