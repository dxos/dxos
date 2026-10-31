//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Project from '@dxos/compute/Project';
import { Database, Ref, Type } from '@dxos/echo';
import * as ProjectSkill from '@dxos/plugin-projects/ProjectSkill';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { type Turn } from '@dxos/test-utils/claude-agent';
import { Milestone, Outline, Task, TaskSet } from '@dxos/types';

import { findObject } from '../assertions.ts';
import { SERVER, runClaudeEval, tool } from '../claude-harness.ts';
import * as McpTarget from '../McpTarget.ts';
import * as McpTranscript from '../McpTranscript.ts';
import * as Scorer from '../Scorer.ts';

//
// The contract half of the MCP eval: what the surface owes a caller, asked through the same Claude
// Code client as the scenario next door and graded from what came back.
//
// `mcp-server.eval.ts` gives an agent a goal and grades what reached the database. That is the right
// shape for "can a client get work done here" and cannot establish "was the answer it got correct":
// where the defect is that a wrong answer arrives as a successful one — a search that widens instead
// of narrowing, a misspelled input silently becoming "list everything", a page capped without saying
// so — a turn that reads the result and reports success is exactly what the defect produces.
//
// So what differs here is the prompt and the grading, not the client. The agent is told which
// operation to call and with which arguments, and every dimension is read out of its own
// stream-json transcript (`McpTranscript`): the call it actually made, and the payload the server
// actually returned. Reading the transcript rather than the reply is what closes the gap — a model
// summarizing its own tool results is the one witness a contract cannot use.
//
// The prompts forbid retrying or correcting a call, which is load-bearing rather than pedantic: two
// of the dimensions below are about what a WRONG call must do, and a helpful agent that quietly
// fixes the argument would report the contract as held without ever testing it.
//
// The four faults reproduced at unit level in dxos#13264 are what the set is drawn from; these are
// the same faults one altitude up, where a caller meets them.
//

/** The project that carries the ledger; the other two give a typename filter something to be wrong about. */
const LEDGER_PROJECT = 'Harbour';

const PROJECT_NAMES = [LEDGER_PROJECT, 'Jetty', 'Quay'] as const;

/**
 * Made-up tokens, so a phrase search cannot match by accident and the index cannot be credited for
 * a hit some other word earned.
 */
const ALPHA_TERM = 'alphaterm';
const BETA_TERM = 'betaterm';

const PHRASE = `${ALPHA_TERM} ${BETA_TERM}`;

/** One task carrying both terms and one carrying each — the only shape that tells AND from OR. */
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
const isType = (row: McpTranscript.Row, typename: string): boolean =>
  row.typename === typename || (row.typename ?? '').startsWith(`${typename}:`);

/** Whether a listing returned exactly the objects with these labels, in any order. */
const labelledExactly = (call: McpTranscript.Call | undefined, expected: readonly string[]): boolean => {
  const found = McpTranscript.labels(call);
  return found.length === expected.length && expected.every((label) => found.includes(label));
};

/** Whether a reference argument the agent built addresses `id`. */
const addresses = (value: unknown, id: string): boolean =>
  typeof value === 'object' && value !== null && Object.values(value).some((part) => String(part).includes(id));

/** The milestone a task is filed under, read from the database rather than from the agent's reply. */
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
      'Control for the two search dimensions: the single-term search the agent was told to make ' +
      'returned exactly the two tasks carrying that term, so a narrow result below cannot be an ' +
      'empty index.',
    score: Effect.succeed(held.found),
  }),
  Scorer.make({
    name: 'search-narrows',
    description:
      'The two-word search returned only the task carrying both words. OR-ing the terms returns a ' +
      'superset that still contains the right answer, which is why a goal-driven turn passes on it.',
    score: Effect.succeed(held.narrowed),
  }),
  Scorer.make({
    name: 'unknown-input-rejected',
    description:
      'The deliberately misspelled input property came back as an error. Dropped instead, the ' +
      'filter is gone and the handler falls through to listing the whole space — returned as a ' +
      'success a caller cannot tell from a real result set.',
    score: Effect.succeed(held.rejected),
  }),
  Scorer.make({
    name: 'truncation-reported',
    description:
      'The page capped by the limit said so, and the read the whole ledger fits inside said it was ' +
      'not capped. This is the silent-partial class itself: a capped page read as the whole set.',
    score: Effect.succeed(held.reported),
  }),
  Scorer.make({
    name: 'listing-scoped-to-filter',
    description: 'Each typename-filtered listing returned every object of that type and nothing of any other.',
    score: Effect.succeed(held.scoped),
  }),
  Scorer.make({
    name: 'listed-objects-loadable',
    description:
      'Every project the listing returned loaded back through a verb that takes it by reference, ' +
      'as the id it answered with. The read path and the write path resolve objects differently, ' +
      'so a listing can name one no write verb will accept.',
    score: Effect.succeed(held.loadable),
  }),
  Scorer.make({
    name: 'ref-field-set',
    description:
      'A nullable reference field accepted a reference, and the database shows it. Declared ' +
      '`optional(NullOr(Ref))` so a patch can clear it, such a field decodes `null` but not a ' +
      'reference: it can be cleared and never set.',
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

/** The server's own tools and nothing else, so no prompt here can be satisfied off the surface. */
const ALLOWED_TOOLS = [tool('queryOperations'), tool('invokeOperation'), tool('loadSkill')];

const PREFIX = `mcp__${SERVER}__`;

/**
 * The clause that makes a wrong call stay wrong.
 *
 * Two dimensions are about what a MALFORMED call must do, and the model's instinct is to notice the
 * mistake and fix it — which would report the contract as held by never testing it.
 */
const VERBATIM =
  'Make exactly these calls, in this order, with exactly these inputs. Do not repeat a call, do ' +
  'not change an argument, and do not correct or work around a call that fails: an error is a ' +
  'result I want reported, not a problem to solve.';

/** How the agent is told to name the tool and the operation, in the form it will pass them. */
const invoking = (key: string, spaceId: string): string =>
  `Call the ${SERVER} tool \`invokeOperation\` with \`key\` "${key}" and \`spaceId\` "${spaceId}".`;

/**
 * A deployed worker over a space this process cannot see. The fixtures are not ours, so only the
 * dimension asserting a refusal is still meaningful — a malformed call must be refused whatever the
 * space holds.
 */
const unseededTask = () =>
  runClaudeEval({ skills: [], target: TARGET, allowedTools: ALLOWED_TOOLS }, async ({ spaceId, send, score }) => {
    const turn = await send(
      `${invoking(QUERY_OBJECTS, spaceId)} Pass exactly this \`input\`: ` +
        `{"query": "${ALPHA_TERM}", "limit": ${PAGE}}. ${VERBATIM} Reply with whether it errored ` +
        'and what it said.',
    );
    const made = McpTranscript.calls(turn, PREFIX);
    const misspelled = McpTranscript.find(made, QUERY_OBJECTS, (input) => input.query === ALPHA_TERM);
    const scores = await score(unseededScorers(misspelled?.isError === true));
    return {
      scores,
      calls: made.map(({ operation, input, isError, text }) => ({ operation, input, isError, text })),
      turns: [turn].map(({ isError, toolCalls, result }) => ({ isError, toolCalls, result })),
    };
  });

const seededTask = () =>
  runClaudeEval(
    {
      target: TARGET,
      skills: [{ key: ProjectSkill.key, make: ProjectSkill.make, operations: ProjectSkill.operations }],
      plugins: [ProjectsPlugin.make(), TasksPlugin.make()],
      types: [Project.Project, Milestone.Milestone, Outline.Outline, Task.Task, TaskSet.TaskSet],
      allowedTools: ALLOWED_TOOLS,
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
              // The milestone has to be the set's own: `tasks.update` refuses one belonging to
              // another set, and the dimension would then pass that refusal off as the decode fault.
              milestones: [Ref.make(milestone)],
            }),
          );
          // Every project gets a task set added here: `Project.make` materializes one for a project
          // that arrives without, and a fixture whose objects were created as a side effect is a
          // fixture nothing in this file can state the contents of.
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
    async ({ spaceId, send, query, score }) => {
      // Turn 1 — the three searches, including the misspelled one. Together rather than one turn
      // each because the contrast is the point: one agent, one operation, three inputs.
      const searchTurn = await send(
        `${invoking(QUERY_OBJECTS, spaceId)} Make three such calls, passing exactly these \`input\` ` +
          'values in order:\n' +
          `1. {"text": "${ALPHA_TERM}", "limit": ${WHOLE_LEDGER}}\n` +
          `2. {"text": "${PHRASE}", "limit": ${WHOLE_LEDGER}}\n` +
          `3. {"query": "${ALPHA_TERM}", "limit": ${WHOLE_LEDGER}}\n` +
          `${VERBATIM} Reply with, for each call, its number and either the titles it returned or ` +
          'the error it returned.',
      );
      const searches = McpTranscript.calls(searchTurn, PREFIX);
      const single = McpTranscript.find(searches, QUERY_OBJECTS, (input) => input.text === ALPHA_TERM);
      const phrase = McpTranscript.find(searches, QUERY_OBJECTS, (input) => input.text === PHRASE);
      const misspelled = McpTranscript.find(searches, QUERY_OBJECTS, (input) => input.query === ALPHA_TERM);

      const found = single?.isError === false && labelledExactly(single, [BOTH_TERMS, ALPHA_ONLY]);
      const narrowed = phrase?.isError === false && labelledExactly(phrase, [BOTH_TERMS]);
      // The misspelling has to reach the server: a turn that never made the call establishes
      // nothing, which `find` returning `undefined` already scores as a failure.
      const rejected = misspelled?.isError === true;

      // Turn 2 — the listings, and a load of each project the listing named. The agent takes the
      // dxn out of one result and passes it back as a reference, which is the round trip a client
      // makes and no fixed argument could stand in for.
      const listTurn = await send(
        `${invoking(QUERY_OBJECTS, spaceId)} Make three such calls, passing exactly these \`input\` ` +
          'values in order:\n' +
          `1. {"limit": ${PAGE}}\n` +
          `2. {"typename": "${TASK_TYPENAME}", "limit": ${WHOLE_LEDGER}}\n` +
          `3. {"typename": "${PROJECT_TYPENAME}", "limit": ${WHOLE_LEDGER}}\n` +
          `Then, for EACH row the third call returned, ${invoking(GET_PROJECT, spaceId)} Pass ` +
          '`input` {"project": {"/": "<that row\'s dxn>"}}, using that row\'s own dxn verbatim. ' +
          `${VERBATIM} Reply with how many rows each of the three calls returned, what each ` +
          'reported for `truncated`, and whether every project loaded.',
      );
      const listings = McpTranscript.calls(listTurn, PREFIX);
      const capped = McpTranscript.find(
        listings,
        QUERY_OBJECTS,
        (input) => input.limit === PAGE && input.typename === undefined && input.text === undefined,
      );
      const ledger = McpTranscript.find(listings, QUERY_OBJECTS, (input) => input.typename === TASK_TYPENAME);
      const projects = McpTranscript.find(listings, QUERY_OBJECTS, (input) => input.typename === PROJECT_TYPENAME);
      const projectRows = McpTranscript.rows(projects);

      const reported =
        capped?.isError === false &&
        McpTranscript.rows(capped).length === PAGE &&
        capped.output.truncated === true &&
        ledger?.isError === false &&
        McpTranscript.rows(ledger).length === LEDGER_SIZE &&
        // The negative case too: a flag that is always true reports nothing.
        ledger.output.truncated === false;

      const scoped =
        projects?.isError === false &&
        projectRows.length === PROJECT_NAMES.length &&
        projectRows.every((row) => isType(row, PROJECT_TYPENAME)) &&
        ledger?.isError === false &&
        McpTranscript.rows(ledger).every((row) => isType(row, TASK_TYPENAME));

      // Matched by the id the listing gave, and asserted against the id the load answered with: a
      // verb that resolved some other project would satisfy a bare success check and hide the very
      // mismatch this asks about.
      const loadable =
        projectRows.length === PROJECT_NAMES.length &&
        projectRows.every((row) => {
          const id = idOf(row.dxn);
          if (id === undefined) {
            return false;
          }
          const loaded = McpTranscript.find(listings, GET_PROJECT, (input) => addresses(input.project, id));
          return loaded?.isError === false && loaded.output.id === id;
        });

      // Turn 3 — the nullable reference. Named by title and by milestone name rather than by
      // address, so the agent resolves both and builds the envelopes itself, which is the decode
      // path the defect lives on.
      const milestone = await query(findObject(Milestone.Milestone, (candidate) => candidate.name === MILESTONE_NAME));
      const refTurn = await send(
        `In space ${spaceId}, file the task titled "${MILESTONE_TARGET}" under the milestone named ` +
          `"${MILESTONE_NAME}". ${invoking(UPDATE_TASK, spaceId)} Pass \`input\` with \`task\` set to ` +
          "that task's reference and `milestone` set to that milestone's reference, both as " +
          `{"/": "<dxn>"} envelopes. Look up whatever addresses you need first. ${VERBATIM} Reply ` +
          'with whether the update call errored and what it said.',
      );
      const filed = McpTranscript.find(McpTranscript.calls(refTurn, PREFIX), UPDATE_TASK, (input) => !!input.milestone);
      // Read back from the database, not from the operation's own output: the write is the claim,
      // and an echo of the argument is not evidence that it landed.
      const refSet =
        filed?.isError === false &&
        milestone != null &&
        (await query(milestoneIdOf(MILESTONE_TARGET))) === milestone.id;

      const held: Held = { found, narrowed, rejected, reported, scoped, loadable, refSet };
      const scores = await score(scorers(held));
      const turns: Turn[] = [searchTurn, listTurn, refTurn];
      return {
        scores,
        held,
        // Every call with its arguments and its payload, so a red dimension can be read without
        // re-running the model — including the case where the agent called something else entirely.
        calls: turns.flatMap((turn) =>
          McpTranscript.calls(turn, PREFIX).map(({ operation, input, isError, text }) => ({
            operation,
            input,
            isError,
            text: text.slice(0, 2_000),
          })),
        ),
        turns: turns.map(({ isError, toolCalls, result }) => ({ isError, toolCalls, result })),
      };
    },
  );

export const contractTask = SEEDED ? seededTask : unseededTask;
