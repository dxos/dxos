//
// Copyright 2024 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { InboxOperation } from '#types';

// The feed-cursor helpers are public because a contributed processor keeps its cursor on a mailbox
// feed that plugin-inbox owns — plugin-brain's analyze pass is the first such consumer.

export const handlers = OperationHandlerSet.lazy([
  InboxOperation.AddMailbox.pipe(Operation.lazyHandler(() => import('./add-mailbox'))),
  InboxOperation.CreateProjectFromMessage.pipe(Operation.lazyHandler(() => import('./create-project-from-message'))),
  InboxOperation.ClassifyEmail.pipe(Operation.lazyHandler(() => import('./classify-email'))),
  InboxOperation.ResetFeedCursor.pipe(Operation.lazyHandler(() => import('./reset-feed-cursor'))),
  InboxOperation.ClassifyMailbox.pipe(Operation.lazyHandler(() => import('./classify/classify-mailbox'))),
  InboxOperation.DraftEmailAndOpen.pipe(Operation.lazyHandler(() => import('./draft-email-and-open'))),
  InboxOperation.AnalyzeMailbox.pipe(Operation.lazyHandler(() => import('./analyze/analyze-mailbox'))),
  InboxOperation.DraftEmail.pipe(Operation.lazyHandler(() => import('./draft-email'))),
  InboxOperation.ExtractContactFromMessage.pipe(Operation.lazyHandler(() => import('./extractor/contact-extractor'))),
  InboxOperation.ExtractCorrespondents.pipe(
    Operation.lazyHandler(() => import('./correspondents/extract-correspondents')),
  ),
  InboxOperation.ExtractContact.pipe(Operation.lazyHandler(() => import('./extractor/extract-contact'))),
  InboxOperation.ExtractMailbox.pipe(Operation.lazyHandler(() => import('./extractor/extract-mailbox'))),
  InboxOperation.ExtractMessage.pipe(Operation.lazyHandler(() => import('./extractor/extract-message'))),
  InboxOperation.ExtractSubscriptions.pipe(
    Operation.lazyHandler(() => import('./subscriptions/extract-subscriptions')),
  ),
  InboxOperation.ExtractSummaryFromMessage.pipe(Operation.lazyHandler(() => import('./extractor/summarize-extractor'))),
  InboxOperation.SummarizeMailbox.pipe(Operation.lazyHandler(() => import('./summarize/summarize-mailbox'))),
  InboxOperation.ReadEmail.pipe(Operation.lazyHandler(() => import('./read-email'))),
  InboxOperation.RenameFilter.pipe(Operation.lazyHandler(() => import('./rename-filter'))),
  InboxOperation.UnsubscribeSender.pipe(Operation.lazyHandler(() => import('./unsubscribe-sender'))),
]);
