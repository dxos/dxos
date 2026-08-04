//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as OutlineOperation from '../types/OutlineOperation';

export const OutlinerOperationHandlerSet = OperationHandlerSet.keyed([
  [OutlineOperation.CreateOutline, () => import('./create-outline')],
  [OutlineOperation.QuickJournalEntry, () => import('./quick-entry')],
]);
