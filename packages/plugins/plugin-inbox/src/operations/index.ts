//
// Copyright 2024 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as InboxOperation from './definitions';

export const InboxOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-mailbox'),
  () => import('./classify-email'),
  () => import('./draft-email-and-open'),
  () => import('./draft-email'),
  () => import('./extract-contact'),
  () => import('./google/calendar/list'),
  () => import('./google/calendar/sync'),
  () => import('./google/people/list-groups'),
  () => import('./google/people/sync'),
  () => import('./google/gmail/send'),
  () => import('./google/gmail/sync'),
  () => import('./imap/connect-test'),
  () => import('./imap/sync'),
  () => import('./read-email'),
  () => import('./sync-calendar'),
  () => import('./sync-contacts'),
  () => import('./sync-mailbox'),
);
