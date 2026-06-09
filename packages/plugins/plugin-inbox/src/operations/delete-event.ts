//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Feed, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Integration } from '@dxos/plugin-integration';

import { GoogleCalendar } from '../apis';
import { GOOGLE_INTEGRATION_SOURCE } from '../constants';
import { GoogleCredentials } from '../services/google-credentials';
import { Calendar, InboxOperation, DraftEvent } from '../types';
import { findIntegrationForRemote } from './google/find-integration';

export default InboxOperation.DeleteEvent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ calendar, event }) {
      if (!Calendar.instanceOf(calendar) || !Obj.isObject(event)) {
        return { deleted: false };
      }
      const db = Obj.getDatabase(calendar);
      if (!db) {
        return { deleted: false };
      }

      // Draft (local-only) event: just remove it from the database.
      if (DraftEvent.instanceOf(event)) {
        db.remove(event);
        return { deleted: true };
      }

      // Synced event: delete on Google (best-effort) by its foreign key, then drop the feed copy.
      const googleEventId = Obj.getMeta(event).keys?.find((key) => key.source === GOOGLE_INTEGRATION_SOURCE)?.id;
      const googleCalendarId = Obj.getMeta(calendar).keys?.find((key) => key.source === GOOGLE_INTEGRATION_SOURCE)?.id;
      if (googleEventId && googleCalendarId) {
        const integrations = yield* Effect.promise(() => db.query(Filter.type(Integration.Integration)).run());
        const integration = findIntegrationForRemote(integrations, calendar.id, googleCalendarId);
        if (integration) {
          yield* GoogleCalendar.deleteEvent(googleCalendarId, googleEventId).pipe(
            Effect.provide(FetchHttpClient.layer),
            Effect.provide(GoogleCredentials.fromIntegration(Ref.make(integration))),
            Effect.catchAll((error) => {
              log.catch(error);
              return Effect.void;
            }),
          );
        }
      }

      const feed = calendar.feed?.target;
      if (feed) {
        yield* Feed.remove(feed, [event]);
      }
      return { deleted: true };
    }),
  ),
  Operation.opaqueHandler,
);
