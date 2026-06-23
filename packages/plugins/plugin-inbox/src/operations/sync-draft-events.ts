//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { log } from '@dxos/log';
import { Event } from '@dxos/types';

import { GOOGLE_INTEGRATION_SOURCE } from '../constants';
import { findShadowObject, reanchorShadowObject } from '../hooks/shadow';
import { Calendar, InboxOperation, DraftEvent } from '../types';
import { findBindingForTarget } from './find-binding';

export default InboxOperation.SyncDraftEvents.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ calendar, event }) {
      if (!Calendar.instanceOf(calendar)) {
        return { synced: 0 };
      }
      const db = Obj.getDatabase(calendar);
      const googleCalendarId = Obj.getMeta(calendar).keys?.find((key) => key.source === GOOGLE_INTEGRATION_SOURCE)?.id;
      if (!db || !googleCalendarId) {
        return { synced: 0 };
      }

      const binding = yield* findBindingForTarget(calendar).pipe(Effect.provide(Database.layer(db)));
      if (!binding) {
        return { synced: 0 };
      }
      const connectionRef = Ref.make(Relation.getSource(binding));
      const bindingRef = Ref.make(binding);

      const candidates = yield* Effect.promise(() => db.query(Filter.type(Event.Event)).run());
      const draft = candidates.filter(
        (candidate) => DraftEvent.belongsTo(candidate, calendar.id) && (!event || candidate.id === event.id),
      );
      if (draft.length === 0) {
        return { synced: 0 };
      }

      // Create each draft event remotely and stamp it with its Google foreign key.
      for (const draftEvent of draft) {
        const { id } = yield* Operation.invoke(InboxOperation.CreateGoogleCalendarEvent, {
          event: draftEvent,
          googleCalendarId,
          connection: connectionRef,
        });
        Obj.update(draftEvent, (draftEvent) => {
          Obj.getMeta(draftEvent).keys.push({ source: GOOGLE_INTEGRATION_SOURCE, id });
        });
      }

      // Pull the canonical copies into the feed (best-effort) so the calendar stays populated, then
      // remove the local drafts (their feed counterparts are now the source of truth).
      yield* Operation.invoke(InboxOperation.GoogleCalendarSync, {
        binding: bindingRef,
      }).pipe(
        Effect.catchAll((error) => {
          log.catch(error);
          return Effect.succeed({ newEvents: 0 });
        }),
      );

      // Re-anchor annotations (e.g. notes) created on a draft via a shadow object so they survive the
      // draft → synced transition: re-point the shadow from the draft's URI to its feed copy's URI.
      const feed = calendar.feed?.target;
      const feedEvents = feed
        ? yield* Effect.promise(() => db.query(Query.select(Filter.type(Event.Event)).from(feed)).run())
        : [];
      const dbEvents = yield* Effect.promise(() => db.query(Filter.type(Event.Event)).run());
      for (const draftEvent of draft) {
        const googleId = Obj.getMeta(draftEvent).keys?.find((key) => key.source === GOOGLE_INTEGRATION_SOURCE)?.id;
        const feedCopy = googleId
          ? feedEvents.find((candidate) =>
              Obj.getMeta(candidate).keys?.some(
                (key) => key.source === GOOGLE_INTEGRATION_SOURCE && key.id === googleId,
              ),
            )
          : undefined;
        if (!feedCopy) {
          continue;
        }
        const draftUri = Obj.getURI(draftEvent);
        const shadow = findShadowObject(dbEvents, draftUri);
        if (shadow && shadow.id !== draftEvent.id) {
          reanchorShadowObject(shadow, draftUri, Obj.getURI(feedCopy));
        }
      }

      for (const draftEvent of draft) {
        db.remove(draftEvent);
      }

      return { synced: draft.length };
    }),
  ),
  Operation.opaqueHandler,
);
