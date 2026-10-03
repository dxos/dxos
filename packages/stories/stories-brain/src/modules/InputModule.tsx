//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useProgressMonitor } from '@dxos/app-toolkit/ui';

import { InputPanel } from '../components/index.ts';
import { PIPELINE_RUN, usePipelineStory } from './pipeline-context.ts';

/** LEFT: the source selector (document / dataset / record). Reads the shared pipeline controller. */
export const InputModule = () => {
  const { mode, onModeChange, initialDocument, parse, datasets, sampleTranscript, onLoadDataset, onInput } =
    usePipelineStory();
  // Busy while a run is in flight (from the progress monitor, not local state).
  const busy = useProgressMonitor(PIPELINE_RUN)?.status === 'running';
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
