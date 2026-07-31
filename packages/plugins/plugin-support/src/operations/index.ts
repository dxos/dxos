//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { SupportOperation } from '#types';
import { HelpOperation } from '#types';

export const SupportOperationHandlerSet = OperationHandlerSet.keyed([
  [SupportOperation.CaptureUserFeedback, () => import('./capture-feedback')],
  [SupportOperation.CreateTicket, () => import('./create-ticket')],
  [HelpOperation.HideWelcome, () => import('./hide-welcome')],
  [SupportOperation.MarkInProgress, () => import('./mark-in-progress')],
  [SupportOperation.OnCreateSpace, () => import('./on-create-space')],
  [SupportOperation.ResolveTicket, () => import('./resolve-ticket')],
  [SupportOperation.SearchDocs, () => import('./search-docs')],
  [HelpOperation.Start, () => import('./start')],
]);
