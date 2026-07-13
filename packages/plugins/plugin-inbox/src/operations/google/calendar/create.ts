//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

// eslint-disable-next-line unused-imports/no-unused-imports
import type { Credential } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { log } from '@dxos/log';
// Connection and Event are referenced in the inferred type of this module's default export via
// InboxOperation.CreateGoogleCalendarEvent's schema; the import lets TypeScript name them in .d.ts.
// eslint-disable-next-line unused-imports/no-unused-imports
import { type Connection, type Event } from '@dxos/types';

import { GoogleCalendar } from '../../../apis';
import { GoogleCredentials } from '../../../services/google-credentials';
import { InboxOperation } from '../../../types';
import { toGoogleEvent } from './mapper';

export default InboxOperation.CreateGoogleCalendarEvent.pipe(
  Operation.withHandler(({ event, googleCalendarId, connection: connectionRef }) =>
    Effect.gen(function* () {
      log('creating calendar event', { googleCalendarId, connection: connectionRef.uri });
      const response = yield* GoogleCalendar.createEvent(googleCalendarId, toGoogleEvent(event));
      log('calendar event created', { id: response.id });
      return { id: response.id };
    }).pipe(Effect.provide(FetchHttpClient.layer), Effect.provide(GoogleCredentials.fromConnection(connectionRef))),
  ),
);
