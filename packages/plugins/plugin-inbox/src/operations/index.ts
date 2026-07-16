//
// Copyright 2024 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * from './extractor';
export * from './util';

export const InboxOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-mailbox'),
  () => import('./analyze/analyze-mailbox'),
  () => import('./analyze/analyze-topics'),
  () => import('./analyze/create-topic-from-message'),
  () => import('./classify-email'),
  () => import('./delete-email'),
  () => import('./delete-event'),
  () => import('./draft-email-and-open'),
  () => import('./draft-email'),
  () => import('./extractor/contact-extractor'),
  () => import('./extractor/extract-contact'),
  () => import('./extractor/extract-mailbox'),
  () => import('./extractor/extract-message'),
  () => import('./extractor/summarize-extractor'),
  () => import('./calendar/google/create'),
  () => import('./calendar/google/list'),
  () => import('./calendar/google/materialize/handler'),
  () => import('./calendar/google/sync'),
  () => import('./contacts/google/list-groups'),
  () => import('./contacts/google/sync'),
  () => import('./mail/gmail/materialize/handler'),
  () => import('./mail/gmail/send'),
  () => import('./mail/gmail/sync'),
  () => import('./mail/jmap/materialize/handler'),
  () => import('./mail/jmap/send'),
  () => import('./mail/jmap/sync'),
  () => import('./read-email'),
  () => import('./rename-filter'),
  () => import('./sync-contacts'),
  () => import('./unsubscribe-sender'),
  () => import('./sync-draft-events'),
);
