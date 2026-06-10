//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

// eslint-disable-next-line unused-imports/no-unused-imports
import type { Credential } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { log } from '@dxos/log';

import { GoogleCalendar } from '../../../apis';
import { GoogleCredentials } from '../../../services/google-credentials';
import { InboxOperation } from '../../../types';
import { toGoogleEvent } from './mapper';

export default InboxOperation.CreateGoogleCalendarEvent.pipe(
  Operation.withHandler(({ event, googleCalendarId, integration: integrationRef }) =>
    Effect.gen(function* () {
      log('creating calendar event', { googleCalendarId, integration: integrationRef.uri });
      const response = yield* GoogleCalendar.createEvent(googleCalendarId, toGoogleEvent(event));
      log('calendar event created', { id: response.id });
      return { id: response.id };
    }).pipe(Effect.provide(FetchHttpClient.layer), Effect.provide(GoogleCredentials.fromIntegration(integrationRef))),
  ),
);
