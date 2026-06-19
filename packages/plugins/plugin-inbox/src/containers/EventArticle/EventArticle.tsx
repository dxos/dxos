//
// Copyright 2025 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Tag } from '@dxos/echo';
import { Graph } from '@dxos/plugin-graph';
import { useQuery } from '@dxos/react-client/echo';
import { linkedSegment } from '@dxos/react-ui-attention';
import { TagIndex } from '@dxos/schema';
import { Event as EventType } from '@dxos/types';

import { Event, type EventHeaderProps, ObjectArticle, useTargetIntegration } from '#components';
import { Calendar, InboxOperation, DraftEvent, Starred } from '#types';

import { getCalendarEventPath, getEventNodeId } from '../../paths';

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
      void invokePromise(LayoutOperation.Open, { subject: [Paths.getObjectPathFromObject(object)] });
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

  // TODO(wittjosiah): This is very convoluted, find a simpler way to make this work.
  const eventSegment = linkedSegment(event.id);
  const isEventNode = !!attendableId?.endsWith(`/${eventSegment}`);
  const nodeId = isEventNode ? attendableId : attendableId ? getEventNodeId(attendableId, eventSegment) : undefined;

  useEffect(() => {
    if (isEventNode || !nodeId) {
      return;
    }
    // The event-specific node is produced by the `calendarEvent` connector which does not
    // trigger automatic action expansion (unlike resolver-created nodes in primary mode).
    // Explicitly expand here so extensions — e.g. plugin-meeting's "Create meeting" — attach
    // to this node's toolbar for the one event whose companion is currently open.
    void Graph.expand(graph, nodeId, 'action');
  }, [graph, isEventNode, nodeId]);

  // Promote the event from a companion to the main view (mirrors MessageArticle).
  const handleOpen = useCallback(() => {
    if (!db) {
      return;
    }
    void invokePromise(LayoutOperation.Open, { subject: [getCalendarEventPath(db.spaceId, calendar.id, event.id)] });
  }, [invokePromise, db, calendar, event.id]);

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
    <Event.Root event={event} attendableId={attendableId} nodeId={nodeId}>
      <ObjectArticle
        role={role}
        toolbar={
          <Event.Toolbar
            graph={graph}
            editing={draft}
            saveDisabled={!integration}
            onOpen={calendar ? handleOpen : undefined}
            onSave={draft ? handleSave : undefined}
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
