//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Obj } from '@dxos/echo';
import * as Calendar from '@dxos/plugin-inbox/Calendar';
import { Event } from '@dxos/types';

import { HANA_JOINED_DAYS_AGO, type PersonKey } from '../team/index.ts';
import { type Make, personActor } from '../util.ts';
import { EVENT_NOTES, eventNoteKey } from './event-notes.ts';
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
  | 'halcyonIntro'
  | 'kestrelDiscovery'
  | 'vantageDiscovery'
  | 'meridianProposal'
  | 'tidewaterSecurity'
  | 'tidewaterMsa'
  | 'lumenValidation'
  | 'pallasDemo'
  | 'corvidEvaluation'
  | 'larkspurDemo'
  | 'aldermoorReview'
  | 'cloudflareCall'
  | 'northpineQbr'
  | 'offsite'
  | 'salesReview';

export type Events = Record<EventKey, Event.Event[]>;

type Who = keyof Directory;

// No meeting has more than 5 attendees, so each series invites the people it is for, not the whole team.
/** Engineering leads and product, who run the weekly sync. */
const TEAM_SYNC: PersonKey[] = ['astrid', 'omar', 'june', 'anika', 'lucia'];
/** The engineers who plan sprints. */
const ENGINEERING: PersonKey[] = ['astrid', 'omar', 'felix', 'june', 'tomas'];
/** The cache team, who shipped the 1.8 work the retros look back on. */
const RETRO: PersonKey[] = ['astrid', 'omar', 'felix', 'hana', 'anika'];
/** Product, design, developer relations and billing. */
const PRODUCT: PersonKey[] = ['astrid', 'lucia', 'ben', 'kofi', 'june'];
/** Release owners: the cache engineers, SRE and developer relations for the announcement. */
const RELEASE: PersonKey[] = ['astrid', 'omar', 'felix', 'anika', 'kofi'];

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
/** Nothing is scheduled more than three months ahead. */
const LAST = 90;
/** The team sync continues only this far past the reference date, so the future reads as a light schedule. */
const SERIES_LAST = 14;

/** Occurrences on or before `last`. */
const until = (offsets: number[], last: number): number[] => offsets.filter((offset) => offset <= last);

/** Enough weekly occurrences from {@link FIRST} to reach {@link LAST}. */
const WEEKS = Math.ceil((LAST - FIRST) / 7) + 1;
/** Enough monthly occurrences from {@link FIRST} to reach {@link LAST}. */
const MONTHS = Math.ceil((LAST - FIRST) / 30) + 1;

type Timed = {
  readonly title: string;
  readonly description?: string;
  readonly attendees: ReadonlyArray<Who>;
  readonly time: readonly [number, number];
  readonly minutes: number;
};

/**
 * Astrid's calendar, dense for six months back and light for three months ahead. `Event` has no recurrence, so each series
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
  "Incident review: last week's pages and the noisy alerts to fix.",
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
  "Cache hit rate on their Bazel monorepo; next quarter's plans.",
];

/** Notes for Hana's first 1:1, the only one before the reference date. */
const HANA_NOTES = ['First week: laptop, accounts, the cache-engine walkthrough with Omar.'];

/**
 * The half-year sales review's agenda, which links the pipeline board by its id so the reader opens it from the event.
 */
const salesReviewNotes = (pipelineId: string) =>
  [
    '## Sales Review',
    '',
    `Walk the [Sales pipeline](echo:///${pipelineId}) column by column, oldest movement first.`,
    '',
    '## Attendees',
    '',
    '- Astrid Holm (chair)',
    '- Kofi Mensah',
    '- Lucía Ferreira',
    '- June Okonkwo',
    '',
    '## Pre-read: where each deal stands',
    '',
    '- **Lead:** Halcyon Freight and Kestrel Energy both came in from the Bazel cache post; intro calls are booked.',
    '- **Qualified:** Vantage Aerospace needs US-only data residency; Corvid Analytics and Larkspur Media have evaluations scheduled.',
    '- **Demo:** Brightwater Games is two weeks into its trial and asking about seat pricing.',
    '- **Proposal:** Meridian Health Data and Aldermoor Bank have proposals out; Aldermoor wants customer-managed keys.',
    '- **Negotiation:** Northpine Robotics renewal hinges on the dedicated region; Tidewater Insurance is in MSA redlines.',
    '- **Closed:** Okapi Payments and Lumen Biotech are live; Pallas Retail chose a self-hosted cache.',
    '',
    '## To decide',
    '',
    '- Whether to hold list price for Tidewater and offer a 12-month term instead of a discount.',
    '- Whether EU-only data and customer-managed keys become one Enterprise add-on, priced once.',
    '',
    '## Prep',
    '',
    '- [ ] Kofi: send Vantage the US-region architecture note before the deep dive.',
    '- [ ] June: draft the Enterprise add-on pricing for Aldermoor and Meridian.',
    '- [ ] Lucía: write up why Pallas went self-hosted for the 1.9 roadmap review.',
    '- [ ] Astrid: confirm the Northpine dedicated-region date with Anika.',
    '- [x] Kofi: move Larkspur from Demo to Qualified until the demo happens.',
  ].join('\n');

export const makeCalendar = (
  people: Directory,
  pipeline?: Obj.Unknown,
): Make<{ readonly calendar: Calendar.Calendar; readonly events: Events }> =>
  Effect.gen(function* () {
    const clock: Clock = yield* SampleSpace.Clock;
    const owner = personActor(people.astrid);
    const attendeesOf = (keys: ReadonlyArray<Who>) => keys.map((key) => personActor(people[key]));

    const timed = (offset: number, event: Timed) => {
      const startDate = at(clock, offset, event.time[0], event.time[1]);
      return Event.make({
        title: event.title,
        description: EVENT_NOTES[eventNoteKey(event.title, offset)] ?? event.description,
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
        until(weekly(clock, { weekday: 1, from: FIRST, count: WEEKS }), SERIES_LAST),
        { title: 'Team sync', attendees: TEAM_SYNC, time: [10, 0], minutes: 30 },
        TEAM_SYNC_NOTES,
      ),
      sprintPlanning: rotating(
        until(weekly(clock, { weekday: 2, from: FIRST, count: WEEKS, everyWeeks: 2 }), 0),
        { title: 'Sprint planning', attendees: ENGINEERING, time: [14, 0], minutes: 60 },
        SPRINT_NOTES,
      ),
      retro: rotating(
        until(weekly(clock, { weekday: 5, from: FIRST, count: WEEKS, everyWeeks: 2 }), 0),
        { title: 'Retro', attendees: RETRO, time: [14, 0], minutes: 45 },
        RETRO_NOTES,
      ),
      // Only this week's handoff is booked ahead.
      oncall: until(weekly(clock, { weekday: 5, from: FIRST, count: WEEKS }), 7).map((offset, week) => {
        const incoming = ROTATION[week % ROTATION.length];
        return timed(offset, {
          title: 'On-call handoff',
          attendees: ['anika', incoming],
          time: [15, 0],
          minutes: 30,
        });
      }),
      productReview: rotating(
        until(monthly(clock, { from: -170, count: MONTHS }), 0),
        { title: 'Product review', attendees: PRODUCT, time: [15, 0], minutes: 60 },
        PRODUCT_REVIEW_NOTES,
      ),
      northpineSync: rotating(
        until(monthly(clock, { from: -165, count: MONTHS }), 0),
        { title: 'Northpine sync', attendees: ['grace', 'marcus', 'astrid', 'june'], time: [16, 0], minutes: 45 },
        NORTHPINE_NOTES,
      ),
      oneOnOne: REPORTS.flatMap(({ key, time }, index) => {
        const from = key === 'hana' ? -HANA_JOINED_DAYS_AGO : FIRST + 2 + index * 3;
        // Only Hana's first months carry notes: a ramp-up plan worth writing down.
        return until(monthly(clock, { from, count: MONTHS }), 0).map((offset, index) =>
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
          attendees: RELEASE,
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
      salesReview: pipeline
        ? [
            // Thursday of next week, the quietest weekday on the coming week's calendar.
            timed(8, {
              title: 'Sales Review',
              description: salesReviewNotes(pipeline.id),
              attendees: ['astrid', 'kofi', 'lucia', 'june'],
              time: [11, 0],
              minutes: 45,
            }),
          ]
        : [],
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
          attendees: ['astrid', 'omar', 'felix', 'kofi', 'sofia'],
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
      halcyonIntro: [
        timed(6, {
          title: 'Halcyon Freight intro call',
          description: `From the thread "Cairn for Halcyon Freight's Android builds": read a clean Gradle build scan.`,
          attendees: ['priya', 'kofi', 'astrid'],
          time: [14, 0],
          minutes: 30,
        }),
      ],
      corvidEvaluation: [
        timed(8, {
          title: 'Corvid Analytics technical evaluation',
          description:
            'From the thread "Corvid Analytics: Pants remote cache evaluation": two weeks of CI timings, expected hit rates.',
          attendees: ['daniel', 'kofi', 'astrid'],
          time: [15, 0],
          minutes: 60,
        }),
      ],
      larkspurDemo: [
        timed(12, {
          title: 'Larkspur Media demo',
          description: 'From the thread "Nx remote cache demo for Larkspur Media": cold and warm builds on their fork.',
          attendees: ['yuki', 'kofi', 'lucia'],
          time: [17, 0],
          minutes: 45,
        }),
      ],
      aldermoorReview: [
        timed(-19, {
          title: 'Aldermoor Bank proposal review',
          description:
            'From the thread "Aldermoor Bank: Enterprise proposal": procurement questions on EU residency and customer-managed keys.',
          attendees: ['henrik', 'lucia', 'astrid'],
          time: [10, 0],
          minutes: 45,
        }),
      ],
      kestrelDiscovery: [
        timed(9, {
          title: 'Kestrel Energy discovery call',
          description: 'From the thread "Remote cache for a Bazel monorepo at Kestrel": two build event logs, sizing.',
          attendees: ['owen', 'kofi', 'lucia'],
          time: [16, 0],
          minutes: 45,
        }),
      ],
      vantageDiscovery: [
        timed(-15, {
          title: 'Vantage Aerospace discovery',
          description:
            'From the thread "Vantage Aerospace: notes from discovery": build volume, budget and decision process.',
          attendees: ['claire', 'astrid', 'lucia'],
          time: [17, 0],
          minutes: 45,
        }),
      ],
      meridianProposal: [
        timed(7, {
          title: 'Meridian proposal review',
          description: 'From the thread "Meridian paid plan proposal": seat ramp to 90 and the SOC 2 clause.',
          attendees: ['aisha', 'kenji', 'lucia', 'astrid'],
          time: [15, 0],
          minutes: 45,
        }),
      ],
      tidewaterSecurity: [
        timed(-22, {
          title: 'Tidewater security review',
          description:
            'From the thread "Tidewater vendor security review": token revocation demo, breach notice, build logs.',
          attendees: ['rohan', 'anika', 'astrid'],
          time: [17, 0],
          minutes: 60,
        }),
      ],
      tidewaterMsa: [
        timed(1, {
          title: 'Tidewater MSA review',
          description: 'From the thread "Tidewater MSA redlines": liability cap, automatic uptime credits, signatures.',
          attendees: ['rohan', 'lucia', 'astrid'],
          time: [16, 0],
          minutes: 45,
        }),
      ],
      lumenValidation: [
        timed(-29, {
          title: 'Lumen Biotech validation results',
          description: 'From the thread "Lumen Biotech order form": warm-cache pipeline builds before signature.',
          attendees: ['tobias', 'kofi', 'omar', 'astrid'],
          time: [14, 0],
          minutes: 60,
        }),
      ],
      pallasDemo: [
        timed(-36, {
          title: 'Pallas Retail demo',
          description:
            'From the thread "Pallas Retail: decision on Cairn": demo on their monorepo, then data residency.',
          attendees: ['carmen', 'astrid', 'lucia'],
          time: [15, 0],
          minutes: 60,
        }),
      ],
      cloudflareCall: [
        // One call answers both threads: the Tuesday after the release is also the week after next.
        timed(6, {
          title: 'Cloudflare commit and architecture review',
          description:
            'From the threads "Cloudflare R2 egress pricing" and "Cloudflare credits and an annual commit": operation costs, then size the commit and the new region.',
          attendees: ['ines', 'elena', 'omar', 'felix', 'astrid'],
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
          attendees: ['astrid', 'lucia', 'ben', 'wren'],
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

    const calendar = yield* Database.add(Calendar.make({ name: 'Alien Labs' }));
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
