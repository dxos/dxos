//
// Copyright 2024 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as InboxOperation from './definitions';

export const InboxLocalOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-mailbox'),
  () => import('./draft-email-and-open'),
  () => import('./extract-contact'),
  () => import('./on-create-space'),
  () => import('./sync-calendar'),
  () => import('./sync-mailbox'),
);

export const InboxRemoteOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./classify-email'),
  () => import('./draft-email'),
  () => import('./google/calendar/sync'),
  () => import('./google/gmail/send'),
  () => import('./google/gmail/sync'),
  () => import('./read-email'),
  () => import('./summarize-mailbox'),
);

export const InboxOperationHandlerSet = OperationHandlerSet.merge(
  InboxLocalOperationHandlerSet,
  InboxRemoteOperationHandlerSet,
);
