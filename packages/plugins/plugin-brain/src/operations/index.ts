//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as InboxOperation from '@dxos/plugin-inbox/InboxOperation';

import * as BrainOperation from '../types/BrainOperation';

export const BrainOperationHandlerSet = OperationHandlerSet.keyed([
  [BrainOperation.QueryFacts, () => import('./query-facts')],
  [BrainOperation.SummarizeSubject, () => import('./summarize-subject')],
  [InboxOperation.GenerateReply, () => import('./generate-reply')],
]);
