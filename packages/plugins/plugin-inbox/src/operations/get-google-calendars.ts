//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Obj } from '@dxos/echo';
import { withAuthorization } from '@dxos/compute';
import { Operation } from '@dxos/compute';

import { AccessTokenNotPopulatedError, IntegrationDatabaseMissingError } from '../errors';
import { GetGoogleCalendars } from './definitions';

const CALENDAR_LIST_URL =
  'https://www.googleapis.com/calendar/v3/users/me/calendarList?fields=items(id,summary,description,primary)';

const CalendarListItem = Schema.Struct({
  id: Schema.String,
  summary: Schema.String,
  description: Schema.optional(Schema.String),
  primary: Schema.optional(Schema.Boolean),
});

const CalendarListResponse = Schema.Struct({
  items: Schema.optional(Schema.Array(CalendarListItem)),
});

/**
 * Lists the user's calendars via Google's REST API. Uses Effect HttpClient with
 * tracing disabled so OpenTelemetry propagation does not attach headers that break CORS.
 */
const listGoogleCalendars = (token: string) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient.pipe(Effect.map(withAuthorization(token, 'Bearer')));
    const client = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));
    const body = yield* HttpClientRequest.get(CALENDAR_LIST_URL).pipe(
      client.execute,
      Effect.flatMap(HttpClientResponse.schemaBodyJson(CalendarListResponse)),
      Effect.scoped,
    );
    return body.items ?? [];
  });

const handler: Operation.WithHandler<typeof GetGoogleCalendars> = GetGoogleCalendars.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ integration }) {
      const target = integration.target;
      const db = target ? Obj.getDatabase(target) : undefined;
      if (!db) {
        return yield* Effect.fail(new IntegrationDatabaseMissingError());
      }

      return yield* Effect.gen(function* () {
        const integrationObj = yield* Database.load(integration);
        const accessToken = yield* Database.load(integrationObj.accessToken);
        if (!accessToken.token) {
          return yield* Effect.fail(new AccessTokenNotPopulatedError());
        }

        const remoteCalendars = yield* listGoogleCalendars(accessToken.token).pipe(
          Effect.provide(FetchHttpClient.layer),
        );
        const targets = remoteCalendars.map((item) => ({
          id: item.id,
          name: item.summary,
          description: item.description,
        }));
        return { targets };
      }).pipe(Effect.provide(Database.layer(db)));
    }),
  ),
);

export default handler;
