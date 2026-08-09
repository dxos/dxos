//
// Copyright 2024 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as InboxOperation from '../types/InboxOperation';

export * from './extractor';

export const InboxOperationHandlerSet = OperationHandlerSet.lazy([
  InboxOperation.AddMailbox.pipe(Operation.lazyHandler(() => import('./add-mailbox'))),
  InboxOperation.AnalyzeMailbox.pipe(Operation.lazyHandler(() => import('./analyze/analyze-mailbox'))),
  InboxOperation.CreateProjectFromMessage.pipe(
    Operation.lazyHandler(() => import('./analyze/create-project-from-message')),
  ),
  InboxOperation.ClassifyEmail.pipe(Operation.lazyHandler(() => import('./classify-email'))),
  InboxOperation.DraftEmailAndOpen.pipe(Operation.lazyHandler(() => import('./draft-email-and-open'))),
  InboxOperation.DraftEmail.pipe(Operation.lazyHandler(() => import('./draft-email'))),
  InboxOperation.ExtractContactFromMessage.pipe(Operation.lazyHandler(() => import('./extractor/contact-extractor'))),
  InboxOperation.ExtractContact.pipe(Operation.lazyHandler(() => import('./extractor/extract-contact'))),
  InboxOperation.ExtractMailbox.pipe(Operation.lazyHandler(() => import('./extractor/extract-mailbox'))),
  InboxOperation.ExtractMessage.pipe(Operation.lazyHandler(() => import('./extractor/extract-message'))),
  InboxOperation.ExtractSummaryFromMessage.pipe(Operation.lazyHandler(() => import('./extractor/summarize-extractor'))),
  InboxOperation.ReadEmail.pipe(Operation.lazyHandler(() => import('./read-email'))),
  InboxOperation.RenameFilter.pipe(Operation.lazyHandler(() => import('./rename-filter'))),
  InboxOperation.UnsubscribeSender.pipe(Operation.lazyHandler(() => import('./unsubscribe-sender'))),
]);
