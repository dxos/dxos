//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Project from '@dxos/compute/Project';
import { Database, Ref, Type } from '@dxos/echo';
import * as ProjectSkill from '@dxos/plugin-projects/ProjectSkill';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { Milestone, Outline, Task, TaskSet } from '@dxos/types';

import { findObject } from '../assertions.ts';
import { runClaudeEval } from '../claude-harness.ts';
import * as McpCall from '../McpCall.ts';
import * as McpTarget from '../McpTarget.ts';
import * as Scorer from '../Scorer.ts';

//
// The contract half of the MCP eval: what the surface owes a caller, asked directly rather than
// through a model.
//
// The scored scenario next door (`mcp-server.eval.ts`) drives a real agent and grades what reached
// the database, which is the right shape for "can a client get work done here" and the wrong one for
// "is the answer it got correct". An agent picks its own arguments, so the call that would expose a
// defect may simply never be made; and where the defect is that a wrong answer arrives as a
// successful one — a search that widens instead of narrowing, a misspelled input silently becoming
// "list everything", a page capped without saying so — a turn that reads the result and reports
// success is exactly what the defect produces. Every dimension below therefore issues its own call
// with its own arguments and asserts the payload.
//
// The four faults reproduced at unit level in dxos#13264 are what the set is drawn from; these are
// the same faults one altitude up, where a caller actually meets them.
//

/** The project that carries the ledger; the other two exist to give a typename filter something to be wrong about. */
const LEDGER_PROJECT = 'Harbour';

const PROJECT_NAMES = [LEDGER_PROJECT, 'Jetty', 'Quay'] as const;

/**
 * Made-up tokens, so a phrase search cannot match by accident and the index cannot be credited for
 * a hit some other word earned.
 */
const ALPHA_TERM = 'alphaterm';
const BETA_TERM = 'betaterm';

/** One task carrying both terms, and one carrying each — the only shape that tells AND from OR. */
const BOTH_TERMS = `${LEDGER_PROJECT} ${ALPHA_TERM} ${BETA_TERM} rollout`;
const ALPHA_ONLY = `${LEDGER_PROJECT} ${ALPHA_TERM} rehearsal`;
const BETA_ONLY = `${LEDGER_PROJECT} ${BETA_TERM} rehearsal`;

/** Comfortably past the handler's default page, so a default-limited read is a capped one. */
const LEDGER_SIZE = 14;

/** The handler's own default limit, which is the page a caller gets without asking for one. */
const PAGE = 10;

/** A limit the whole ledger fits inside, so a full read is not itself a truncation. */
const WHOLE_LEDGER = LEDGER_SIZE + 1;

const FILLER = Array.from({ length: LEDGER_SIZE - 3 }, (_, index) => `${LEDGER_PROJECT} backlog item ${index + 1}`);

const LEDGER_TITLES = [BOTH_TERMS, ALPHA_ONLY, BETA_ONLY, ...FILLER];

const MILESTONE_NAME = 'Cutover';

/** The task the nullable-ref dimension re-files; a filler one, so no other dimension reads it. */
const MILESTONE_TARGET = FILLER[0];

const TASK_TYPENAME = Type.getTypename(Task.Task);
const PROJECT_TYPENAME = Type.getTypename(Project.Project);

const QUERY_OBJECTS = 'org.dxos.operation.space.queryObjects';
const GET_PROJECT = 'org.dxos.operation.projects.get';
const UPDATE_TASK = 'org.dxos.operation.tasks.update';

/**
 * The object id inside a row's address.
 *
 * A row states where it lives as a URI whose prefix is the addressing scheme's business, so the id
 * is taken as the last segment rather than by parsing a form this module would then have to track.
 */
const idOf = (dxn: string | undefined): string | undefined => dxn?.split(/[:/]/).filter(Boolean).pop();

/**
 * Whether a row is of the expected type.
 *
 * Tolerant of a version suffix, because what a filter must not do is return a DIFFERENT type — the
 * registration a typename resolves to is not this dimension's subject.
 */
const isType = (row: McpCall.Row, typename: string): boolean =>
  row.typename === typename || (row.typename ?? '').startsWith(`${typename}:`);

/** Whether the rows are exactly the objects with these labels, in any order. */
const labelledExactly = (outcome: McpCall.Outcome, labels: readonly string[]): boolean => {
  const found = McpCall.rows(outcome).map((row) => row.label ?? '');
  return found.length === labels.length && labels.every((label) => found.includes(label));
};

/** The milestone a task is filed under, read outside the surface that set it. */
const milestoneIdOf = (title: string) =>
  Effect.gen(function* () {
    const task = yield* findObject(Task.Task, (candidate) => candidate.title === title);
    if (!task?.milestone) {
      return undefined;
    }
    const milestone = yield* Database.load(task.milestone);
    return milestone.id;
  }).pipe(
    // A ref that will not load is the answer, not an error: the dimension is whether the write
    // landed, and a scenario that threw here would take the other six with it.
    Effect.catch(() => Effect.succeed(undefined)),
  );

/** What each dimension established; recorded by the scenario and read back by the scorers. */
type Held = {
  found: boolean;
  narrowed: boolean;
  rejected: boolean;
  reported: boolean;
  scoped: boolean;
  loadable: boolean;
  refSet: boolean;
};

const NOTHING_HELD: Held = {
  found: false,
  narrowed: false,
  rejected: false,
  reported: false,
  scoped: false,
  loadable: false,
  refSet: false,
};

const scorers = (held: Held): Scorer.Any[] => [
  Scorer.make({
    name: 'search-finds',
    description:
      'The control for the two search dimensions: a single-term search returns exactly the two ' +
      'tasks whose titles carry that term, so a narrowing result below cannot be an empty index.',
    score: Effect.succeed(held.found),
  }),
  Scorer.make({
    name: 'search-narrows',
    description:
      'A two-word search returns only the task carrying both words. OR-ing the terms returns a ' +
      'superset that still contains the right answer, which is why a scored turn passes on it.',
    score: Effect.succeed(held.narrowed),
  }),
  Scorer.make({
    name: 'unknown-input-rejected',
    description:
      'A misspelled input property is refused rather than dropped. Dropped, the filter is gone and ' +
      'the handler falls through to listing the whole space — returned as a success a caller ' +
      'cannot tell from a real result set.',
    score: Effect.succeed(held.rejected),
  }),
  Scorer.make({
    name: 'truncation-reported',
    description:
      'A page capped by the limit says so, and a read the whole ledger fits inside says it was ' +
      'not capped. This is the silent-partial class itself: a capped page read as the whole set.',
    score: Effect.succeed(held.reported),
  }),
  Scorer.make({
    name: 'listing-scoped-to-filter',
    description: 'A typename-filtered listing returns every object of that type and nothing of any other.',
    score: Effect.succeed(held.scoped),
  }),
  Scorer.make({
    name: 'listed-objects-loadable',
    description:
      'Every object a listing returned loads through a verb that takes it by reference. The read ' +
      'path and the write path resolve objects differently, so a listing can name one that no ' +
      'write verb will accept.',
    score: Effect.succeed(held.loadable),
  }),
  Scorer.make({
    name: 'ref-field-set',
    description:
      'A nullable reference field accepts a reference. Declared `optional(NullOr(Ref))` so a patch ' +
      'can clear it, such a field decodes `null` but not a reference: it can be cleared and never set.',
    score: Effect.succeed(held.refSet),
  }),
];

const UNSEEDED_DIMENSION = 'unknown-input-rejected';

/** The one dimension that needs no fixture, and therefore survives a space this process cannot seed. */
const unseededScorers = (rejected: boolean): Scorer.Any[] =>
  scorers({ ...NOTHING_HELD, rejected }).filter((scorer) => scorer.name === UNSEEDED_DIMENSION);

const TARGET = McpTarget.fromEnv();

/** Whether the run can seed the space it asks about (see {@link McpTarget.mode}). */
const SEEDED = McpTarget.mode(TARGET) !== 'token';

export const CONTRACT_NAME = `MCP server contract (${TARGET}) — the surface answers what it promises`;

/** Names and descriptions only; the marks come from the run, through `output.scores`. */
export const CONTRACT_SCORERS = SEEDED ? scorers(NOTHING_HELD) : unseededScorers(false);

/**
 * A space this process cannot see: the fixtures are not ours, so only the dimension that asserts a
 * refusal is still meaningful — a malformed call must be refused whatever the space holds.
 */
const unseededTask = () =>
  runClaudeEval({ skills: [], target: TARGET }, async ({ spaceId, call, score }) => {
    const session = await call();
    try {
      const misspelled = await session.invoke(QUERY_OBJECTS, { query: ALPHA_TERM, limit: PAGE }, spaceId);
      const scores = await score(unseededScorers(misspelled.isError));
      return {
        scores,
        calls: [{ label: 'unknown-input-rejected', isError: misspelled.isError, text: misspelled.text }],
      };
    } finally {
      await session.close();
    }
  });

const seededTask = () =>
  runClaudeEval(
    {
      target: TARGET,
      skills: [{ key: ProjectSkill.key, make: ProjectSkill.make, operations: ProjectSkill.operations }],
      plugins: [ProjectsPlugin.make(), TasksPlugin.make()],
      types: [Project.Project, Milestone.Milestone, Outline.Outline, Task.Task, TaskSet.TaskSet],
      // No agent turn is sent, so no tool is allowed: every call below is the eval's own client.
      allowedTools: [],
      seed: () =>
        Effect.gen(function* () {
          const milestone = yield* Database.add(Milestone.make({ name: MILESTONE_NAME }));
          const tasks = yield* Effect.forEach(LEDGER_TITLES, (title) =>
            Database.add(Task.make({ title, status: 'todo' })),
          );
          const taskSet = yield* Database.add(
            TaskSet.make({
              name: `${LEDGER_PROJECT} ledger`,
              tasks: tasks.map((entry) => Ref.make(entry)),
              // The milestone has to be the set's own: `tasks.update` refuses one that belongs to
              // another set, and the dimension would then pass its refusal off as the decode fault.
              milestones: [Ref.make(milestone)],
            }),
          );
          // Every project gets a task set of its own, added here: `Project.make` materializes one
          // for a project that arrives without, and a fixture whose objects were created as a side
          // effect is a fixture nothing in this file can state the contents of.
          yield* Effect.forEach(PROJECT_NAMES, (name) =>
            Effect.gen(function* () {
              const set =
                name === LEDGER_PROJECT
                  ? taskSet
                  : yield* Database.add(TaskSet.make({ name: `${name} ledger`, tasks: [], milestones: [] }));
              yield* Database.add(Project.make({ name, taskSet: Ref.make(set) }));
            }),
          );
        }),
    },
    async ({ spaceId, query, score, call }) => {
      const session = await call();
      try {
        // The control first: a single term must find both tasks carrying it. Without it a narrowing
        // result below is indistinguishable from an index that returns nothing at all.
        const single = await session.invoke(QUERY_OBJECTS, { text: ALPHA_TERM, limit: WHOLE_LEDGER }, spaceId);
        const found = !single.isError && labelledExactly(single, [BOTH_TERMS, ALPHA_ONLY]);

        // Adding a word must remove results, not add them.
        const phrase = await session.invoke(
          QUERY_OBJECTS,
          { text: `${ALPHA_TERM} ${BETA_TERM}`, limit: WHOLE_LEDGER },
          spaceId,
        );
        const narrowed = !phrase.isError && labelledExactly(phrase, [BOTH_TERMS]);

        // `query` rather than `text`, which is what the tool's own description calls the field — the
        // misspelling a caller actually makes, and the one that turns a search into "list everything".
        const misspelled = await session.invoke(QUERY_OBJECTS, { query: ALPHA_TERM, limit: WHOLE_LEDGER }, spaceId);
        const rejected = misspelled.isError;

        const capped = await session.invoke(QUERY_OBJECTS, { limit: PAGE }, spaceId);
        const ledger = await session.invoke(QUERY_OBJECTS, { typename: TASK_TYPENAME, limit: WHOLE_LEDGER }, spaceId);
        const reported =
          !capped.isError &&
          McpCall.rows(capped).length === PAGE &&
          capped.structured.truncated === true &&
          !ledger.isError &&
          McpCall.rows(ledger).length === LEDGER_SIZE &&
          // The negative case too: a flag that is always true reports nothing.
          ledger.structured.truncated === false;

        const projects = await session.invoke(
          QUERY_OBJECTS,
          { typename: PROJECT_TYPENAME, limit: WHOLE_LEDGER },
          spaceId,
        );
        const projectRows = McpCall.rows(projects);
        const scoped =
          !projects.isError &&
          projectRows.length === PROJECT_NAMES.length &&
          projectRows.every((row) => isType(row, PROJECT_TYPENAME)) &&
          !ledger.isError &&
          McpCall.rows(ledger).every((row) => isType(row, TASK_TYPENAME));

        // Each listed project loaded back through a verb that takes it by reference, addressed by
        // what the listing said rather than by what this process knows.
        const loads = await Promise.all(
          projectRows.map(async (row) => {
            const id = idOf(row.dxn);
            if (id === undefined) {
              return false;
            }
            const loaded = await session.invoke(GET_PROJECT, { project: McpCall.ref(spaceId, id) }, spaceId);
            // The id it answers with, not merely that it answered: a verb that resolved some other
            // project would satisfy a bare success check and hide the very mismatch this asks about.
            return !loaded.isError && loaded.structured.id === id;
          }),
        );
        const loadable = projectRows.length === PROJECT_NAMES.length && loads.every(Boolean);

        const milestone = await query(
          findObject(Milestone.Milestone, (candidate) => candidate.name === MILESTONE_NAME),
        );
        const target = await query(findObject(Task.Task, (candidate) => candidate.title === MILESTONE_TARGET));
        let refSet = false;
        if (milestone && target) {
          const filed = await session.invoke(
            UPDATE_TASK,
            { task: McpCall.ref(spaceId, target.id), milestone: McpCall.ref(spaceId, milestone.id) },
            spaceId,
          );
          // Read back from the database, not from the operation's own output: the write is the
          // claim, and an echo of the argument is not evidence that it landed.
          refSet = !filed.isError && (await query(milestoneIdOf(MILESTONE_TARGET))) === milestone.id;
        }

        const held: Held = { found, narrowed, rejected, reported, scoped, loadable, refSet };
        const scores = await score(scorers(held));
        return {
          scores,
          held,
          // The payloads themselves, so a red dimension can be read without re-running the scenario.
          calls: [
            { label: 'search-finds', rows: McpCall.rows(single).map((row) => row.label) },
            { label: 'search-narrows', rows: McpCall.rows(phrase).map((row) => row.label) },
            { label: 'unknown-input-rejected', isError: misspelled.isError, text: misspelled.text },
            {
              label: 'truncation-reported',
              capped: McpCall.rows(capped).length,
              cappedTruncated: capped.structured.truncated,
              ledger: McpCall.rows(ledger).length,
              ledgerTruncated: ledger.structured.truncated,
            },
            { label: 'listing-scoped-to-filter', projects: projectRows.map((row) => row.typename) },
          ],
        };
      } finally {
        await session.close();
      }
    },
  );

export const contractTask = SEEDED ? seededTask : unseededTask;
