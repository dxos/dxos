//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Feed } from '@dxos/echo';
import * as Calendar from '@dxos/plugin-inbox/Calendar';
import { type Actor, Event, type Organization, type Person } from '@dxos/types';

import { type OrgKey, type OrgMap } from './organizations';
import { type PersonKey, type PersonMap, personActor } from './people';
import { actor, daysFromNow } from './util';

//
// Calendar.
//

const makeCalendar = (
  people: Record<PersonKey, Person.Person>,
  organizations: Record<OrgKey, Organization.Organization>,
): { calendar: Calendar.Calendar; events: Event.Event[] } => {
  const calendar = Calendar.make({ name: 'Bramble Calendar' });

  const a = (key: PersonKey): Actor.Actor => personActor(key);
  const owner = a('kai');

  const eventAt = (props: {
    title: string;
    description?: string;
    daysFromNowVal: number;
    startHour: number;
    durationHours: number;
    attendees: Actor.Actor[];
  }): Event.Event =>
    Event.make({
      title: props.title,
      description: props.description,
      owner,
      attendees: props.attendees,
      startDate: daysFromNow(props.daysFromNowVal, props.startHour),
      endDate: daysFromNow(props.daysFromNowVal, props.startHour + props.durationHours),
    });

  const events: Event.Event[] = [
    eventAt({
      title: 'Roastery standup',
      description: 'Weekly team sync at the roastery.',
      daysFromNowVal: -12,
      startHour: 16,
      durationHours: 1,
      attendees: [a('kai'), a('diego'), a('sam'), a('riley')],
    }),
    eventAt({
      title: 'Tasting w/ Jordan (North Star)',
      description: 'Cupping the new Sidamo + Spring Blend v1 with North Star.',
      daysFromNowVal: -8,
      startHour: 17,
      durationHours: 1,
      attendees: [a('kai'), a('sam'), a('jordan')],
    }),
    eventAt({
      title: 'Roastery standup',
      daysFromNowVal: -5,
      startHour: 16,
      durationHours: 1,
      attendees: [a('kai'), a('diego'), a('sam'), a('riley')],
    }),
    eventAt({
      title: 'Q2 planning',
      description: 'Plan Q2: Spring Blend launch, sourcing trip, hiring.',
      daysFromNowVal: -3,
      startHour: 15,
      durationHours: 2,
      attendees: [a('kai'), a('diego'), a('sam'), a('riley')],
    }),
    eventAt({
      title: 'Equipment demo — Hario rep',
      description: 'Brewer demo for the cafe.',
      daysFromNowVal: 2,
      startHour: 14,
      durationHours: 1,
      attendees: [a('kai'), a('riley'), actor('Yuki Watanabe', 'yuki@hario.co.jp')],
    }),
    eventAt({
      title: 'Wholesale onboarding — Olive & Vine',
      description: 'Video call with Mateo to walk through pricing and ordering.',
      daysFromNowVal: 4,
      startHour: 17,
      durationHours: 1,
      attendees: [a('sam'), a('mateo')],
    }),
    eventAt({
      title: 'Spring Blend cupping — Hatch',
      description: 'Cupping v2 in Brooklyn with Priya and the Hatch team.',
      daysFromNowVal: 8,
      startHour: 21,
      durationHours: 2,
      attendees: [a('kai'), a('priya')],
    }),
    eventAt({
      title: 'Coffee Expo NYC',
      description: 'Three-day specialty coffee expo. Sam attending.',
      daysFromNowVal: 14,
      startHour: 14,
      durationHours: 8,
      attendees: [a('sam')],
    }),
    eventAt({
      title: 'Site visit — Finca Esperanza',
      description: "Two days at Carmen's farm during the sourcing trip.",
      daysFromNowVal: 21,
      startHour: 14,
      durationHours: 8,
      attendees: [a('diego'), a('carmen')],
    }),
  ];

  return { calendar, events };
};

/** The team's shared calendar: recurring roastery rituals plus the sourcing-trip itinerary. */
export type ScheduleResult = { calendar: Calendar.Calendar; events: Event.Event[] };

export type ScheduleInput = { people: PersonMap; organizations: OrgMap };

export const Schedule: SampleSpace.Phase<ScheduleResult, ScheduleInput> = SampleSpace.phase('schedule', {
  schemas: [Calendar.Calendar, Event.Event, Feed.Feed],
  run: ({ people, organizations }) =>
    Effect.gen(function* () {
      const { calendar, events } = makeCalendar(people, organizations);
      yield* Database.add(calendar);
      const feed = calendar.feed.target;
      if (!feed) {
        return yield* Effect.fail(new SampleSpace.SampleSpaceError({ context: { reason: 'calendar-feed-missing' } }));
      }
      yield* SampleSpace.appendToFeed(feed, events);
      return { calendar, events };
    }),
});
