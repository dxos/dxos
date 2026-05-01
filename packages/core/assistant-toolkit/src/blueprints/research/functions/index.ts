//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * from './definitions';

export const ResearchHandlers = OperationHandlerSet.lazy(
  () => import('./document-create'),
  () => import('./research'),
);
