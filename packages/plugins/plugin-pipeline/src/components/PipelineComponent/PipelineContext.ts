//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

import { type PipelineContextValue, itemNoOp } from './PipelineComponent';

// Kept out of `PipelineComponent.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const PIPELINE_ROOT = 'Pipeline.Root';

export const [PipelineRootContext, usePipeline] = createContext<PipelineContextValue>(PIPELINE_ROOT, {
  Item: itemNoOp,
});
