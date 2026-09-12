//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import * as Project from '@dxos/compute/Project';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';
import * as ProjectSkill from '@dxos/plugin-projects/ProjectSkill';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as TablePlugin from '@dxos/plugin-table/TablePlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { Table } from '@dxos/react-ui-table/types';
import { trim } from '@dxos/util';

import { findObject } from '../assertions.ts';
import { createEvalRunner } from '../runner.ts';
import * as Scorer from '../Scorer.ts';
import { getDefaultSkills } from '../skills.ts';

// The sender-ledger routine's headless task, run through the same RunInstructions path a
// feed-triggered routine uses. The input batches two messages from the SAME sender so one run also
// exercises the dedupe instruction: a correct run yields exactly one ledger table, filed exactly
// once into the project's artifacts, holding exactly one row for that sender.
// TODO(burdon): Authored without a live run (no DX_ANTHROPIC_API_KEY in the authoring session) —
// verify live before trusting pass rates.

const PROJECT_NAME = 'Inbox Research';
const SENDER_EMAIL = 'alice@example.com';

/** Mirrors the inbox-research template's routine instructions, adapted for a batched eval input. */
const INSTRUCTIONS = trim`
  You maintain the "${PROJECT_NAME}" project (its reference is bound into this chat).
  The <input> block below contains new email messages from the project's mailbox. Process each
  message in turn, as if it arrived on its own.

  Maintain the project's "Sender Ledger" table: one row per sender, with columns email, name,
  count, and lastSeen.
  - List the project's artifacts to find the Sender Ledger table. If it does not exist, create it
    and file it into the project's artifacts.
  - For each message, upsert the sender's row: create it if missing, otherwise increment count and
    update lastSeen from the message date. Never create a second row — or a second table — for a
    sender that already has one.
`;

const MESSAGES = [
  {
    from: { email: SENDER_EMAIL, name: 'Alice Example' },
    date: '2026-07-01T10:00:00.000Z',
    subject: 'Kickoff',
    body: 'Looking forward to the kickoff.',
  },
  {
    from: { email: SENDER_EMAIL, name: 'Alice Example' },
    date: '2026-07-02T09:30:00.000Z',
    subject: 'Re: Kickoff',
    body: 'Attaching the agenda.',
  },
];

/** Entity id underlying a ref or object URI, so space-qualified and local URIs compare equal. */
const entityId = (uri: string): string => {
  const eid = EID.tryParse(uri);
  return (eid && EID.getEntityId(eid)) ?? uri;
};

/** The ledger tables in the space, and how many of them the project filed as artifacts. */
const ledgerTables = Scorer.shared(
  Effect.gen(function* () {
    const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
    const tables = yield* Database.query(Filter.type(Table.Table)).run;
    if (!project) {
      return { tableCount: tables.length, filedCount: 0 };
    }
    const tableIds = new Set(tables.map((table) => entityId(Obj.getURI(table))));
    return {
      tableCount: tables.length,
      filedCount: project.artifacts.filter((ref) => tableIds.has(entityId(ref.uri))).length,
    };
  }),
);

/**
 * The sender's rows, schema-agnostic: table rows are objects of a table-owned dynamic schema, so
 * every object carrying the sender's email is a candidate and its count/lastSeen are read as
 * properties. Exactly one such row proves the upsert deduped.
 */
const senderRows = Scorer.shared(
  Effect.gen(function* () {
    const everything = yield* Database.query(Query.select(Filter.everything())).run;
    return everything.filter(
      (candidate): candidate is Obj.Unknown & { count?: unknown; lastSeen?: unknown } =>
        Obj.isObject(candidate) &&
        !Obj.instanceOf(Table.Table, candidate) &&
        Object.values(Obj.getSnapshot(candidate)).includes(SENDER_EMAIL),
    );
  }),
);

const SCORERS = [
  Scorer.make({
    name: 'ledger-created',
    description: 'At least one Table exists after the run.',
    score: ledgerTables.pipe(Effect.map(({ tableCount }) => tableCount > 0)),
  }),
  Scorer.make({
    name: 'ledger-filed',
    description: "The ledger table is in the project's artifacts.",
    score: ledgerTables.pipe(Effect.map(({ filedCount }) => filedCount > 0)),
  }),
  Scorer.make({
    name: 'ledger-deduped',
    description: 'Exactly one table exists and it is filed exactly once (no duplicate ledger).',
    score: ledgerTables.pipe(Effect.map(({ tableCount, filedCount }) => tableCount === 1 && filedCount === 1)),
  }),
  Scorer.make({
    name: 'row-upserted',
    description: 'Exactly one sender row exists, with count 2 and lastSeen from the later message.',
    score: senderRows.pipe(
      Effect.map((rows) => {
        const [row] = rows;
        const count = typeof row?.count === 'string' ? Number(row.count) : row?.count;
        return rows.length === 1 && count === MESSAGES.length && String(row?.lastSeen ?? '').startsWith('2026-07-02');
      }),
    ),
  }),
];

const task = createEvalRunner({
  instructions: INSTRUCTIONS,
  input: Schema.Unknown,
  output: Schema.Unknown,
  skills: [...getDefaultSkills(), Ref.make(ProjectSkill.make())],
  // The skill's project and task operations resolve to these plugins' handlers.
  plugins: [ProjectsPlugin.make(), TasksPlugin.make(), TablePlugin.make()],
  types: [Project.Project, Table.Table],
  // Multi-tool scenario (create table + file + upserts), so allow more round-trips.
  timeout: 150_000,
  seed: ({ instructions }) =>
    Effect.gen(function* () {
      const project = yield* Database.add(Project.make({ name: PROJECT_NAME, instructions: Ref.make(instructions) }));
      yield* Database.flush();
      return { objects: [Ref.make(project)] };
    }),
  scored: true,
});

// Skipped: `table.create` fails headless with `Invalid draft for org.dxos.type.table: view: Missing
// key` (and `org.dxos.type.view: query.ast: Missing key`) on every attempt, so the routine can never
// file its table. Unskip once table creation works under the eval harness.
evalite.skip('Projects — sender-ledger routine maintains one filed table', {
  data: [{ input: { messages: MESSAGES } }],
  task,
  scorers: Scorer.toEvalite(SCORERS),
});
