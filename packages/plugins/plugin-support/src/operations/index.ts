//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { HelpOperation, SupportOperation } from '#types';

export const SupportOperationHandlerSet = OperationHandlerSet.lazy([
  SupportOperation.CaptureUserFeedback.pipe(Operation.lazyHandler(() => import('./capture-feedback.ts'))),
  SupportOperation.CreateTicket.pipe(Operation.lazyHandler(() => import('./create-ticket.ts'))),
  HelpOperation.HideWelcome.pipe(Operation.lazyHandler(() => import('./hide-welcome.ts'))),
  SupportOperation.MarkInProgress.pipe(Operation.lazyHandler(() => import('./mark-in-progress.ts'))),
  SupportOperation.ResolveTicket.pipe(Operation.lazyHandler(() => import('./resolve-ticket.ts'))),
  SupportOperation.SearchDocs.pipe(Operation.lazyHandler(() => import('./search-docs.ts'))),
  HelpOperation.Start.pipe(Operation.lazyHandler(() => import('./start.ts'))),
]);
