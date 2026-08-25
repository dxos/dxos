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
import * as TablePlugin from '@dxos/plugin-table/TablePlugin';
import { Table } from '@dxos/react-ui-table/types';
import { trim } from '@dxos/util';

import { findObject } from '../assertions';
import { createEvalRunner } from '../runner';
import { getDefaultSkills } from '../skills';

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

const task = createEvalRunner({
  instructions: INSTRUCTIONS,
  input: Schema.Unknown,
  output: Schema.Unknown,
  skills: [...getDefaultSkills(), Ref.make(ProjectSkill.make())],
  plugins: [TablePlugin.make()],
  types: [Project.Project, Table.Table],
  // Multi-tool scenario (create table + file + upserts), so allow more round-trips.
  timeout: 150_000,
  seed: ({ instructions }) =>
    Effect.gen(function* () {
      const project = yield* Database.add(Project.make({ name: PROJECT_NAME, instructions: Ref.make(instructions) }));
      yield* Database.flush();
      return { objects: [Ref.make(project)] };
    }),
  dbQuery: () =>
    Effect.gen(function* () {
      const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
      const tables = yield* Database.query(Filter.type(Table.Table)).run;

      // Row-level assertion, schema-agnostic (table rows are objects of a table-owned dynamic
      // schema): scan every object carrying the sender's email and read its count/lastSeen
      // properties. Exactly one such row with count 2 proves the upsert deduped.
      const everything = yield* Database.query(Query.select(Filter.everything())).run;
      const senderRows = everything.filter(
        (candidate): candidate is Obj.Unknown & { count?: unknown; lastSeen?: unknown } =>
          Obj.isObject(candidate) &&
          !Obj.instanceOf(Table.Table, candidate) &&
          Object.values(Obj.getSnapshot(candidate)).includes(SENDER_EMAIL),
      );
      const [row] = senderRows;
      const rowCount = typeof row?.count === 'string' ? Number(row.count) : row?.count;
      const rowUpserted =
        senderRows.length === 1 && rowCount === MESSAGES.length && String(row?.lastSeen ?? '').startsWith('2026-07-02');

      if (!project) {
        return { tableCount: tables.length, filedCount: 0, senderRowCount: senderRows.length, rowUpserted };
      }
      const tableIds = new Set(tables.map((table) => entityId(Obj.getURI(table))));
      const filedCount = project.artifacts.filter((ref) => tableIds.has(entityId(ref.uri))).length;
      return { tableCount: tables.length, filedCount, senderRowCount: senderRows.length, rowUpserted };
    }),
});

evalite('Projects — sender-ledger routine maintains one filed table', {
  data: [{ input: { messages: MESSAGES } }],
  task,
  scorers: [
    {
      name: 'ledger-created',
      description: 'At least one Table exists after the run.',
      scorer: ({ output }) => (output.dbQuery.tableCount > 0 ? 1 : 0),
    },
    {
      name: 'ledger-filed',
      description: "The ledger table is in the project's artifacts.",
      scorer: ({ output }) => (output.dbQuery.filedCount > 0 ? 1 : 0),
    },
    {
      name: 'ledger-deduped',
      description: 'Exactly one table exists and it is filed exactly once (no duplicate ledger).',
      scorer: ({ output }) => (output.dbQuery.tableCount === 1 && output.dbQuery.filedCount === 1 ? 1 : 0),
    },
    {
      name: 'row-upserted',
      description: 'Exactly one sender row exists, with count 2 and lastSeen from the later message.',
      scorer: ({ output }) => (output.dbQuery.rowUpserted ? 1 : 0),
    },
  ],
});
