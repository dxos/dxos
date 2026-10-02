//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/Hooks';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { useAppGraph } from '@dxos/app-toolkit/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Database, Filter, Obj, Query, Tag } from '@dxos/echo';
import { useQuery, useResolveRef } from '@dxos/echo-react';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { TagIndex } from '@dxos/schema';
import { Event as EventType } from '@dxos/types';

import { Event, type EventHeaderProps, ObjectArticle, useTargetConnection } from '#components';
import { Calendar, DraftEvent, InboxOperation, SystemTags } from '#types';

import { getCalendarEventPath } from '../../paths.ts';

// Stable fallback so `useAtomValue` always receives an atom when the event isn't starrable.
const NOT_STARRED = Atom.make(false);

export type EventArticleProps = AppSurface.ArticleProps<EventType.Event, {}, Obj.Unknown>;

export const EventArticle = ({
  role,
  subject,
  attendableId,
  nodeId = attendableId,
  companionTo: calendar,
}: EventArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const { graph } = useAppGraph();
  const db = Obj.getDatabase(calendar);
  // Resolve the live (mutable, reactive) db object so edits to a draft re-render the controlled
  // inputs. The companion subject can be a non-reactive snapshot; querying by id yields the proxy.
  const live = useQuery(db, Query.select(Filter.id(subject.id)))[0];
  const event = live ?? subject;
  // A draft event (locally created, not yet synced) is editable and savable. The body editor binds an
  // automerge accessor, which requires the live (reactive) object — gate editing on `live` so the first
  // render (before the by-id query resolves) shows the read-only body from the snapshot instead of
  // handing the editor a non-live subject.
  const draft = DraftEvent.instanceOf(event) && !!live;
  // Saving (pushing to Google Calendar) requires a connection bound to the calendar.
  const { connection } = useTargetConnection(calendar);

  // Starring uses the calendar's TagIndex (events are feed objects). Subscribe to the index via
  // `TagIndex.atom` so the star reflects toggles immediately (membership-scoped reactivity).
  const eventCalendar = calendar && Calendar.instanceOf(calendar) ? calendar : undefined;
  const starredTag = useQuery(db, Filter.foreignKeys(Tag.Tag, [SystemTags.systemTagKey('starred')]))[0];
  const starredUri = starredTag && Obj.getURI(starredTag).toString();
  const tagIndex = useResolveRef(eventCalendar?.tags);
  const starredAtom = useMemo(
    () => (tagIndex && starredUri ? TagIndex.atom(tagIndex, event.id, starredUri) : NOT_STARRED),
    [tagIndex, event.id, starredUri],
  );
  const starred = useAtomValue(starredAtom);
  const handleToggleStar = useCallback(() => {
    if (eventCalendar && db) {
      void Effect.runFork(
        SystemTags.toggleTag(eventCalendar, event, 'starred').pipe(Effect.provide(Database.layer(db))),
      );
    }
  }, [eventCalendar, event, db]);

  const handleOpenObject = useCallback(
    (object: Obj.Unknown) => {
      void invokePromise(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(object)] });
    },
    [invokePromise],
  );

  const handleContactCreate = useCallback<NonNullable<EventHeaderProps['onContactCreate']>>(
    (actor) => {
      if (db && actor) {
        void invokePromise(InboxOperation.ExtractContact, { db, actor });
      }
    },
    [db, invokePromise],
  );

  const handleOpen = useCallback(() => {
    if (!db) {
      return;
    }
    void invokePromise(LayoutOperation.Open, { subject: [getCalendarEventPath(db.spaceId, calendar.id, event.id)] });
  }, [invokePromise, db, calendar, event.id]);

  // Delete the event locally.
  const handleDelete = useCallback(() => {
    void invokePromise(
      SpaceOperation.RemoveObjects,
      { objects: [event] },
      { spaceId: Obj.getDatabase(event)?.spaceId },
    );
  }, [invokePromise, event]);

  return (
    <Event.Root event={event} attendableId={attendableId} nodeId={nodeId}>
      <ObjectArticle
        role={role}
        toolbar={
          <Event.Toolbar
            graph={graph}
            editing={draft}
            saveDisabled={!connection}
            onOpen={calendar ? handleOpen : undefined}
            onDelete={calendar ? handleDelete : undefined}
          />
        }
        header={
          <Event.Header
            db={db}
            editable={draft}
            onContactCreate={handleContactCreate}
            onOpenObject={handleOpenObject}
            starred={starred}
            onToggleStar={eventCalendar ? handleToggleStar : undefined}
          />
        }
      >
        <Event.Viewport>
          <Event.Body editable={draft} />
        </Event.Viewport>
      </ObjectArticle>
    </Event.Root>
  );
};

EventArticle.displayName = 'EventArticle';
