//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as InboxOperation from '@dxos/plugin-inbox/InboxOperation';

import { BrainOperation } from '#types';

export const BrainOperationHandlerSet = OperationHandlerSet.lazy([
  BrainOperation.AnalyzeMailbox.pipe(Operation.lazyHandler(() => import('./analyze-mailbox'))),
  BrainOperation.QueryFacts.pipe(Operation.lazyHandler(() => import('./query-facts'))),
  BrainOperation.SummarizeSubject.pipe(Operation.lazyHandler(() => import('./summarize-subject'))),
  InboxOperation.GenerateReply.pipe(Operation.lazyHandler(() => import('./generate-reply'))),
]);
