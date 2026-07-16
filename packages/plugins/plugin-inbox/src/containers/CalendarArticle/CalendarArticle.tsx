//
// Copyright 2023 DXOS.org
//

import { addHours, isSameDay, startOfHour } from 'date-fns';
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface, useAppGraph, useShowItem } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Tag } from '@dxos/echo';
import { useActionRunner } from '@dxos/plugin-graph';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Panel, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useArticleKeyboardNavigation, useSelection } from '@dxos/react-ui-attention';
import { type CalendarController, type DateMarker, Calendar as NaturalCalendar } from '@dxos/react-ui-calendar';
import { Menu, MenuBuilder, graphActions, isToolbarAction, useMenuBuilder } from '@dxos/react-ui-menu';
import { type MosaicScrollController } from '@dxos/react-ui-mosaic';
import { Event } from '@dxos/types';

import { EventStack, type EventStackActionHandler, useTargetSync } from '#components';
import { meta } from '#meta';
import { Calendar, DraftEvent, InboxOperation, Starred } from '#types';

import { getCalendarEventPath, getCalendarRangeSelectionId } from '../../paths';
import { InitializeCalendar } from './InitializeCalendar';

const byDate =
  (direction = -1) =>
  ({ startDate: a }: Event.Event, { startDate: b }: Event.Event) =>
    a < b ? -direction : a > b ? direction : 0;

export type CalendarArticleProps = AppSurface.ObjectArticleProps<Calendar.Calendar>;

export const CalendarArticle = ({ role, subject, attendableId }: CalendarArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const showItem = useShowItem();
  // TODO(wittjosiah): Should be `const feed = useObjectValue(calendar.feed)`.
  const [calendar] = useObject(subject);
  const id = attendableId ?? Obj.getURI(calendar);
  const currentId = useSelection(id, 'single');
  const db = Obj.getDatabase(calendar);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const calendarRef = useRef<CalendarController>(null);
  const eventStackRef = useRef<MosaicScrollController>(null);
  // Syncing drafts (and the pull "Sync" toolbar action) require a connection bound to this calendar.
  const { connection, sync } = useTargetSync(subject);

  const feed = calendar.feed?.target;
  // Synced events live in the calendar feed (read-only); draft events are local db objects parented
  // to this calendar (not yet pushed to Google). Overlay both on the calendar.
  const syncedEvents = useQuery(
    db,
    feed ? Query.select(Filter.type(Event.Event)).from(feed) : Query.select(Filter.nothing()),
  );
  const draftEvents = useQuery(db, Query.select(Filter.type(Event.Event))).filter((event) =>
    DraftEvent.belongsTo(event, calendar.id),
  );
  const events = useMemo(() => [...syncedEvents, ...draftEvents].toSorted(byDate()), [syncedEvents, draftEvents]);
  // The currently active event (selected in the stack/deck); its date drives the grid's highlight.
  const activeEvent = useMemo(() => events.find((event) => event.id === currentId), [events, currentId]);

  // Starred events get a rose marker. The TagIndex mutates in place, which `useQuery` doesn't observe,
  // so subscribe to it directly and re-derive the set on change (drives both grid markers and tile stars).
  const starredTag = useQuery(db, Filter.foreignKeys(Tag.Tag, [Starred.TAG_STARRED.key]))[0];
  const starredUri = starredTag && Obj.getURI(starredTag).toString();
  const tagIndex = calendar.tags?.target;
  const [, bumpTags] = useReducer((tick: number) => tick + 1, 0);
  useEffect(() => {
    return tagIndex ? Obj.subscribe(tagIndex, bumpTags) : undefined;
  }, [tagIndex]);
  const starredIds = Starred.getStarredIds(calendar, starredUri);
  const dates = useMemo<DateMarker[]>(
    () =>
      events.map((event) => ({
        startDate: new Date(event.startDate),
        endDate: event.endDate ? new Date(event.endDate) : undefined,
        tag: starredIds.has(event.id) ? 'star' : 'busy',
      })),
    // `starredIds` is a fresh Set each render; key the memo on its membership so it stays stable.
    [events, [...starredIds].sort().join(',')],
  );

  const handleDateSelect = useCallback(
    ({ date }: { date: Date }) => {
      setSelectedDate(date);
      // Scroll the stack to the first event of the selected day WITHOUT changing the current item
      // (the grid owns its own date selection; selecting an event is a separate action).
      const match = events.find((event) => isSameDay(new Date(event.startDate), date));
      if (match) {
        eventStackRef.current?.scrollToItem(match.id);
      }
    },
    [events],
  );

  // Persist a committed multi-day range into the selection manager (as ISO date strings) so actions
  // contributed to the calendar — e.g. plugin-trip's "Plan trip from calendar" — can read it. Uses a
  // dedicated context id so the `range` mode doesn't collide with the `single` event selection on `id`.
  const handleRangeSelect = useCallback(
    ({ range }: { range: { from: Date; to: Date } }) => {
      void invokePromise(LayoutOperation.Select, {
        contextId: getCalendarRangeSelectionId(id),
        subject: { mode: 'range', from: range.from.toISOString(), to: range.to.toISOString() },
      });
    },
    [id, invokePromise],
  );

  const handleNavigate = useCallback(
    (eventId: string) => {
      // Setting the current item updates `activeEvent`, which selects + scrolls the grid (effect below).
      void showItem({
        contextId: id,
        selectionId: eventId,
        companion: linkedSegment('event'),
        path: db ? getCalendarEventPath(db.spaceId, calendar.id, eventId) : undefined,
      });
    },
    [db, id, calendar.id, showItem],
  );

  // The active event drives the grid's selection: set + scroll it once whenever the active event changes
  // (keyed on id/startDate, not a fresh Date each render, so the grid keeps its own selection between changes).
  useEffect(() => {
    if (activeEvent) {
      calendarRef.current?.select(new Date(activeEvent.startDate));
    }
  }, [activeEvent?.id, activeEvent?.startDate]);

  const handleAction = useCallback<EventStackActionHandler>(
    (action) => {
      switch (action.type) {
        case 'current': {
          handleNavigate(action.eventId);
          break;
        }
        case 'star': {
          const event = events.find((entry) => entry.id === action.eventId);
          if (event && db && Calendar.instanceOf(calendar)) {
            void Starred.toggleStarred(calendar, event, db);
          }
          break;
        }
      }
    },
    [handleNavigate, events, db, calendar],
  );

  // Create a draft event (defaulting to the selected day, else now), rounding the start up to the
  // next whole hour, and focus it.
  const handleCreate = useCallback(() => {
    if (!db) {
      return;
    }
    const base = selectedDate ?? new Date();
    const floor = startOfHour(base);
    const start = floor.getTime() === base.getTime() ? floor : addHours(floor, 1);
    const event = db.add(
      DraftEvent.make({
        owner: {},
        description: '',
        startDate: start.toISOString(),
        endDate: addHours(start, 1).toISOString(),
      }),
    );
    Obj.setParent(event, subject);
    handleNavigate(event.id);
  }, [db, subject, selectedDate, handleNavigate]);

  // Push all draft events for this calendar to Google Calendar.
  // NOTE: `spaceId` scopes the spawned operation process so its space-affinity services
  // (Database/Feed/Credentials) can materialize.
  const handleSyncDraft = useCallback(() => {
    void invokePromise(InboxOperation.SyncDraftEvents, { calendar }, { spaceId: db?.spaceId });
  }, [invokePromise, calendar, db]);

  const { graph } = useAppGraph();
  const runAction = useActionRunner();
  const menuActions = useMenuBuilder(
    (get) => {
      // `MenuBuilder` mutates in place, so conditional actions can be added without reassignment.
      const builder = MenuBuilder.make()
        .root({ label: ['calendar-toolbar.menu', { ns: meta.profile.key }] })
        .action(
          'create-event',
          { label: ['calendar-toolbar-create-event.menu', { ns: meta.profile.key }], icon: 'ph--pen--regular' },
          handleCreate,
        );
      if (draftEvents.length > 0) {
        builder.action(
          'sync-draft',
          {
            label: ['calendar-toolbar-sync.menu', { ns: meta.profile.key }],
            icon: 'ph--cloud-arrow-up--regular',
            // Pushing drafts to Google Calendar requires a connection bound to this calendar.
            disabled: !connection,
          },
          handleSyncDraft,
        );
      }
      // Own action: pull-sync from Google once connected (an external-sync `Cursor` exists).
      if (connection) {
        builder.action(
          'sync',
          {
            label: ['sync-calendar.label', { ns: meta.profile.key }],
            icon: 'ph--arrows-clockwise--regular',
            variant: 'primary',
            iconOnly: false,
          },
          () => {
            void sync();
          },
        );
      }
      return builder
        .separator('gap')
        .subgraph(graphActions(graph, get, id, { filter: isToolbarAction }))
        .build();
    },
    [graph, id, handleCreate, handleSyncDraft, draftEvents.length, connection, sync],
  );

  useArticleKeyboardNavigation({ articleId: id, items: events, currentId, onSelect: handleNavigate });

  return (
    <div role={role} className='@container dx-container overflow-hidden'>
      <div className='grid grid-cols-1 @2xl:grid-cols-[min-content_1fr] h-full'>
        <Panel.Root className='hidden @2xl:block'>
          <NaturalCalendar.Root ref={calendarRef}>
            <Panel.Toolbar asChild>
              <NaturalCalendar.Toolbar />
            </Panel.Toolbar>
            <Panel.Content asChild>
              <NaturalCalendar.Grid dates={dates} onSelect={handleDateSelect} onSelectRange={handleRangeSelect} />
            </Panel.Content>
          </NaturalCalendar.Root>
        </Panel.Root>
        <Panel.Root>
          <Menu.Root {...menuActions} onAction={runAction} attendableId={id}>
            <Panel.Toolbar asChild>
              <Menu.Toolbar />
            </Panel.Toolbar>
          </Menu.Root>
          <Panel.Content asChild>
            {events.length === 0 ? (
              <InitializeCalendar calendar={subject} />
            ) : (
              <EventStack
                id={id}
                events={events}
                currentId={currentId}
                starredIds={starredIds}
                controllerRef={eventStackRef}
                onAction={handleAction}
              />
            )}
          </Panel.Content>
        </Panel.Root>
      </div>
    </div>
  );
};

CalendarArticle.displayName = 'CalendarArticle';
