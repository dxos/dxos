//
// Copyright 2024 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * from './extractor';

export const InboxOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-mailbox'),
  () => import('./classify-email'),
  () => import('./draft-email-and-open'),
  () => import('./draft-email'),
  () => import('./extractor/contact-extractor'),
  () => import('./extractor/extract-contact'),
  () => import('./extractor/extract-message'),
  () => import('./google/calendar/list'),
  () => import('./google/calendar/sync'),
  () => import('./google/people/list-groups'),
  () => import('./google/people/sync'),
  () => import('./google/gmail/send'),
  () => import('./google/gmail/sync'),
  () => import('./read-email'),
  () => import('./sync-calendar'),
  () => import('./sync-contacts'),
  () => import('./sync-mailbox'),
);
