//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { addDays, endOfDay, format, startOfDay, subDays } from 'date-fns';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { GraphBuilder } from '@dxos/plugin-graph';
import { Calendar, getCalendarRangeSelectionId } from '@dxos/plugin-inbox';
import { Selection, ViewState, Attention } from '@dxos/react-ui-attention';
import { Event } from '@dxos/types';

import { meta } from '#meta';
import { Segment, Trip, TripOperation } from '#types';

import { getPlanningWindowDays } from '../operations/extractor/config';

/**
 * Resolves the inclusive event window [from, to] for a calendar node: the user's committed
 * `'range'` selection if present, otherwise today through today + the configured planning window.
 */
const resolvePlanningWindow = (viewState: ViewState.ViewStateManager, nodeId: string): { from: Date; to: Date } => {
  // Read without asserting the mode (the dedicated range context may be empty or, defensively, hold
  // another mode), falling back to the default window otherwise.
  const selection = viewState.get(Selection.selectionAspect, getCalendarRangeSelectionId(nodeId));
  const range =
    selection.mode === 'range' && selection.from && selection.to
      ? { from: selection.from, to: selection.to }
      : undefined;
  const now = new Date();
  const from = range ? startOfDay(new Date(range.from)) : startOfDay(now);
  const to = range ? endOfDay(new Date(range.to)) : endOfDay(addDays(now, getPlanningWindowDays()));
  return { from, to };
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
    const selectedId = Atom.family((nodeId: string) =>
      Atom.make((get) => {
        const selection = get(viewState.atom(Selection.selectionAspect, nodeId));
        return selection.mode === 'single' ? selection.id : undefined;
      }),
    );

    const extension = yield* GraphBuilder.createExtension({
      id: 'tripSegment',
      match: (node) => (Trip.instanceOf(node.data) ? Option.some({ trip: node.data, nodeId: node.id }) : Option.none()),
      connector: (matched, get) => {
        const trip = matched.trip;
        const segmentId = get(selectedId(matched.nodeId));
        let segment: Segment.Segment | undefined;
        if (segmentId) {
          for (const ref of trip.segments ?? []) {
            const target = Ref.isRef(ref) ? ref.target : (ref as unknown as Segment.Segment | undefined);
            if (Segment.instanceOf(target) && target.id === segmentId) {
              segment = target;
              break;
            }
          }
        }
        return Effect.succeed([
          AppNode.makeCompanion({
            id: Attention.linkedSegment('segment'),
            label: ['segment.companion.label', { ns: meta.profile.key }],
            icon: 'ph--ticket--regular',
            data: segment ?? 'segment',
          }),
        ]);
      },
    });

    // Context-menu action on a Trip: merge it into the nearest other trip (by date) and delete it.
    const mergeExtension = yield* GraphBuilder.createExtension({
      id: 'tripMerge',
      match: (node) => (Trip.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
      actions: (trip) =>
        Effect.succeed([
          {
            id: `${trip.id}-${TripOperation.MergeTrip.meta.key}`,
            data: () => Operation.invoke(TripOperation.MergeTrip, { trip }),
            properties: {
              label: ['trip.merge.label', { ns: meta.profile.key }],
              icon: 'ph--arrows-merge--regular',
              disposition: 'list-item',
            },
          },
        ]),
    });

    // Context-menu action written into the calendar's menu: create a trip + itinerary from the events
    // in the calendar's currently-selected date range (or the next N days from today when nothing is
    // selected). The Trip is created and opened immediately while the planning skill runs.
    const planTripExtension = yield* GraphBuilder.createExtension({
      id: 'calendarPlanTrip',
      match: (node) =>
        Calendar.instanceOf(node.data) ? Option.some({ calendar: node.data, nodeId: node.id }) : Option.none(),
      actions: ({ calendar, nodeId }) =>
        Effect.succeed([
          {
            id: `${calendar.id}-${TripOperation.CreateTripFromEvents.meta.key}`,
            data: () =>
              Effect.gen(function* () {
                const feed = calendar.feed?.target;
                const db = Obj.getDatabase(calendar);
                if (!feed || !db) {
                  return;
                }

                const { from, to } = resolvePlanningWindow(viewState, nodeId);
                // Narrow materialization at query time so the cost scales with the window, not the whole
                // feed. `startDate` is stored in Google's raw form (timed events carry UTC offsets, all-day
                // events are date-only), so a precise lexicographic bound is unsafe; widen by a day on each
                // side (comfortably covers any UTC offset) and apply the exact epoch-based window below.
                const lowerBound = format(subDays(from, 1), 'yyyy-MM-dd');
                const upperBound = format(addDays(to, 1), 'yyyy-MM-dd');
                const events = yield* Effect.promise(() =>
                  db
                    .query(
                      Query.select(
                        Filter.type(Event.Event, { startDate: Filter.between(lowerBound, upperBound) }),
                      ).from(feed),
                    )
                    .run(),
                );
                const inWindow = events.filter((event) => {
                  const start = event.startDate ? new Date(event.startDate) : undefined;
                  return start != null && !Number.isNaN(start.getTime()) && start >= from && start <= to;
                });

                yield* Operation.invoke(
                  TripOperation.CreateTripFromEvents,
                  { calendar, events: inWindow },
                  {
                    spaceId: db.spaceId,
                    notify: {
                      success: ['trip.plan-from-calendar-success.title', { ns: meta.profile.key }],
                      error: ['trip.plan-from-calendar-error.title', { ns: meta.profile.key }],
                    },
                  },
                );
              }),
            properties: {
              label: ['trip.plan-from-calendar.label', { ns: meta.profile.key }],
              icon: 'ph--airplane-takeoff--regular',
              disposition: 'list-item',
            },
          },
        ]),
    });

    return Capability.contributes(AppCapabilities.AppGraphBuilder, [extension, mergeExtension, planTripExtension]);
  }),
);
