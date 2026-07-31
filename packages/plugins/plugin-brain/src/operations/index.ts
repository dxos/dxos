//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { InboxOperation } from '@dxos/plugin-inbox/types';

import { BrainOperation } from '#types';

export const BrainOperationHandlerSet = OperationHandlerSet.keyed([
  [BrainOperation.QueryFacts, () => import('./query-facts')],
  [BrainOperation.SummarizeSubject, () => import('./summarize-subject')],
  [InboxOperation.GenerateReply, () => import('./generate-reply')],
]);
