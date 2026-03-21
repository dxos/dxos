//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as SketchOperation from './definitions';

export const ExcalidrawOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create'),
);
