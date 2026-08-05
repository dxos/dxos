//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as HelpOperation from '../types/HelpOperation';
import * as SupportOperation from '../types/SupportOperation';

export const SupportOperationHandlerSet = OperationHandlerSet.lazy([
  SupportOperation.CaptureUserFeedback.pipe(Operation.lazyHandler(() => import('./capture-feedback'))),
  SupportOperation.CreateTicket.pipe(Operation.lazyHandler(() => import('./create-ticket'))),
  HelpOperation.HideWelcome.pipe(Operation.lazyHandler(() => import('./hide-welcome'))),
  SupportOperation.MarkInProgress.pipe(Operation.lazyHandler(() => import('./mark-in-progress'))),
  SupportOperation.OnCreateSpace.pipe(Operation.lazyHandler(() => import('./on-create-space'))),
  SupportOperation.ResolveTicket.pipe(Operation.lazyHandler(() => import('./resolve-ticket'))),
  SupportOperation.SearchDocs.pipe(Operation.lazyHandler(() => import('./search-docs'))),
  HelpOperation.Start.pipe(Operation.lazyHandler(() => import('./start'))),
]);
