//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const GoogleOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./calendar/create'),
  () => import('./calendar/list'),
  () => import('./calendar/materialize/handler'),
  () => import('./calendar/sync'),
  () => import('./contacts/list-groups'),
  () => import('./contacts/sync'),
  () => import('./mail/materialize/handler'),
  () => import('./mail/send'),
  () => import('./mail/sync'),
);
