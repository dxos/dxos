//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { log } from '@dxos/log';

import { GoogleCalendar } from '../../../../apis';
import { GoogleCredentials } from '../../../../services/google-credentials';
import { InboxOperation } from '../../../../types';
import { toGoogleEvent } from '../mapper';

const handler = InboxOperation.CreateGoogleCalendarEvent.pipe(
  Operation.withHandler(({ event, googleCalendarId, connection: connectionRef }) =>
    Effect.gen(function* () {
      log('creating calendar event', { googleCalendarId, connection: connectionRef.uri });
      const response = yield* GoogleCalendar.createEvent(googleCalendarId, toGoogleEvent(event));
      log('calendar event created', { id: response.id });
      return { id: response.id };
    }).pipe(Effect.provide(FetchHttpClient.layer), Effect.provide(GoogleCredentials.fromConnection(connectionRef))),
  ),
  Operation.opaqueHandler,
);

export default handler;
