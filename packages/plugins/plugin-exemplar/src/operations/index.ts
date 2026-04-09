//
// Copyright 2025 DXOS.org
//

// Operations barrel export.
// `OperationHandlerSet.lazy` registers handler modules for lazy loading.
// Each module must `export default` a handler created with `Operation.withHandler`.
// The framework loads handlers on demand when an operation is invoked.

import { OperationHandlerSet } from '@dxos/operation';

export * as ExemplarOperation from './definitions';

export const ExemplarOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create-exemplar-item'),
  () => import('./randomize'),
  () => import('./update-status'),
);
