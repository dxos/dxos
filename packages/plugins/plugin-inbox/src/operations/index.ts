//
// Copyright 2024 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * from './extractor';
export * from './util';

export const InboxOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-mailbox'),
  () => import('./classify-email'),
  () => import('./delete-email'),
  () => import('./delete-event'),
  () => import('./draft-email-and-open'),
  () => import('./draft-email'),
  () => import('./extractor/contact-extractor'),
  () => import('./extractor/extract-contact'),
  () => import('./extractor/extract-message'),
  () => import('./extractor/summarize-extractor'),
  () => import('./google/calendar/create'),
  () => import('./google/calendar/list'),
  () => import('./google/calendar/materialize-target'),
  () => import('./google/calendar/sync'),
  () => import('./google/contacts/list-groups'),
  () => import('./google/contacts/sync'),
  () => import('./google/gmail/materialize-target'),
  () => import('./google/gmail/send'),
  () => import('./google/gmail/sync'),
  () => import('./read-email'),
  () => import('./rename-filter'),
  () => import('./sync-contacts'),
  () => import('./sync-draft-events'),
);
