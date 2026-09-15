//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { GoogleOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  GoogleOperation.CreateGoogleCalendarEvent.pipe(Operation.lazyHandler(() => import('./calendar/create/index.ts'))),
  GoogleOperation.GetGoogleCalendars.pipe(Operation.lazyHandler(() => import('./calendar/list/index.ts'))),
  GoogleOperation.MaterializeGoogleCalendarTarget.pipe(
    Operation.lazyHandler(() => import('./calendar/materialize/handler.ts')),
  ),
  GoogleOperation.GoogleCalendarSync.pipe(Operation.lazyHandler(() => import('./calendar/sync/index.ts'))),
  GoogleOperation.GetGoogleContactGroups.pipe(Operation.lazyHandler(() => import('./contacts/list-groups/handler.ts'))),
  GoogleOperation.GoogleContactsSync.pipe(Operation.lazyHandler(() => import('./contacts/sync/index.ts'))),
  GoogleOperation.MaterializeGmailTarget.pipe(Operation.lazyHandler(() => import('./mail/materialize/handler.ts'))),
  GoogleOperation.GmailSend.pipe(Operation.lazyHandler(() => import('./mail/send/index.ts'))),
  GoogleOperation.GoogleMailSync.pipe(Operation.lazyHandler(() => import('./mail/sync/index.ts'))),
]);
