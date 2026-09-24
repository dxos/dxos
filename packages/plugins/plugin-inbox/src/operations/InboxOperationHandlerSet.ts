//
// Copyright 2024 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { InboxOperation } from '#types';

// The feed-cursor helpers are public because a contributed processor keeps its cursor on a mailbox
// feed that plugin-inbox owns — plugin-brain's analyze pass is the first such consumer.

export const handlers = OperationHandlerSet.lazy([
  InboxOperation.AddMailbox.pipe(Operation.lazyHandler(() => import('./add-mailbox.ts'))),
  InboxOperation.CreateProjectFromMessage.pipe(Operation.lazyHandler(() => import('./create-project-from-message.ts'))),
  InboxOperation.ClassifyEmail.pipe(Operation.lazyHandler(() => import('./classify-email.ts'))),
  InboxOperation.ResetFeedCursor.pipe(Operation.lazyHandler(() => import('./reset-feed-cursor.ts'))),
  InboxOperation.ClassifyMailbox.pipe(Operation.lazyHandler(() => import('./classify/classify-mailbox.ts'))),
  InboxOperation.DraftEmailAndOpen.pipe(Operation.lazyHandler(() => import('./draft-email-and-open.ts'))),
  InboxOperation.AnalyzeMailbox.pipe(Operation.lazyHandler(() => import('./analyze/analyze-mailbox.ts'))),
  InboxOperation.DraftEmail.pipe(Operation.lazyHandler(() => import('./draft-email.ts'))),
  InboxOperation.ExtractContactFromMessage.pipe(
    Operation.lazyHandler(() => import('./extractor/contact-extractor.ts')),
  ),
  InboxOperation.ExtractCorrespondents.pipe(
    Operation.lazyHandler(() => import('./correspondents/extract-correspondents.ts')),
  ),
  InboxOperation.ExtractContact.pipe(Operation.lazyHandler(() => import('./extractor/extract-contact.ts'))),
  InboxOperation.ExtractMailbox.pipe(Operation.lazyHandler(() => import('./extractor/extract-mailbox.ts'))),
  InboxOperation.ExtractMessage.pipe(Operation.lazyHandler(() => import('./extractor/extract-message.ts'))),
  InboxOperation.ExtractSubscriptions.pipe(
    Operation.lazyHandler(() => import('./subscriptions/extract-subscriptions.ts')),
  ),
  InboxOperation.ExtractSummaryFromMessage.pipe(
    Operation.lazyHandler(() => import('./extractor/summarize-extractor.ts')),
  ),
  InboxOperation.SummarizeMailbox.pipe(Operation.lazyHandler(() => import('./summarize/summarize-mailbox.ts'))),
  InboxOperation.ReadEmail.pipe(Operation.lazyHandler(() => import('./read-email.ts'))),
  InboxOperation.RenameFilter.pipe(Operation.lazyHandler(() => import('./rename-filter.ts'))),
  InboxOperation.UnsubscribeSender.pipe(Operation.lazyHandler(() => import('./unsubscribe-sender.ts'))),
]);
