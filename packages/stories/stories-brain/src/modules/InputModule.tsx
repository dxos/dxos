//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useProgress } from '@dxos/app-toolkit/ui';
import { type ModuleProps } from '@dxos/story-modules';

import { InputPanel } from '../components';
import { PIPELINE_RUN, usePipelineStory } from './pipeline-context';

/** LEFT: the source selector (document / dataset / record). Reads the shared pipeline controller. */
export const InputModule = (_: ModuleProps) => {
  const { mode, onModeChange, initialDocument, parse, datasets, sampleTranscript, onLoadDataset, onInput } =
    usePipelineStory();
  // Busy while a run is in flight (from the progress monitor, not local state).
  const busy = useProgress(PIPELINE_RUN)?.status === 'running';
  return (
    <InputPanel
      mode={mode}
      onModeChange={onModeChange}
      initialDocument={initialDocument}
      parse={parse}
      datasets={datasets}
      sampleTranscript={sampleTranscript}
      busy={busy}
      onLoadDataset={onLoadDataset}
      onInput={onInput}
    />
  );
};
