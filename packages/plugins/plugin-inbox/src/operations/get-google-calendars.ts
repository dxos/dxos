//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { GetGoogleCalendars } from './definitions';

const CALENDAR_LIST_URL =
  'https://www.googleapis.com/calendar/v3/users/me/calendarList?fields=items(id,summary,description,primary)';

type GoogleCalendarListItem = {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
};

/**
 * Lists the user's Google calendars via REST. Direct fetch — the existing
 * `GoogleCredentials.Service`-based client expects an injected credentials
 * service; this operation runs from the integration plugin and provides
 * the bearer token directly.
 */
const listGoogleCalendars = (token: string): Effect.Effect<GoogleCalendarListItem[], Error> =>
  Effect.tryPromise({
    try: async () => {
      const res = await fetch(CALENDAR_LIST_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Google Calendar API ${res.status}: ${await res.text()}`);
      }
      const body = (await res.json()) as { items?: GoogleCalendarListItem[] };
      return body.items ?? [];
    },
    catch: (error) => (error instanceof Error ? error : new Error(String(error))),
  });

/**
 * Discovery only — list calendars reachable from the integration's token.
 * No local Calendar objects are created; materialization happens lazily in
 * `SyncCalendar` on first sync of a target.
 */
const handler: Operation.WithHandler<typeof GetGoogleCalendars> = GetGoogleCalendars.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ integration }) {
      const target = integration.target;
      const db = target ? Obj.getDatabase(target) : undefined;
      if (!db) {
        return yield* Effect.fail(new Error('No database for integration ref'));
      }

      return yield* Effect.gen(function* () {
        const integrationObj = yield* Database.load(integration);
        const accessToken = yield* Database.load(integrationObj.accessToken);
        if (!accessToken.token) {
          return yield* Effect.fail(new Error('Access token not yet populated.'));
        }

        const remoteCalendars = yield* listGoogleCalendars(accessToken.token);
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
