//
// Copyright 2024 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { InboxOperation } from '../types';

export * from './extractor';
export * from './util';

export const InboxOperationHandlerSet = OperationHandlerSet.keyed([
  [InboxOperation.AddMailbox, () => import('./add-mailbox')],
  [InboxOperation.AnalyzeMailbox, () => import('./analyze/analyze-mailbox')],
  [InboxOperation.CreateProjectFromMessage, () => import('./analyze/create-project-from-message')],
  [InboxOperation.ClassifyEmail, () => import('./classify-email')],
  [InboxOperation.DraftEmailAndOpen, () => import('./draft-email-and-open')],
  [InboxOperation.DraftEmail, () => import('./draft-email')],
  [InboxOperation.ExtractContactFromMessage, () => import('./extractor/contact-extractor')],
  [InboxOperation.ExtractContact, () => import('./extractor/extract-contact')],
  [InboxOperation.ExtractMailbox, () => import('./extractor/extract-mailbox')],
  [InboxOperation.ExtractMessage, () => import('./extractor/extract-message')],
  [InboxOperation.ExtractSummaryFromMessage, () => import('./extractor/summarize-extractor')],
  [InboxOperation.CreateGoogleCalendarEvent, () => import('./calendar/google/create')],
  [InboxOperation.GetGoogleCalendars, () => import('./calendar/google/list')],
  [InboxOperation.MaterializeCalendarTarget, () => import('./calendar/google/materialize/handler')],
  [InboxOperation.GoogleCalendarSync, () => import('./calendar/google/sync')],
  [InboxOperation.GetGoogleContactGroups, () => import('./contacts/google/list-groups')],
  [InboxOperation.GoogleContactsSync, () => import('./contacts/google/sync')],
  [InboxOperation.MaterializeGmailTarget, () => import('./mail/google/materialize/handler')],
  [InboxOperation.GmailSend, () => import('./mail/google/send')],
  [InboxOperation.GoogleMailSync, () => import('./mail/google/sync')],
  [InboxOperation.MaterializeJmapTarget, () => import('./mail/jmap/materialize/handler')],
  [InboxOperation.JmapSend, () => import('./mail/jmap/send')],
  [InboxOperation.JmapSync, () => import('./mail/jmap/sync')],
  [InboxOperation.ReadEmail, () => import('./read-email')],
  [InboxOperation.RenameFilter, () => import('./rename-filter')],
  [InboxOperation.UnsubscribeSender, () => import('./unsubscribe-sender')],
]);
