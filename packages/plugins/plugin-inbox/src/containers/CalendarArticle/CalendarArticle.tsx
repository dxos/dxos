//
// Copyright 2023 DXOS.org
//

import { addHours, isSameDay, startOfHour } from 'date-fns';
import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Database, Filter, Obj, Query, Tag } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import * as GraphHooks from '@dxos/plugin-graph/Hooks';
import { useArticleKeyboardNavigation, useSelection } from '@dxos/react-ui-attention';
import { type CalendarController, type DateMarker, Calendar as NaturalCalendar } from '@dxos/react-ui-calendar';
import {
  ActionToolbar,
  MenuBuilder,
  TOOLBAR_DISPOSITION,
  graphActions,
  isToolbarAction,
  useMenuBuilder,
} from '@dxos/react-ui-menu';
import { type MosaicScrollController } from '@dxos/react-ui-mosaic';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import { Event } from '@dxos/types';

import { EventStack, type EventStackActionHandler, useTargetConnection } from '#components';
import { meta } from '#meta';
import { Calendar, DraftEvent, SystemTags } from '#types';

import { getCalendarPath, getFeedObjectPath } from '../../paths.ts';
import { InitializeCalendar } from './InitializeCalendar.tsx';

const byDate =
  (direction = -1) =>
  ({ startDate: a }: Event.Event, { startDate: b }: Event.Event) =>
    a < b ? -direction : a > b ? direction : 0;

export type CalendarArticleProps = AppSurface.ObjectArticleProps<Calendar.Calendar>;

export const CalendarArticle = ({ role, subject, attendableId }: CalendarArticleProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const [calendar] = useObject(subject);
  const db = Obj.getDatabase(calendar);
  // The calendar's graph node id: events open as its children and it is their pivot.
  const id = attendableId ?? (db ? getCalendarPath(db.spaceId, calendar.id) : Obj.getURI(calendar));
  const currentId = useSelection(id, 'single');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const calendarRef = useRef<CalendarController>(null);
  const eventStackRef = useRef<MosaicScrollController>(null);
  // Pushing draft events to Google Calendar requires a connection bound to this calendar.
  const { connection } = useTargetConnection(subject);

  const feed = useResolveRef(calendar.feed);
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
  const starredTag = useQuery(db, Filter.foreignKeys(Tag.Tag, [SystemTags.systemTagKey('starred')]))[0];
  const starredUri = starredTag && Obj.getURI(starredTag).toString();
  const tagIndex = useResolveRef(calendar.tags);
  const [, bumpTags] = useReducer((tick: number) => tick + 1, 0);
  useEffect(() => {
    return tagIndex ? Obj.subscribe(tagIndex, bumpTags) : undefined;
  }, [tagIndex]);
  const starredIds = SystemTags.getTaggedIds(calendar, starredUri);
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
        contextId: Calendar.getRangeSelectionId(id),
        subject: { mode: 'range', from: range.from.toISOString(), to: range.to.toISOString() },
      });
    },
    [id, invokePromise],
  );

  const handleNavigate = ToolkitHooks.useDetailNavigation({
    contextId: id,
    getPath: (eventId) => getFeedObjectPath(id, eventId),
  });

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
            void Effect.runFork(
              SystemTags.toggleTag(calendar, event, 'starred').pipe(Effect.provide(Database.layer(db))),
            );
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
        [Obj.Parent]: subject,
        owner: {},
        description: '',
        startDate: start.toISOString(),
        endDate: addHours(start, 1).toISOString(),
      }),
    );
    handleNavigate(event.id);
  }, [db, subject, selectedDate, handleNavigate]);

  const { graph } = ToolkitHooks.useAppGraph();
  const runAction = GraphHooks.useActionRunner();
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
      return builder
        .separator('gap')
        .subgraph(graphActions(graph, get, id, { filter: isToolbarAction, surface: TOOLBAR_DISPOSITION }))
        .build();
    },
    [graph, id, handleCreate],
  );

  useArticleKeyboardNavigation({ articleId: id, items: events, currentId, onSelect: handleNavigate });

  return (
    <div role={role} className='@container dx-expand'>
      <div className='grid grid-cols-1 @2xl:grid-cols-[min-content_1fr] h-full'>
        <Panel.Root classNames='hidden @2xl:grid'>
          <NaturalCalendar.Root ref={calendarRef}>
            <Panel.Header>
              <NaturalCalendar.Toolbar />
            </Panel.Header>
            <Panel.Body asChild>
              <NaturalCalendar.Grid dates={dates} onSelect={handleDateSelect} onSelectRange={handleRangeSelect} />
            </Panel.Body>
          </NaturalCalendar.Root>
        </Panel.Root>
        <Panel.Root>
          <Panel.Header>
            <ActionToolbar {...menuActions} onAction={runAction} attendableId={id} />
          </Panel.Header>

          <Panel.Body asChild>
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
          </Panel.Body>
        </Panel.Root>
      </div>
    </div>
  );
};

CalendarArticle.displayName = 'CalendarArticle';
