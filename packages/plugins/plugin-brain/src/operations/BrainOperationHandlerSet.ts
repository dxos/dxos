//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { BrainOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  BrainOperation.AnalyzeMailbox.pipe(Operation.lazyHandler(() => import('./analyze-mailbox'))),
  BrainOperation.QueryFacts.pipe(Operation.lazyHandler(() => import('./query-facts'))),
  BrainOperation.SummarizeSubject.pipe(Operation.lazyHandler(() => import('./summarize-subject'))),
  BrainOperation.GenerateReply.pipe(Operation.lazyHandler(() => import('./generate-reply'))),
]);
