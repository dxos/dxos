//
// Copyright 2025 DXOS.org
//

// Operations barrel export.
// `OperationHandlerSet.lazy` registers handler modules for lazy loading.
// Each module must `export default` a handler created with `Operation.withHandler`.
// The framework loads handlers on demand when an operation is invoked.

import { OperationHandlerSet } from '@dxos/compute';

export * as SampleOperation from './definitions';

export const SampleOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create-sample-item'),
  () => import('./randomize'),
  () => import('./update-status'),
);
