//
// Copyright 2025 DXOS.org
//

// Operations barrel export.
// `OperationHandlerSet.keyed` pairs each (lightweight) operation definition with its handler
// module; the framework loads exactly the invoked operation's module on demand.
// Each module must `export default` a handler created with `Operation.withHandler`.

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { SampleOperation } from '../types';

export const SampleOperationHandlerSet = OperationHandlerSet.keyed([
  [SampleOperation.CreateSampleItem, () => import('./create-sample-item')],
  [SampleOperation.Randomize, () => import('./randomize')],
  [SampleOperation.UpdateStatus, () => import('./update-status')],
]);
