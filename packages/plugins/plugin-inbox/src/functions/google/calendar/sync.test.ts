//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { describe, it } from '@effect/vitest';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { CredentialsService } from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions-runtime/testing';

import { GoogleCalendar } from '../../apis';

import { mapEvent } from './mapper';

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
 * https://developers.google.com/oauthplayground/#step1&apisSelect=https%3A%2F%2Fmail.google.com%2F%2Chttps%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.readonly&url=https%3A%2F%2F&content_type=application%2Fjson&http_method=GET&useDefaultOauthCred=unchecked&oauthEndpointSelect=Google&oauthAuthEndpointValue=https%3A%2F%2Faccounts.google.com%2Fo%2Foauth2%2Fv2%2Fauth&oauthTokenEndpointValue=https%3A%2F%2Foauth2.googleapis.com%2Ftoken&includeCredentials=unchecked&accessTokenType=bearer&autoRefreshToken=unchecked&accessType=offline&prompt=consent&response_type=code&wrapLines=on
 * Select Google Calendar API v3 scopes, authorize, then exchange authorization code for tokens.
 * Click Authorize, then Exchange authorization code for tokens.
 *
 * export ACCESS_TOKEN="xxx"
 * pnpm vitest sync.test.ts
 */
describe.runIf(process.env.ACCESS_TOKEN)('Google Calendar API', { timeout: 30_000 }, () => {
  it.effect(
    'get events by start time',
    Effect.fnUntraced(
      function* ({ expect }) {
        const calendarId = 'primary';
        const timeMin = new Date().toISOString();
        const timeMax = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        const { items = [] } = yield* GoogleCalendar.listEventsByStartTime(calendarId, timeMin, timeMax, 10);
        expect(items).to.exist;
        if (items.length) {
          const item = yield* mapEvent(items[0]);
          console.log(JSON.stringify({ event: item }, null, 2));
        }
      },
      Effect.provide(Layer.merge(TestLayer, TestDatabaseLayer())),
    ),
  );

  it.effect(
    'get events by updated time',
    Effect.fnUntraced(
      function* ({ expect }) {
        const calendarId = 'primary';
        const updatedMin = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const { items = [] } = yield* GoogleCalendar.listEventsByUpdated(calendarId, updatedMin, 10);
        expect(items).to.exist;
        if (items.length) {
          const item = yield* mapEvent(items[0]);
          console.log(JSON.stringify({ event: item }, null, 2));
        }
      },
      Effect.provide(Layer.merge(TestLayer, TestDatabaseLayer())),
    ),
  );

  it.effect('transform event to object', ({ expect }) =>
    Effect.gen(function* () {
      const calendarId = 'primary';
      const updatedMin = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { items = [] } = yield* GoogleCalendar.listEventsByUpdated(calendarId, updatedMin, 1);
      expect(items).to.exist;
      if (items.length) {
        const item = yield* mapEvent(items[0]);
        console.log(JSON.stringify({ event: item }, null, 2));
      }
    }).pipe(Effect.provide(Layer.merge(TestLayer, TestDatabaseLayer()))),
  );
});
