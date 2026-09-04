//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { HelpOperation, SupportOperation } from '#types';

export const SupportOperationHandlerSet = OperationHandlerSet.lazy([
  SupportOperation.SubmitReport.pipe(Operation.lazyHandler(() => import('./submit-report'))),
  SupportOperation.CreateTicket.pipe(Operation.lazyHandler(() => import('./create-ticket'))),
  HelpOperation.HideWelcome.pipe(Operation.lazyHandler(() => import('./hide-welcome'))),
  SupportOperation.MarkInProgress.pipe(Operation.lazyHandler(() => import('./mark-in-progress'))),
  SupportOperation.ResolveTicket.pipe(Operation.lazyHandler(() => import('./resolve-ticket'))),
  SupportOperation.SearchDocs.pipe(Operation.lazyHandler(() => import('./search-docs'))),
  HelpOperation.Start.pipe(Operation.lazyHandler(() => import('./start'))),
]);
