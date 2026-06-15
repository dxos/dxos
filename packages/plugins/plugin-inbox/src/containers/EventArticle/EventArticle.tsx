//
// Copyright 2025 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { getObjectPathFromObject, LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Tag } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { TagIndex } from '@dxos/schema';
import { Event as EventType } from '@dxos/types';

import { Event, type EventHeaderProps, ObjectArticle, useTargetIntegration } from '#components';
import { Calendar, InboxOperation, DraftEvent, Starred } from '#types';

// Stable fallback so `useAtomValue` always receives an atom when the event isn't starrable.
const NOT_STARRED = Atom.make(false);

export type EventArticleProps = AppSurface.ArticleProps<EventType.Event, {}, Obj.Unknown>;

export const EventArticle = ({ role, subject, attendableId, companionTo: calendar }: EventArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const { graph } = useAppGraph();
  const db = Obj.getDatabase(calendar);
  // Resolve the live (mutable, reactive) db object so edits to a draft re-render the controlled
  // inputs. The companion subject can be a non-reactive snapshot; querying by id yields the proxy.
  const live = useQuery(db, Query.select(Filter.id(subject.id)))[0];
  const event = live ?? subject;
  // A draft event (locally created, not yet synced) is editable and savable.
  const draft = DraftEvent.instanceOf(event);
  // Saving (pushing to Google Calendar) requires an integration targeting the calendar.
  const { integration } = useTargetIntegration(calendar);

  // Starring uses the calendar's TagIndex (events are feed objects). Subscribe to the index via
  // `TagIndex.atom` so the star reflects toggles immediately (membership-scoped reactivity).
  const eventCalendar = calendar && Calendar.instanceOf(calendar) ? calendar : undefined;
  const starredTag = useQuery(db, Filter.foreignKeys(Tag.Tag, [Starred.TAG_STARRED.key]))[0];
  const starredUri = starredTag && Obj.getURI(starredTag).toString();
  const tagIndex = eventCalendar?.tags?.target;
  const starredAtom = useMemo(
    () => (tagIndex && starredUri ? TagIndex.atom(tagIndex, event.id, starredUri) : NOT_STARRED),
    [tagIndex, event.id, starredUri],
  );
  const starred = useAtomValue(starredAtom);
  const handleToggleStar = useCallback(() => {
    if (eventCalendar && db) {
      void Starred.toggleStarred(eventCalendar, event, db);
    }
  }, [eventCalendar, event, db]);

  const handleOpenObject = useCallback(
    (object: Obj.Unknown) => {
      void invokePromise(LayoutOperation.Open, { subject: [getObjectPathFromObject(object)] });
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

  // Promote the event from a companion to the main view (mirrors MessageArticle).
  const handleOpen = useCallback(() => {
    void invokePromise(LayoutOperation.Open, { subject: [getObjectPathFromObject(event)] });
  }, [invokePromise, event]);

  // Push this draft event to Google Calendar.
  // NOTE: `spaceId` scopes the spawned operation process so its space-affinity services
  // (Database/Feed/Credentials) can materialize.
  const handleSave = useCallback(() => {
    if (calendar) {
      void invokePromise(InboxOperation.SyncDraftEvents, { calendar, event }, { spaceId: db?.spaceId });
    }
  }, [invokePromise, calendar, event, db]);

  // Delete the event (locally if draft, otherwise on Google Calendar too).
  const handleDelete = useCallback(() => {
    if (calendar) {
      void invokePromise(InboxOperation.DeleteEvent, { calendar, event }, { spaceId: db?.spaceId });
    }
  }, [invokePromise, calendar, event, db]);

  return (
    <Event.Root event={event} attendableId={attendableId}>
      <ObjectArticle
        role={role}
        toolbar={
          <Event.Toolbar
            alwaysActive
            graph={graph}
            editing={draft}
            onOpen={calendar ? handleOpen : undefined}
            onSave={draft ? handleSave : undefined}
            saveDisabled={!integration}
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
