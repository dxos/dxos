//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import {
  type Entity,
  type Extension,
  type LighthouseClient,
  type RatingState,
  type Session,
  type TrajectoryEvent,
} from '#client';

import { type RatingModel } from '../model/rating.ts';
import { explainFixture } from './explain-fixture.ts';
import { graphFixture, nodeFactsFixture } from './graph-fixture.ts';
import { issuesFixture, pluginsFixture, predicatesFixture, storageFixture } from './meta-fixture.ts';
import { FUEGO_CHILD, fuegoDishes } from './research-fixture.ts';

/** The URL scheme the fixture client answers; a story's connection points at it. */
export const FIXTURE_URL = 'fixture://lighthouse';

export const RUN = 'web-20261028-120000';

const cafe = (
  slug: string,
  name: string,
  props: Record<string, Array<string | number | boolean>>,
  seen: number[],
): Entity => ({
  id: `https://example.com/cafes/${slug}`,
  types: ['schema:CafeOrCoffeeShop'],
  props: { 'schema:name': [name], 'schema:url': [`https://example.com/cafes/${slug}`], ...props },
  seen,
});

/** Board game cafés in Bangkok, as a Quick session would extract them. */
export const meeple = cafe(
  'meeple-bangkok',
  'Meeple Bangkok',
  {
    'lh:gameCount': [1200],
    'lh:ratingValue': [4.7],
    'lh:reviewCount': [812],
    'schema:addressLocality': ['Sukhumvit'],
    'lh:amenity': ['game library', 'teachers', 'food'],
    'schema:image': ['https://picsum.photos/seed/meeple/640/480'],
    'schema:description': ['Two floors of tables and a game master on every shift.'],
  },
  [6],
);

export const dice = cafe(
  'dice-and-dine',
  'Dice & Dine',
  {
    'lh:gameCount': [650],
    'lh:ratingValue': [4.4],
    'lh:reviewCount': [301],
    'schema:addressLocality': ['Ari'],
    'lh:amenity': ['game library', 'craft beer'],
    'schema:image': ['https://picsum.photos/seed/dice/640/420'],
  },
  [6],
);

export const tabletop = cafe(
  'the-tabletop',
  'The Tabletop',
  {
    'lh:gameCount': [400],
    'lh:ratingValue': [4.6],
    'lh:reviewCount': [190],
    'schema:addressLocality': ['Silom'],
    'schema:image': ['https://picsum.photos/seed/tabletop/640/520'],
  },
  [9],
);

export const brick = cafe(
  'brick-and-board',
  'Brick & Board',
  {
    'lh:gameCount': [250],
    'lh:ratingValue': [4.1],
    'lh:reviewCount': [87],
    'schema:addressLocality': ['Thonglor'],
  },
  [9],
);

export const pawn = cafe(
  'pawn-shop',
  'Pawn Shop Games',
  {
    'lh:gameCount': [900],
    'lh:ratingValue': [4.2],
    'lh:reviewCount': [140],
    'schema:addressLocality': ['Phra Khanong'],
    'schema:image': ['https://picsum.photos/seed/pawn/640/460'],
  },
  [9],
);

export const entities: Entity[] = [meeple, dice, tabletop, brick, pawn];

export const extensionNode: Entity = {
  id: `${meeple.id}#ext-booking`,
  types: ['lh:ExtensionNode'],
  props: {
    'lh:bookingHow': ['Book a table on LINE @meeplebkk; walk-ins on weekdays.'],
    'lh:bookingDeposit': ['None'],
    'lh:bookingGroupSize': ['Up to 12'],
  },
};

export const extensions: Extension[] = [
  {
    id: 'booking',
    label: 'Booking',
    description: 'How to book: reservations, walk-ins, deposits, minimum group size.',
    appliesTo: ['schema:CafeOrCoffeeShop'],
    fields: ['how', 'deposit', 'groupSize'],
  },
  {
    id: 'menu',
    label: 'Menu',
    description: 'What it serves, with prices.',
    appliesTo: ['schema:CafeOrCoffeeShop'],
    fields: ['highlights', 'priceRange'],
    research: {
      item: 'dish',
      items: 'dishes',
      link: 'lh:menuItem',
      class: 'schema:MenuItem',
      fields: {
        name: 'schema:name',
        price: 'lh:price',
        currency: 'lh:currency',
        section: 'lh:menuSection',
        description: 'schema:description',
      },
      budget: { minutes: 6, usd: 0.06, pages: 14 },
    },
  },
];

export const ratingModel: RatingModel = {
  version: 2,
  rationale: 'A big game library matters most; then how well it is reviewed.',
  terms: [
    { id: 'library', label: 'Game library', weight: 3, value: { prop: 'lh:gameCount' }, shape: 'higher' },
    { id: 'rating', label: 'Rating', weight: 2, value: { prop: 'lh:ratingValue' }, shape: 'higher' },
    { id: 'reviews', label: 'Reviews', weight: 1, value: { prop: 'lh:reviewCount' }, shape: 'higher', missing: 0.5 },
  ],
};

export const rating: RatingState = { model: ratingModel, feedback: { [dice.id]: 'up' } };

export const GOAL = 'Board game cafés in Bangkok with a big game library';

export const session = (status: Session['status'] = 'reported'): Session => ({
  run: RUN,
  goal: GOAL,
  status,
  busy: status === 'running',
  budget: { minutes: 5, usd: 0.2, pages: 15 },
  spent: { seconds: 212, usd: 0.041, pages: 11 },
  model: 'cloudflare-workers-ai/@cf/deepseek-ai/deepseek-v4.1-flash',
  ...(status === 'reported'
    ? {
        report: {
          answer: 'Meeple Bangkok has the largest library; Pawn Shop Games is a close second.',
          picks: [
            {
              title: 'Meeple Bangkok',
              subject: meeple.id,
              url: meeple.id,
              why: 'About 1,200 games and teachers on every shift.',
            },
            {
              title: 'Pawn Shop Games',
              subject: pawn.id,
              url: pawn.id,
              why: '900 games; quieter, east of the centre.',
            },
          ],
          gaps: 'Opening hours were not on every page.',
        },
      }
    : {}),
});

const at = (seconds: number) => new Date(Date.UTC(2026, 9, 28, 12, 0, seconds)).toISOString();

export const events: TrajectoryEvent[] = [
  { seq: 1, t: at(0), kind: 'input', data: { text: GOAL, from: 'composer' } },
  {
    seq: 4,
    t: at(4),
    kind: 'decide',
    data: {
      stopReason: 'toolUse',
      text: 'Searching Google Maps for board game cafés.',
      calls: [{ tool: 'search', args: { engine: 'google-maps', params: { q: 'board game cafe Bangkok' } } }],
    },
  },
  { seq: 6, t: at(9), kind: 'extract', data: { extractor: 'google.maps.search@1.2.0' } },
  { seq: 7, t: at(10), kind: 'act', data: { tool: 'search', ok: true, output: '{"results":12}' } },
  {
    seq: 8,
    t: at(12),
    kind: 'decide',
    data: {
      stopReason: 'toolUse',
      text: 'Opening the cafés with the most games.',
      calls: [{ tool: 'browse', args: { urls: [tabletop.id, brick.id, pawn.id] } }],
    },
  },
  { seq: 9, t: at(30), kind: 'extract', data: { extractor: 'schema.org@2.0.0' } },
  { seq: 10, t: at(31), kind: 'act', data: { tool: 'browse', ok: true, output: '{"pages":3}' } },
  {
    seq: 11,
    t: at(40),
    kind: 'decide',
    data: { stopReason: 'toolUse', text: '', calls: [{ tool: 'report', args: session('reported').report }] },
  },
];

/** A whole session as its stream's first event carries it. */
export const snapshot = (status: Session['status'] = 'reported') => ({
  session: session(status),
  events: status === 'reported' ? events : events.slice(0, 4),
  results: status === 'reported' ? [...entities, extensionNode] : entities.slice(0, 2),
  rating: status === 'reported' ? rating : { feedback: {} },
});

/** A client that answers from the fixtures above; its stream sends one snapshot and stays open. */
export const makeFixtureClient = (status: Session['status'] = 'reported'): LighthouseClient => ({
  endpoint: { url: FIXTURE_URL },
  status: () => Effect.succeed({ version: 'v1', workspace: 'fixture' }),
  listEngines: () =>
    Effect.succeed([
      { id: 'google-maps', plugin: 'www.google.com' },
      { id: 'google', plugin: 'www.google.com' },
      { id: 'duckduckgo', plugin: 'duckduckgo.com' },
      { id: 'bing', plugin: 'www.bing.com' },
    ]),
  listExtensions: () => Effect.succeed(extensions),
  createSession: () => Effect.succeed({ run: RUN }),
  getSession: (run) => Effect.succeed(run === FUEGO_CHILD.run ? FUEGO_CHILD : session(status)),
  listSessions: () => Effect.succeed([session(status), FUEGO_CHILD]),
  listResults: (run) => Effect.succeed(run === FUEGO_CHILD.run ? fuegoDishes : []),
  sendMessage: () => Effect.void,
  stopSession: () => Effect.void,
  sendFeedback: () => Effect.void,
  setOverrides: () => Effect.void,
  getView: () => Effect.succeed({}),
  setView: (_run, view) => Effect.succeed(view),
  getBlob: () => Effect.succeed(new Blob()),
  extend: () => Effect.succeed({}),
  getEntity: (iri) =>
    Effect.succeed(
      entities
        .filter((entity) => entity.id === iri)
        .map((entity) => ({
          ...entity,
          provenance: [{ extractor: 'google.maps.search@1.2.0', source: 'https://www.google.com/maps', at: at(9) }],
        }))[0],
    ),
  getGraph: () => Effect.succeed(graphFixture),
  getGraphNode: (iri) => Effect.succeed(nodeFactsFixture(iri)),
  explain: () => Effect.succeed(explainFixture),
  listPlugins: () => Effect.succeed(pluginsFixture),
  listPredicates: () => Effect.succeed(predicatesFixture),
  listIssues: () => Effect.succeed(issuesFixture),
  commentIssue: (id) => Effect.succeed(issuesFixture.find((issue) => issue.id === id)),
  setIssueStatus: (id) => Effect.succeed(issuesFixture.find((issue) => issue.id === id)),
  getStorage: () => Effect.succeed(storageFixture),
  clearCache: () => Effect.succeed(storageFixture),
  pruneSnapshots: () => Effect.succeed(storageFixture),
  streamSession: (_run, onUpdate) =>
    Effect.sync(() => {
      onUpdate({ type: 'connection', connected: true });
      onUpdate({ type: 'snapshot', snapshot: snapshot(status) });
    }).pipe(Effect.andThen(Effect.never)),
});
