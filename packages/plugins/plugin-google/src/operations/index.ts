//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as InboxOperation from '@dxos/plugin-inbox/InboxOperation';

export const GoogleOperationHandlerSet = OperationHandlerSet.lazy([
  InboxOperation.CreateGoogleCalendarEvent.pipe(Operation.lazyHandler(() => import('./calendar/create'))),
  InboxOperation.GetGoogleCalendars.pipe(Operation.lazyHandler(() => import('./calendar/list'))),
  InboxOperation.MaterializeCalendarTarget.pipe(Operation.lazyHandler(() => import('./calendar/materialize/handler'))),
  InboxOperation.GoogleCalendarSync.pipe(Operation.lazyHandler(() => import('./calendar/sync'))),
  InboxOperation.GetGoogleContactGroups.pipe(Operation.lazyHandler(() => import('./contacts/list-groups/handler'))),
  InboxOperation.GoogleContactsSync.pipe(Operation.lazyHandler(() => import('./contacts/sync'))),
  InboxOperation.MaterializeGmailTarget.pipe(Operation.lazyHandler(() => import('./mail/materialize/handler'))),
  InboxOperation.GmailSend.pipe(Operation.lazyHandler(() => import('./mail/send'))),
  InboxOperation.GoogleMailSync.pipe(Operation.lazyHandler(() => import('./mail/sync'))),
]);
