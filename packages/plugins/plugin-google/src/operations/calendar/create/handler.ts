//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import * as Operation from '@dxos/compute/Operation';
import { log } from '@dxos/log';

import { GoogleCalendar } from '#apis';
import { GoogleOperation } from '#types';

import { GoogleCredentials } from '../../../services/google-credentials.ts';
import { toGoogleEvent } from '../mapper.ts';

const handler = GoogleOperation.CreateGoogleCalendarEvent.pipe(
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
