//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/unstable/http/HttpClientResponse';

import { SyncDatabaseMissingError } from '@dxos/app-toolkit';
import { withAuthorization } from '@dxos/compute-runtime';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { GoogleCalendar } from '#apis';
import { GoogleOperation } from '#types';

import { AccessTokenNotPopulatedError } from '../../../errors';

const CALENDAR_LIST_URL =
  'https://www.googleapis.com/calendar/v3/users/me/calendarList?fields=items(id,summary,description,primary)';

/**
 * Lists the user's calendars via Google's REST API. Uses Effect HttpClient with
 * tracing disabled so OpenTelemetry propagation does not attach headers that break CORS.
 */
const listGoogleCalendars = (token: string) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient.pipe(Effect.map(withAuthorization(token, 'Bearer')));
    const client = httpClient.pipe(
      HttpClient.transformResponse(Effect.provideService(HttpClient.TracerDisabledWhen, () => true)),
    );
    const body = yield* HttpClientRequest.get(CALENDAR_LIST_URL).pipe(
      client.execute,
      Effect.flatMap(HttpClientResponse.schemaBodyJson(GoogleCalendar.CalendarListResponse)),
      Effect.scoped,
    );

    return body.items ?? [];
  });

const handler: Operation.WithHandler<typeof GoogleOperation.GetGoogleCalendars> =
  GoogleOperation.GetGoogleCalendars.pipe(
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
