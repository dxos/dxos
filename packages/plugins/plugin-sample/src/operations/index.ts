//
// Copyright 2025 DXOS.org
//

// Operations barrel export.
// `OperationHandlerSet.lazy` pairs each (lightweight) operation definition with its handler
// module; the framework loads exactly the invoked operation's module on demand.
// Each module must `export default` a handler created with `Operation.withHandler`.

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { SampleOperation } from '#types';

export const SampleOperationHandlerSet = OperationHandlerSet.lazy([
  SampleOperation.CreateSampleItem.pipe(Operation.lazyHandler(() => import('./create-sample-item.ts'))),
  SampleOperation.Randomize.pipe(Operation.lazyHandler(() => import('./randomize.ts'))),
  SampleOperation.UpdateStatus.pipe(Operation.lazyHandler(() => import('./update-status.ts'))),
]);
