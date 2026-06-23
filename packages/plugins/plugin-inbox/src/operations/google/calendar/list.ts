//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { withAuthorization } from '@dxos/functions';

import { GoogleCalendar } from '../../../apis';
import { AccessTokenNotPopulatedError, SyncDatabaseMissingError } from '../../../errors';
import { InboxOperation } from '../../../types';

const CALENDAR_LIST_URL =
  'https://www.googleapis.com/calendar/v3/users/me/calendarList?fields=items(id,summary,description,primary)';

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
      Effect.flatMap(HttpClientResponse.schemaBodyJson(GoogleCalendar.CalendarListResponse)),
      Effect.scoped,
    );
    return body.items ?? [];
  });

const handler: Operation.WithHandler<typeof InboxOperation.GetGoogleCalendars> = InboxOperation.GetGoogleCalendars.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ connection }) {
      const target = connection.target;
      const db = target ? Obj.getDatabase(target) : undefined;
      if (!db) {
        return yield* Effect.fail(new SyncDatabaseMissingError());
      }

      return yield* Effect.gen(function* () {
        const connectionObj = yield* Database.load(connection);
        const accessToken = yield* Database.load(connectionObj.accessToken);
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
