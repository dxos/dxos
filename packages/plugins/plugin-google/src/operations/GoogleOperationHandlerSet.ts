//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { GoogleOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  GoogleOperation.CreateGoogleCalendarEvent.pipe(Operation.lazyHandler(() => import('./calendar/create'))),
  GoogleOperation.GetGoogleCalendars.pipe(Operation.lazyHandler(() => import('./calendar/list'))),
  GoogleOperation.MaterializeGoogleCalendarTarget.pipe(
    Operation.lazyHandler(() => import('./calendar/materialize/handler')),
  ),
  GoogleOperation.GoogleCalendarSync.pipe(Operation.lazyHandler(() => import('./calendar/sync'))),
  GoogleOperation.GetGoogleContactGroups.pipe(Operation.lazyHandler(() => import('./contacts/list-groups/handler'))),
  GoogleOperation.GoogleContactsSync.pipe(Operation.lazyHandler(() => import('./contacts/sync'))),
  GoogleOperation.MaterializeGmailTarget.pipe(Operation.lazyHandler(() => import('./mail/materialize/handler'))),
  GoogleOperation.GmailSend.pipe(Operation.lazyHandler(() => import('./mail/send'))),
  GoogleOperation.GoogleMailSync.pipe(Operation.lazyHandler(() => import('./mail/sync'))),
]);
