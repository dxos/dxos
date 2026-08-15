//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { TranscriptOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  TranscriptOperation.Create.pipe(Operation.lazyHandler(() => import('./create'))),
  TranscriptOperation.Open.pipe(Operation.lazyHandler(() => import('./open'))),
  TranscriptOperation.Summarize.pipe(Operation.lazyHandler(() => import('./summarize'))),
  TranscriptOperation.EnrichMessage.pipe(Operation.lazyHandler(() => import('./enrich-message'))),
]);
