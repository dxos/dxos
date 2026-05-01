//
// Copyright 2024 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as InboxOperation from './definitions';

export const InboxOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-mailbox'),
  () => import('./classify-email'),
  () => import('./draft-email-and-open'),
  () => import('./draft-email'),
  () => import('./extract-contact'),
  () => import('./get-google-calendars'),
  () => import('./google/calendar/sync'),
  () => import('./google/gmail/send'),
  () => import('./google/gmail/sync'),
  () => import('./read-email'),
  () => import('./summarize-mailbox'),
  () => import('./sync-calendar'),
  () => import('./sync-mailbox'),
);
