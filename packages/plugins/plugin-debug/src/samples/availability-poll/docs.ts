//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, EID, type Obj } from '@dxos/echo';
import * as Architecture from '@dxos/plugin-canvas/Architecture';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';

import { DIAGRAM_COMMANDS, DIAGRAM_NAMES, type DiagramKey } from './diagrams.ts';

//
// The design behind the spec: how time is stored and shown, why each poll is its own Durable Object, and how the
// flight search the reader builds last talks to Duffel. Each drawing is embedded in the document it explains.
//

const embed = (label: string, object: Obj.Unknown) => `![${label}](${EID.make({ entityId: object.id })})`;

const ZONES_MD = `# Time zones and DST

Every slot is stored as a UTC instant. Nothing else in the poll has a time zone: the organizer's zone is only how a
slot plan is read, and each respondent's zone is only how the grid is drawn and how their ranges are read. Counting who
is free for a slot is then a comparison of instants, and it cannot be wrong by an hour.

## From a plan to instants

A slot plan is dates and hours on the organizer's wall clock. For each date and hour, find the instant whose local
time in the poll's zone is that date and hour:

1. Guess the instant as if the zone were UTC.
2. Ask \`Intl.DateTimeFormat\` with \`timeZone\` what local time that guess is, and take the difference as the offset.
3. Subtract the offset and check again. Two rounds settle every real zone.

The offset is found for each slot on its own date. A poll that applies one offset to all its slots is right until
the first clock change inside it, and then every later slot is an hour out.

## The hour that is skipped and the hour that repeats

- When clocks go forward, one local hour does not exist (02:00 on 2026-03-08 in New York). A plan that names it makes no
  slot: inventing 03:00 would put two slots in one hour.
- When clocks go back, one local hour happens twice (01:00 on 2026-11-01 in New York). A plan that names it takes the
  first, 05:00Z, so the slot is the one people mean when they say "one o'clock".

## The scenario that pins it down

T-2 in the spec spans both changes that autumn: London on 25 October, New York on 1 November. So the gap between
London and New York is four hours on the Friday and five on the Monday, and Tokyo, which has no summer time, moves
against both.

| Slot | UTC | New York | London | Tokyo | Free |
| ---- | --- | -------- | ------ | ----- | ---- |
| s1 | Fri 12:00 | 08:00 | 12:00 | 21:00 | 0 |
| s2 | Fri 13:00 | 09:00 | 13:00 | 22:00 | 1 |
| s3 | Fri 14:00 | 10:00 | 14:00 | 23:00 | 3 |
| s4 | Fri 15:00 | 11:00 | 15:00 | Sat 00:00 | 2 |
| s5 | Fri 16:00 | 12:00 | 16:00 | Sat 01:00 | 1 |
| s6 | Mon 13:00 | 08:00 | 13:00 | 22:00 | 0 |
| s7 | Mon 14:00 | 09:00 | 14:00 | 23:00 | 2 |
| s8 | Mon 15:00 | 10:00 | 15:00 | Tue 00:00 | 3 |
| s9 | Mon 16:00 | 11:00 | 16:00 | Tue 01:00 | 3 |
| s10 | Mon 17:00 | 12:00 | 17:00 | Tue 02:00 | 0 |

The best slot is s3. An implementation that reads Monday with Friday's offset puts s6 to s10 an hour early and gets
Monday's counts wrong, which is why the scenario states every one of them.
`;

const durableMd = (poll: Drawing.Drawing) => `# One Durable Object per poll

${embed('Poll architecture', poll)}

A poll is small, written by a handful of people and read by the same few. One Durable Object per poll gives it a
single writer without a database: requests to a poll run one at a time in its object, so two respondents saving at once
cannot lose each other's marks.

## Ids

The poll id is the object's id from \`newUniqueId()\`, as hex. It is unguessable, so the poll URL is the only way in,
and no index of polls exists to leak. \`idFromName\` would let anyone who guesses a name read the poll.

## Storage

The whole poll is one storage key: title, zone, slots and marks, keyed by name. A poll of 100 slots and 20 respondents is a
few kilobytes, so reading and writing it whole is simpler than a key per mark and just as fast. The SQLite-backed
storage class is the one a new account, and a temporary one, can create; it is declared in the Worker's migrations.

## Seeing other people's changes

The page asks for the poll every few seconds. A WebSocket would be quicker, but a five-second refresh meets the spec
and keeps the object free of open connections.

## Deploying without an account

\`wrangler deploy --temporary\` makes a Cloudflare account that lasts about an hour. Redeploying from the same
sandbox keeps the account and the URL. A demo that runs past the hour deploys again and gets a new URL; polls made on
the old one are gone with it.
`;

const duffelMd = (flights: Drawing.Drawing) => `# Flight search with Duffel

${embed('Flight options architecture', flights)}

Flight options are the last milestone and are not built yet. This is how the Worker should talk to Duffel when they
are.

## The request

One offer request per traveler: \`POST https://api.duffel.com/air/offer_requests?return_offers=true\`, with
\`Duffel-Version: v2\` and the token as a bearer. One slice per departure date in the trip's window, one adult, the
trip's cabin class and \`max_connections\`. Duffel answers with offers inline.

## The limits

Duffel filters by cabin and connections. Price and arrival time are filtered in the Worker:

- \`total_amount\` against the trip's \`maxPrice\`, in its currency;
- the last segment's \`arriving_at\` against the best slot's start, less \`arriveBefore\` minutes.

\`arriving_at\` is the local time at the airport with no offset. Read it in the destination airport's \`time_zone\`,
the same conversion the poll does for its own slots, or an arrival on the day of a clock change is an hour out.

## The token

The token is the Worker secret \`DUFFEL_ACCESS_TOKEN\` (\`wrangler secret put\`). It never reaches the page: the
browser asks the Worker, and the Worker asks Duffel. A test-mode token (\`duffel_test_…\`) returns Duffel Airways
offers and books nothing, which is enough to build and check every requirement.

## Caching and expiry

Each search is cached in the poll's Durable Object for 15 minutes, so a page that refreshes every few seconds does
not search every few seconds. Every offer carries \`expires_at\`; an expired one is dropped before it is shown, and a
pick of one that has expired is kept but marked as gone.
`;

export type DocKey = 'zones' | 'durable' | 'duffel';

export type DocsResult = {
  docs: Record<DocKey, Markdown.Document>;
  drawings: Record<DiagramKey, Drawing.Drawing>;
};

/** The three design documents and the two drawings they embed. Spec: `CONTENT.md` § Design. */
export const DocsPartial: SampleSpace.Partial<DocsResult> = SampleSpace.partial('docs', {
  schemas: [Markdown.Document, ...Architecture.canvasDrawingSchemas],
  run: () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const drawing = (key: DiagramKey) =>
        Architecture.addCanvasDrawing(db, { name: DIAGRAM_NAMES[key], commands: DIAGRAM_COMMANDS[key] });
      const drawings = { poll: drawing('poll'), flights: drawing('flights') };
      const doc = (name: string, content: string) => Database.add(Markdown.make({ name, content }));
      const docs = {
        zones: yield* doc('Time zones and DST', ZONES_MD),
        durable: yield* doc('One Durable Object per poll', durableMd(drawings.poll)),
        duffel: yield* doc('Flight search with Duffel', duffelMd(drawings.flights)),
      };
      return { docs, drawings };
    }),
});
