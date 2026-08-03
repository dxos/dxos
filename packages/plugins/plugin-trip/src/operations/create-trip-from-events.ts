//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import * as Calendar from '@dxos/plugin-inbox/Calendar';
import * as RoutineOperation from '@dxos/plugin-routine/RoutineOperation';
import { Event } from '@dxos/types';
import { trim } from '@dxos/util';

import { TRIP_SKILL_KEY } from '../skills';
import { TripOperation } from '../types';
import { buildTripFromEvents } from './events-to-segments';

export default TripOperation.CreateTripFromEvents.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ calendar, events: rawEvents, name }) {
      // The Calendar and Events arrive as live ECHO objects (input is `Schema.Any`); narrow them.
      const events = (rawEvents ?? []).filter((event): event is Event.Event => Obj.instanceOf(Event.Event, event));

      // The Trip lands in the same space as its source calendar (falling back to the first event).
      const db =
        (Calendar.instanceOf(calendar) ? Obj.getDatabase(calendar) : undefined) ??
        (events[0] ? Obj.getDatabase(events[0]) : undefined);
      invariant(db, 'Cannot resolve a database for the new trip.');

      // Build + persist the trip with one activity stop per located event; the skill fills gaps.
      const trip = buildTripFromEvents(db, events, name);

      // Navigate to the trip and kick off the planning skill in the background. Both are
      // side-effects that depend on app capabilities absent in headless/test runs, so failures are
      // logged rather than fatal — the trip is already created and returned.
      yield* Operation.invoke(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(trip)] }).pipe(
        Effect.catchAll((error) => {
          log.catch(error);
          return Effect.void;
        }),
      );

      yield* Operation.invoke(RoutineOperation.RunPromptInNewChat, {
        db,
        objects: [trip],
        skills: [TRIP_SKILL_KEY],
        background: true,
        instructions: trim`
          Plan the connecting travel and accommodation for this trip. Its activity segments are fixed
          appointments at specific addresses, ordered by time. For each gap between consecutive
          activities in different places, add a road/transfer segment to get between them, and add
          accommodation for any overnight stays. Use the add-segment tool to add segments and the
          plan-route tool to compute driving routes. Do not invent booking confirmations.
        `,
      }).pipe(
        Effect.catchAll((error) => {
          log.catch(error);
          return Effect.void;
        }),
      );

      return { trip };
    }),
  ),
  Operation.opaqueHandler,
);
