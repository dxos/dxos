//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { OutlineOperation } from '../types';

export const OutlinerOperationHandlerSet = OperationHandlerSet.keyed([
  [OutlineOperation.CreateOutline, () => import('./create-outline')],
  [OutlineOperation.QuickJournalEntry, () => import('./quick-entry')],
]);
