//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { describe, it } from '@effect/vitest';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { CredentialsService } from '@dxos/functions';

import { GoogleCalendar } from '../apis';

import { eventToObject } from './mapper';

const TestLayer = Layer.mergeAll(
  CredentialsService.layerConfig([
    {
      service: 'google.com',
      apiKey: Config.redacted('ACCESS_TOKEN'),
    },
  ]),
  FetchHttpClient.layer,
);

/**
 * To get a temporary access token:
 * https://developers.google.com/oauthplayground
 * Select Google Calendar API v3 scopes, authorize, then exchange authorization code for tokens.
 *
 * export ACCESS_TOKEN="xxx"
 * pnpm vitest api.test.ts
 */
describe.runIf(process.env.ACCESS_TOKEN)('Google Calendar API', { timeout: 30_000 }, () => {
  it.effect(
    'get events by start time',
    Effect.fnUntraced(function* ({ expect }) {
      const calendarId = 'primary';
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const { items } = yield* GoogleCalendar.listEventsByStartTime(calendarId, timeMin, timeMax, 10);
      expect(items).to.exist;
      console.log(JSON.stringify(items, null, 2));
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'get events by updated time',
    Effect.fnUntraced(function* ({ expect }) {
      const calendarId = 'primary';
      const updatedMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { items } = yield* GoogleCalendar.listEventsByUpdated(calendarId, updatedMin, 10);
      expect(items).to.exist;
      console.log(JSON.stringify(items, null, 2));
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'transform event to object',
    Effect.fnUntraced(function* ({ expect }) {
      const calendarId = 'primary';
      const updatedMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { items } = yield* GoogleCalendar.listEventsByUpdated(calendarId, updatedMin, 1);
      expect(items).to.exist;
      expect(items.length).toBeGreaterThan(0);

      const event = yield* eventToObject()(items[0]);
      expect(event).to.exist;
      console.log(JSON.stringify(event, null, 2));
    }, Effect.provide(TestLayer)),
  );
});
