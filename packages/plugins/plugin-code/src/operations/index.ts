//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

const Handlers = OperationHandlerSet.lazy(
  () => import('./verify-spec'),
  () => import('./run-build-agent'),
);

export { RunBuildAgent, VerifySpec } from './definitions';

export const CodeHandlers = Handlers;
