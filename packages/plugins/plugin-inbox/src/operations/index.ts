//
// Copyright 2024 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * from './extractor';

export const InboxOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-mailbox'),
  () => import('./analyze/analyze-mailbox'),
  () => import('./analyze/create-project-from-message'),
  () => import('./classify-email'),
  () => import('./draft-email-and-open'),
  () => import('./draft-email'),
  () => import('./extractor/contact-extractor'),
  () => import('./extractor/extract-contact'),
  () => import('./extractor/extract-mailbox'),
  () => import('./extractor/extract-message'),
  () => import('./extractor/summarize-extractor'),
  () => import('./read-email'),
  () => import('./rename-filter'),
  () => import('./unsubscribe-sender'),
);
