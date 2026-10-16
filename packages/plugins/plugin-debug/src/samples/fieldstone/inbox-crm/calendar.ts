//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import * as Calendar from '@dxos/plugin-inbox/Calendar';
import { Event } from '@dxos/types';

import { HANA_JOINED_DAYS_AGO, type PersonKey } from '../team/index.ts';
import { type Make, personActor } from '../util.ts';
import { type Directory } from './mail.ts';
import { type Clock, at, dateOnly, monthly, weekly } from './util.ts';

export type EventKey =
  | 'teamSync'
  | 'sprintPlanning'
  | 'retro'
  | 'oncall'
  | 'productReview'
  | 'northpineSync'
  | 'oneOnOne'
  | 'release17'
  | 'northpineKickoff'
  | 'okapiPostmortem'
  | 'okapiFollowUp'
  | 'stripeSession'
  | 'hanaOnboarding'
  | 'meridianReview'
  | 'interviews'
  | 'release18'
  | 'brightwaterIntro'
  | 'cloudflareCall'
  | 'awsReview'
  | 'northpineQbr'
  | 'offsite';

export type Events = Record<EventKey, Event.Event[]>;

type Who = keyof Directory;

const FIELDSTONE: PersonKey[] = ['astrid', 'omar', 'felix', 'june', 'tomas', 'anika', 'ben', 'lucia', 'kofi', 'hana'];

/** Astrid's reports, each with the time of day of their monthly 1:1. */
const REPORTS: Array<{ readonly key: PersonKey; readonly time: readonly [number, number] }> = [
  { key: 'omar', time: [13, 0] },
  { key: 'felix', time: [13, 30] },
  { key: 'june', time: [14, 0] },
  { key: 'tomas', time: [13, 0] },
  { key: 'anika', time: [13, 30] },
  { key: 'ben', time: [14, 0] },
  { key: 'lucia', time: [13, 0] },
  { key: 'kofi', time: [13, 30] },
  { key: 'hana', time: [14, 0] },
];

/** Incoming on-call engineer by week, so the handoff mail and the calendar agree. */
const ROTATION: PersonKey[] = ['june', 'tomas', 'omar', 'felix'];

const FIRST = -182;
const LAST = 182;

type Timed = {
  readonly title: string;
  readonly description?: string;
  readonly attendees: ReadonlyArray<Who>;
  readonly time: readonly [number, number];
  readonly minutes: number;
};

/**
 * Astrid's calendar for a year around the reference date. `Event` has no recurrence, so each series
 * is one Event per occurrence.
 */
/** Agendas for the weekly team sync, in rotation. */
const TEAM_SYNC_NOTES = [
  'Cache v2 rollout status; Okapi follow-ups; who is on call next week.',
  'Demo: size-aware eviction on the edge tier. Then blockers.',
  'R2 backend: integration tests, beta tenants, rollback plan.',
  'Billing migration: metered line live in staging? Invoices dry run.',
  'SOC 2: evidence collection owners. Hiring loop updates.',
  'Release train for 1.8: what is in, what slips.',
  'Customer roundup: Northpine renewal, Meridian review, Brightwater trial.',
  'Incident review: last week’s pages and the noisy alerts to fix.',
];

/** Planning notes for each sprint, in rotation. */
const SPRINT_NOTES = [
  'Top of the backlog: sharded index, signed URLs, CLI backoff.',
  'Carry-over from last sprint plus the Okapi action items.',
  'Billing: usage meter, Stripe prepay credits, invoice previews.',
  'Edge tier: eviction metrics, R2 multipart, warm-cache command.',
  'Hardening sprint: flaky tests, alert tuning, runbook updates.',
];

/** Retro themes, in rotation. */
const RETRO_NOTES = [
  'Went well: release notes drafted by Scribe. Change: review agent PRs within a day.',
  'Went well: incident response. Change: name a secondary on every page.',
  'Went well: pairing with Hana. Change: smaller tasks for Builder runs.',
  'Went well: billing dry run. Change: freeze the migration plan before coding.',
];

/** Monthly product review topics, in rotation. */
const PRODUCT_REVIEW_NOTES = [
  'Usage: hit rate by plan, top tenants by storage, churn risks.',
  'Roadmap: what moves into Q4, what waits for 1.9.',
  'Pricing: storage overage, free-tier cap, enterprise commit.',
  'Customer feedback from Northpine, Okapi and the Brightwater trial.',
];

/** Northpine sync topics, in rotation. */
const NORTHPINE_NOTES = [
  'SSO rollout, then their dedicated region request.',
  'Seat count for renewal; build-time savings report.',
  'Cache hit rate on their Bazel monorepo; next quarter’s plans.',
];

/** Notes for Hana's first five 1:1s. */
const HANA_NOTES = [
  'First week: laptop, accounts, the cache-engine walkthrough with Omar.',
  'First month: the flaky-test task, on-call shadowing, questions so far.',
  'Taking a Builder review on her own; first solo on-call week.',
  'Owning the regression suite; what to pick up next quarter.',
  'Six-month check-in: growth plan and the 1.9 work she wants.',
];

export const makeCalendar = (
  people: Directory,
): Make<{ readonly calendar: Calendar.Calendar; readonly events: Events }> =>
  Effect.gen(function* () {
    const clock: Clock = yield* SampleSpace.Clock;
    const owner = personActor(people.astrid);
    const attendeesOf = (keys: ReadonlyArray<Who>) => keys.map((key) => personActor(people[key]));

    const timed = (offset: number, event: Timed) => {
      const startDate = at(clock, offset, event.time[0], event.time[1]);
      return Event.make({
        title: event.title,
        description: event.description,
        owner,
        attendees: attendeesOf(event.attendees),
        startDate,
        endDate: new Date(Date.parse(startDate) + event.minutes * 60_000).toISOString(),
      });
    };

    const allDay = (
      from: number,
      to: number,
      event: Omit<Timed, 'time' | 'minutes'> & { location?: Event.Event['location'] },
    ) =>
      Event.make({
        title: event.title,
        description: event.description,
        owner,
        attendees: attendeesOf(event.attendees),
        allDay: true,
        startDate: dateOnly(clock, from),
        endDate: dateOnly(clock, to),
        ...(event.location ? { location: event.location } : {}),
      });

    const series = (offsets: number[], event: Timed) => offsets.map((offset) => timed(offset, event));

    /** A series whose occurrences take their descriptions from `notes` in turn, so no two weeks read alike. */
    const rotating = (offsets: number[], event: Omit<Timed, 'description'>, notes: ReadonlyArray<string>) =>
      offsets.map((offset, index) => timed(offset, { ...event, description: notes[index % notes.length] }));

    const events: Events = {
      teamSync: rotating(
        weekly(clock, { weekday: 1, from: FIRST, count: 52 }),
        { title: 'Team sync', attendees: FIELDSTONE, time: [10, 0], minutes: 30 },
        TEAM_SYNC_NOTES,
      ),
      sprintPlanning: rotating(
        weekly(clock, { weekday: 2, from: FIRST, count: 26, everyWeeks: 2 }),
        { title: 'Sprint planning', attendees: FIELDSTONE, time: [14, 0], minutes: 60 },
        SPRINT_NOTES,
      ),
      retro: rotating(
        weekly(clock, { weekday: 5, from: FIRST, count: 26, everyWeeks: 2 }),
        { title: 'Retro', attendees: FIELDSTONE, time: [14, 0], minutes: 45 },
        RETRO_NOTES,
      ),
      oncall: weekly(clock, { weekday: 5, from: FIRST, count: 52 }).map((offset, week) => {
        const incoming = ROTATION[week % ROTATION.length];
        return timed(offset, {
          title: 'On-call handoff',
          attendees: ['anika', incoming],
          time: [15, 0],
          minutes: 30,
        });
      }),
      productReview: rotating(
        monthly(clock, { from: -170, count: 12 }),
        { title: 'Product review', attendees: FIELDSTONE, time: [15, 0], minutes: 60 },
        PRODUCT_REVIEW_NOTES,
      ),
      northpineSync: rotating(
        monthly(clock, { from: -165, count: 12 }),
        { title: 'Northpine sync', attendees: ['grace', 'marcus', 'astrid', 'june'], time: [16, 0], minutes: 45 },
        NORTHPINE_NOTES,
      ),
      oneOnOne: REPORTS.flatMap(({ key, time }, index) => {
        const from = key === 'hana' ? -HANA_JOINED_DAYS_AGO : FIRST + 2 + index * 3;
        const count = key === 'hana' ? Math.floor((LAST - 3 - from) / 30) + 1 : 12;
        // Only Hana's first months carry notes: a ramp-up plan worth writing down.
        return monthly(clock, { from, count }).map((offset, index) =>
          timed(offset, {
            title: `Astrid / ${people[key].fullName?.split(' ')[0]} 1:1`,
            description: key === 'hana' ? HANA_NOTES[index] : undefined,
            attendees: ['astrid', key],
            time,
            minutes: 30,
          }),
        );
      }),

      release17: [
        allDay(-75, -75, {
          title: 'Cairn 1.7 release',
          description: 'Release day for Cairn 1.7.',
          attendees: FIELDSTONE,
        }),
      ],
      northpineKickoff: [
        timed(-40, {
          title: 'Northpine SSO kickoff',
          description: 'From the thread "Northpine SSO rollout": scope SAML and SCIM for Northpine.',
          attendees: ['grace', 'marcus', 'astrid', 'june'],
          time: [16, 0],
          minutes: 45,
        }),
      ],
      okapiPostmortem: [
        timed(-26, {
          title: 'Okapi postmortem review',
          description: 'From the thread "Okapi cache-corruption postmortem": walk through the draft and agree actions.',
          attendees: ['nadia', 'sam', 'omar', 'anika', 'astrid'],
          time: [14, 0],
          minutes: 60,
        }),
      ],
      okapiFollowUp: [
        timed(7, {
          title: 'Okapi alerting follow-up',
          description:
            'From the thread "Okapi cache-corruption postmortem": show Okapi the hash-mismatch alerts that shipped in 1.8 and route them to their on-call.',
          attendees: ['nadia', 'sam', 'omar', 'astrid'],
          time: [16, 0],
          minutes: 30,
        }),
      ],
      stripeSession: [
        timed(-20, {
          title: 'Stripe billing working session',
          description: 'From the thread "Stripe usage-based billing migration": prepay credits on the metered line.',
          attendees: ['dana', 'june'],
          time: [16, 0],
          minutes: 90,
        }),
      ],
      hanaOnboarding: [
        timed(-HANA_JOINED_DAYS_AGO, {
          title: 'Hana onboarding: day one',
          description: 'From the thread "Welcome Hana": setup, then a cache-engine walkthrough with Omar.',
          attendees: ['astrid', 'hana', 'omar'],
          time: [13, 0],
          minutes: 120,
        }),
      ],
      meridianReview: [
        timed(-6, {
          title: 'Meridian security review',
          description: 'From the thread "Meridian security questionnaire": live walkthrough of access logging.',
          attendees: ['aisha', 'ted', 'kenji', 'astrid', 'anika'],
          time: [15, 0],
          minutes: 90,
        }),
      ],
      interviews: (
        [
          [-30, 'Lena Vogt', 'Interview loop: Lena Vogt (backend)', ['omar', 'felix']],
          [-9, 'Imogen Clarke', 'Interview panel: Imogen Clarke', ['june', 'tomas']],
          [7, 'Dev Malhotra', 'Interview scheduling: Dev Malhotra and Yusuf Demir', ['omar', 'hana']],
          [9, 'Yusuf Demir', 'Interview scheduling: Dev Malhotra and Yusuf Demir', ['omar']],
        ] as const
      ).map(([offset, candidate, thread, panel]) =>
        timed(offset, {
          title: `Interview: ${candidate}`,
          description: `From the thread "${thread}".`,
          attendees: ['astrid', ...panel],
          time: [14, 0],
          minutes: 60,
        }),
      ),
      release18: [
        allDay(2, 2, {
          title: 'Cairn 1.8 release',
          description:
            'From the threads "Cairn 1.8 release notes draft" and "GitHub Actions integration partner program": the verified setup-cairn listing goes live with the release.',
          attendees: [...FIELDSTONE, 'sofia'],
        }),
      ],
      brightwaterIntro: [
        timed(5, {
          title: 'Brightwater intro call',
          description: 'From the thread "Brightwater intro and pricing": scope a two-week trial.',
          attendees: ['leo', 'mila', 'lucia', 'kofi'],
          time: [16, 0],
          minutes: 45,
        }),
      ],
      cloudflareCall: [
        timed(6, {
          title: 'Cloudflare R2 pricing call',
          description: 'From the thread "Cloudflare R2 egress pricing": enterprise commit and operation costs.',
          attendees: ['ines', 'omar', 'felix'],
          time: [15, 0],
          minutes: 30,
        }),
      ],
      awsReview: [
        timed(8, {
          title: 'AWS architecture review',
          description: 'From the thread "AWS credits and a Savings Plan": size the Savings Plan and the new region.',
          attendees: ['elena', 'anika', 'astrid'],
          time: [15, 0],
          minutes: 60,
        }),
      ],
      northpineQbr: [
        timed(12, {
          title: 'Northpine QBR',
          description: 'From the thread "Northpine renewal and seat count": renewal, seats and the dedicated region.',
          attendees: ['grace', 'ruth', 'marcus', 'astrid', 'lucia'],
          time: [15, 0],
          minutes: 60,
        }),
      ],
      offsite: [
        allDay(34, 36, {
          title: 'Team offsite at Saltmarsh Lodge',
          description: 'From the thread "Q4 offsite planning": three days of working sessions by the coast.',
          attendees: [...FIELDSTONE, 'wren'],
          location: {
            street: 'Estrada da Lagoa 12',
            locality: 'Comporta',
            region: 'Setúbal',
            postalCode: '7580-612',
            country: 'Portugal',
          },
        }),
      ],
    };

    for (const list of Object.values(events)) {
      list.sort((left, right) => left.startDate.localeCompare(right.startDate));
    }

    const calendar = yield* Database.add(Calendar.make({ name: 'Fieldstone' }));
    const feed = calendar.feed.target;
    if (!feed) {
      return yield* Effect.fail(new SampleSpace.SampleSpaceError({ context: { reason: 'calendar-feed-missing' } }));
    }
    const all = Object.values(events)
      .flat()
      .sort((left, right) => left.startDate.localeCompare(right.startDate));
    yield* SampleSpace.appendToFeed(feed, all);

    return { calendar, events };
  });
