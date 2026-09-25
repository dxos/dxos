//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { evalite } from 'evalite';
import fs from 'node:fs';
import path from 'node:path';

import * as Project from '@dxos/compute/Project';
import { Blob, Database, Filter, Query, Ref, Type } from '@dxos/echo';
import * as FilePlugin from '@dxos/plugin-file/FilePlugin';
import { FileSkill } from '@dxos/plugin-file/skills';
import * as ProjectSkill from '@dxos/plugin-projects/ProjectSkill';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { type Turn } from '@dxos/test-utils/claude-agent';
import { File, Milestone, Outline, Task, TaskSet } from '@dxos/types';

import { findObject } from '../assertions.ts';
import { SERVER, runClaudeEval, tool } from '../claude-harness.ts';
import type * as McpLatency from '../McpLatency.ts';
import * as McpTarget from '../McpTarget.ts';
import * as Scorer from '../Scorer.ts';

//
// This repo's MCP surface, driven by a real Claude Code subprocess and graded by what reached the
// database.
//
// The CLI's own end-to-end test (`packages/devtools/cli/src/commands/mcp/agent-e2e.test.ts`) runs
// the same agent against `dx mcp serve`. This is its eval counterpart, and it differs in one place:
// the server runs inside the eval process against the harness's own client (see `src/mcp-host.ts`),
// so there is no CLI binary to build, no profile to bootstrap, and one database — which is what
// lets a scorer grade the write rather than the model's account of it.
//
// Only the server's tools are allowed, plus `Bash(curl:*)` — no file tools, and no other shell. The
// rule and its one exception have the same root: an agent that can shell out freely could satisfy a
// prompt without ever reaching the surface, and the run would prove nothing about it. `curl` is
// admitted because the upload stage measures a flow that is DEFINED by the bytes not passing
// through the model, so there is no version of it the agent can complete through MCP alone. It
// cannot be used to fake the other stages: each asserts the MCP tool call it required by name, and
// the agent is never told an endpoint or credential it could reach the surface with by hand.
//
// `DX_EVAL_MCP_TARGET` picks the surface: `local` (the in-process host, the default), `local-edge`
// (`wrangler dev`), or the deployed `dev` / `main` / `prod` workers. Against `dev` and `main` the
// harness brings its own identity: it binds a `test+*@dxos.org` account through that EDGE's test
// hatch, replicates the space it seeds, and mints the worker's grant itself (`McpAuth`), so the run
// is graded from the database exactly as a local one is — every write the agent makes through the
// deployed worker comes back by replication. `prod`, whose hatch is closed, and any worker reached
// with a hand-minted `DX_EVAL_MCP_TOKEN` serve a space this process cannot see, so those runs drop
// the write stages and score what a client can see from outside: discovery, and per-tool latency.
//

const TARGET = McpTarget.fromEnv();

const REMOTE = !McpTarget.isLocal(TARGET);

/** Whether the run can be graded from the database (see {@link McpTarget.mode}). */
const GRADED = McpTarget.mode(TARGET) !== 'token';

/**
 * Whether to run the direct-upload stage. Every graded target: a deployed worker mints an EDGE-signed
 * URL, and the in-process host stages on a loopback listener the way `dx mcp serve` does
 * (`@dxos/mcp-server/LocalUpload`), so both put the bytes on a path the model never touches.
 */
const UPLOAD_STAGE = GRADED;

/**
 * The calls the latency report is built from.
 *
 * `queryOperations` and `loadSkill` answer out of the registry and measure little more than the
 * transport, so most of the set is `invokeOperation`: that is the tool an agent actually spends its
 * turns in, and the only one whose latency includes resolving a space and running a handler against
 * the database. Every operation here is `mutation('none')` and needs no object reference, so the
 * same set is as safe against production as against the in-process host.
 *
 * Rows come back keyed per operation (`invokeOperation:<key>`), because a single figure for
 * `invokeOperation` would average a registry lookup against a full-content query.
 */
const readProbes = (spaceId: string): McpLatency.Probe[] => [
  { tool: 'queryOperations', args: { query: 'task' } },
  { tool: 'loadSkill' },
  // Cheapest handler that still reaches the database: an unfiltered listing, ids and labels only.
  { tool: 'invokeOperation', args: { key: 'org.dxos.operation.space.queryObjects', input: { limit: 10 }, spaceId } },
  // The same verb with the objects loaded, which is what separates a query's cost from a handler's.
  // Labelled, because the operation key alone would fold it into the row above and average the two
  // shapes into a figure describing neither.
  {
    tool: 'invokeOperation',
    label: 'invokeOperation:org.dxos.operation.space.queryObjects(content)',
    args: {
      key: 'org.dxos.operation.space.queryObjects',
      input: { typename: Type.getTypename(Task.Task), includeContent: true, limit: 10 },
      spaceId,
    },
  },
  { tool: 'invokeOperation', args: { key: 'org.dxos.operation.tasks.listSessions', input: { limit: 10 }, spaceId } },
];

/**
 * Probes that need an object to address, and therefore a space this process seeded.
 *
 * A reference travels as the wire envelope the server documents, so these also time the decode path
 * a ref-taking operation goes through — which no ref-free probe covers.
 */
const refProbes = (spaceId: string, projectId: string): McpLatency.Probe[] => {
  const project = { '/': `echo://${spaceId}/${projectId}` };
  return [
    { tool: 'invokeOperation', args: { key: 'org.dxos.operation.projects.get', input: { project }, spaceId } },
    { tool: 'invokeOperation', args: { key: 'org.dxos.operation.tasks.list', input: { project }, spaceId } },
  ];
};

/**
 * Ceiling for the p95 of a tool call, in ms. The in-process host is a function call behind a
 * loopback socket; a deployed worker is a TLS round trip in front of a data plane, so the two cannot
 * share a number. Override with `DX_EVAL_MCP_LATENCY_BUDGET_MS`.
 */
const LATENCY_BUDGET = McpTarget.latencyBudget(REMOTE ? 3_000 : 500);

const PROJECT_NAME = 'Lighthouse';

/** Distinctive enough that a query cannot match one by accident, nor the model invent one. */
const ROTATE = 'Rotate the staging credentials';
const BACKFILL = 'Backfill the sync telemetry dashboard';

const DESCRIPTION = 'picked up by the eval agent';

/** Filename the upload stage plants and then asks for back, distinctive enough not to collide. */
const UPLOAD_NAME = 'eval-capture.png';

/**
 * Bytes the upload stage transfers.
 *
 * Comfortably past what any model would emit inline, so a run that somehow satisfied the stage
 * through a base64 tool argument would be visible as a vastly more expensive turn rather than
 * passing quietly. Random, so the size assertion below cannot be met by an empty or truncated
 * transfer that happens to compress to the same thing.
 */
const UPLOAD_BYTES = 3 * 1024 * 1024;

/**
 * A PNG header on random bytes: `FileLimits` accepts by declared media type, and `curl` derives
 * that from the extension, so the fixture has to be plausible enough for the type it claims.
 */
const uploadFixture = (): Uint8Array => {
  const bytes = new Uint8Array(UPLOAD_BYTES);
  // Filled in 64KB chunks: `getRandomValues` rejects a view longer than 65536 bytes outright, so a
  // single call for a multi-megabyte fixture throws rather than returning short.
  const CHUNK = 65_536;
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    crypto.getRandomValues(bytes.subarray(offset, Math.min(offset + CHUNK, bytes.length)));
  }
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  return bytes;
};

/** The uploaded file as the database holds it, bytes included, read outside the agent. */
const readUploadedFile = Effect.gen(function* () {
  const file = yield* findObject(File.File, (candidate) => candidate.name === UPLOAD_NAME);
  if (!file) {
    return undefined;
  }
  const blob = yield* Database.load(file.data);
  return {
    size: blob.size,
    type: blob.type,
    external: blob.data._tag === 'external',
    // The bytes themselves, because a length is not an identity: a truncated-then-padded or
    // substituted payload of the same size would satisfy every other check here.
    bytes: yield* Blob.read(blob),
  };
});

/** Whether two byte arrays are identical. */
const sameBytes = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length && left.every((byte, index) => byte === right[index]);

/** The operation the upload stage exists to exercise. */
const CREATE_FROM_UPLOAD = 'org.dxos.operation.file.createFromUpload';

/** Ids of the objects filed on a task's `artifacts`, read outside the agent. */
const readArtifactIds = (title: string) =>
  Effect.gen(function* () {
    const task = yield* findObject(Task.Task, (candidate) => candidate.title === title);
    const objects = yield* Effect.forEach(task?.artifacts ?? [], (ref) => Database.load(ref));
    return objects.map((object) => object.id);
  });

/**
 * Every tool call of a turn with its arguments.
 *
 * `Turn.toolCalls` carries names only, and a name is not enough here: `invokeOperation` is one tool
 * standing in front of every projected verb, so asking whether it was called says nothing about
 * which one ran.
 */
const toolUses = (turn: Turn): { name: string; input: Record<string, unknown> }[] => {
  const uses: { name: string; input: Record<string, unknown> }[] = [];
  for (const event of turn.events) {
    if (event?.type !== 'assistant') {
      continue;
    }
    for (const block of event.message?.content ?? []) {
      if (block?.type === 'tool_use' && typeof block.name === 'string') {
        uses.push({ name: block.name, input: (block.input ?? {}) as Record<string, unknown> });
      }
    }
  }
  return uses;
};

/** Whether the turn invoked a named operation through `invokeOperation`. */
const invokedOperation = (turn: Turn, key: string): boolean =>
  toolUses(turn).some((use) => use.name === tool('invokeOperation') && use.input.key === key);

type TaskRow = { title?: string; status?: string; description?: string };

/** Every task in the ledger, read outside the agent. */
const readTasks = Effect.gen(function* () {
  const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
  const taskSet = project?.taskSet ? yield* Database.load(project.taskSet) : undefined;
  if (!taskSet) {
    return [] as TaskRow[];
  }
  return yield* Effect.forEach(taskSet.tasks, (ref) => Database.load(ref));
});

const find = (tasks: readonly TaskRow[], title: string): TaskRow | undefined =>
  tasks.find((candidate) => candidate.title === title);

/**
 * What each turn established, at the turn rather than at the end.
 *
 * A staged fact cannot be recovered from the final space — "the read-only turn changed nothing" is
 * only true between two writes — so the turns record them and the scorers below read them back. The
 * dimensions that *are* end state ask the database their own question instead.
 */
type Staged = {
  scaffolded: boolean;
  listed: boolean;
  readOnly: boolean;
  completed: boolean;
  started: boolean;
  /** `undefined` when the stage did not run — see {@link UPLOAD_STAGE}. */
  uploaded?: boolean;
  /** `undefined` when the upload stage did not run. */
  attached?: boolean;
};

const NOTHING_STAGED: Staged = {
  scaffolded: false,
  listed: false,
  readOnly: false,
  completed: false,
  started: false,
};

/**
 * Latency as a graded dimension: the mark is the p95 against a budget, while the per-tool spread a
 * reader of the run wants rides the task's own output (`latency`), which is where a report survives.
 */
const latencyScorer = (report?: McpLatency.Report): Scorer.Any =>
  Scorer.make({
    name: 'tool-latency',
    description: `Client-observed MCP tool latency against "${TARGET}"; p95 within ${LATENCY_BUDGET}ms and no errored call.`,
    score: Effect.succeed(report != null && report.stats['*'].errors === 0 && report.stats['*'].p95 <= LATENCY_BUDGET),
  });

/** What a deployed target can be held to: the surface answered, and it answered fast enough. */
const remoteScorers = (discovered: boolean, report?: McpLatency.Report): Scorer.Any[] => [
  Scorer.make({
    name: 'operations-discovered',
    description: 'The agent reached the deployed surface and got operations back through it.',
    score: Effect.succeed(discovered),
  }),
  latencyScorer(report),
];

const scorers = (staged: Staged, report?: McpLatency.Report): Scorer.Any[] => [
  Scorer.make({
    name: 'scaffold-visible',
    description: 'The seeded ledger is readable outside the agent before the run starts.',
    score: Effect.succeed(staged.scaffolded),
  }),
  Scorer.make({
    name: 'tasks-listed',
    description: 'The agent read both tasks through the server rather than answering from the prompt.',
    score: Effect.succeed(staged.listed),
  }),
  Scorer.make({
    name: 'read-turn-changed-nothing',
    description: 'The read-only turn left every task as it found it.',
    score: Effect.succeed(staged.readOnly),
  }),
  Scorer.make({
    name: 'task-completed',
    description: 'The named task is done in the database, and only that task moved.',
    score: Effect.succeed(staged.completed),
  }),
  Scorer.make({
    name: 'follow-up-turn-wrote',
    description: 'A second turn set the other task started with its description, without rolling the first back.',
    score: Effect.succeed(staged.started),
  }),
  ...(staged.uploaded === undefined
    ? []
    : [
        Scorer.make({
          name: 'upload-round-trip',
          description:
            'The agent uploaded a 3MB file off its own disk through the signed URL and turned it ' +
            'into a File object whose blob holds exactly those bytes, compared byte for byte.',
          score: Effect.succeed(staged.uploaded),
        }),
        Scorer.make({
          name: 'upload-attached-to-task',
          description: 'The uploaded file is recorded on the named task as an artifact, and on no other task.',
          score: Effect.succeed(staged.attached === true),
        }),
      ]),
  Scorer.database({
    name: 'ledger-intact',
    // The ledger's own length, not a filter: the natural failure of an agent that cannot find a task
    // is to create a new one and report success, which every title-keyed check would pass.
    description: 'Still exactly two tasks — the agent updated the ledger rather than adding to it.',
    query: Query.select(Filter.type(Task.Task)),
    score: (tasks) => tasks.length === 2,
  }),
  latencyScorer(report),
];

/** Names and descriptions only; the marks come from the run, through `output.scores`. */
const SCORERS = GRADED
  ? scorers({ ...NOTHING_STAGED, ...(UPLOAD_STAGE ? { uploaded: false, attached: false } : {}) })
  : remoteScorers(false);

/**
 * A deployed worker over a space this process cannot see, driven from the outside: no seed, no
 * database check, one discovery turn and a latency report. It is what remains measurable when the
 * space the agent acts on is not this process's.
 */
const remoteTask = () =>
  runClaudeEval({ skills: [], target: TARGET }, async ({ spaceId, send, latency, score }) => {
    const report = await latency(readProbes(spaceId));
    const turn = await send(
      `Using only the ${SERVER} MCP server, list the operations it offers for working with tasks. ` +
        'Reply with their keys, one per line, and change nothing.',
    );
    const discovered = !turn.isError && turn.toolCalls.includes(tool('queryOperations'));
    const scores = await score(remoteScorers(discovered, report));
    return {
      scores,
      latency: report,
      turns: [turn].map(({ isError, toolCalls, result }) => ({ isError, toolCalls, result })),
    };
  });

const localTask = () =>
  runClaudeEval(
    {
      target: TARGET,
      skills: [{ key: ProjectSkill.key, make: ProjectSkill.make, operations: ProjectSkill.operations }, FileSkill],
      // Locally the harness answers `file.createFromUpload` from its own stage, and FilePlugin's
      // handler for the same operation (EDGE adoption) would compete with it.
      plugins: [ProjectsPlugin.make(), TasksPlugin.make(), ...(REMOTE ? [FilePlugin.make()] : [])],
      localUploads: true,
      types: [Project.Project, Milestone.Milestone, Outline.Outline, Task.Task, TaskSet.TaskSet, File.File, Blob.Blob],
      // The server's own tools, plus `curl` for the upload stage only — see the header comment for
      // why the no-shell rule has this one exception and why it cannot launder the other stages.
      allowedTools: [
        tool('queryOperations'),
        tool('invokeOperation'),
        tool('loadSkill'),
        tool('createUpload'),
        'Bash(curl:*)',
      ],
      seed: () =>
        Effect.gen(function* () {
          const tasks = yield* Effect.forEach([ROTATE, BACKFILL], (title) =>
            Database.add(Task.make({ title, status: 'todo' })),
          );
          const taskSet = yield* Database.add(
            TaskSet.make({
              name: `${PROJECT_NAME} ledger`,
              tasks: tasks.map((entry) => Ref.make(entry)),
              milestones: [],
            }),
          );
          yield* Database.add(Project.make({ name: PROJECT_NAME, taskSet: Ref.make(taskSet) }));
        }),
    },
    async ({ spaceId, workdir, send, query, score, latency }) => {
      // Stage 1 — the starting state, proven before a single token is spent. Without it, a later
      // "the task is done" score cannot distinguish the agent's work from a bad fixture.
      const seeded = await query(readTasks);
      const scaffolded =
        seeded.length === 2 && find(seeded, ROTATE)?.status === 'todo' && find(seeded, BACKFILL)?.status === 'todo';

      // Stage 2 — a read-only turn. It must NOT change the database: an agent that writes while
      // answering a question is a defect the write stages below would happily absorb.
      const read = await send(
        `Using only the ${SERVER} MCP server, list the tasks of the project "${PROJECT_NAME}" in space ` +
          `${spaceId}. Reply with their exact titles, one per line, and change nothing.`,
      );
      const afterRead = await query(readTasks);
      const listed =
        !read.isError &&
        read.toolCalls.some((name) => name.startsWith(`mcp__${SERVER}__`)) &&
        (read.result ?? '').includes(ROTATE) &&
        (read.result ?? '').includes(BACKFILL);
      const readOnly =
        afterRead.length === 2 &&
        find(afterRead, ROTATE)?.status === 'todo' &&
        find(afterRead, BACKFILL)?.status === 'todo';

      // Stage 3 — one write, read back between turns, so a regression here cannot be excused as
      // "it happened later".
      const complete = await send(
        `In space ${spaceId}, mark the task titled "${ROTATE}" as done. Update the existing task; do not ` +
          'create a new one. Leave every other task alone.',
      );
      const afterComplete = await query(readTasks);
      const completed =
        !complete.isError &&
        complete.toolCalls.includes(tool('invokeOperation')) &&
        find(afterComplete, ROTATE)?.status === 'done' &&
        // The untouched task is the control: it proves the write was targeted, not a blanket update.
        find(afterComplete, BACKFILL)?.status === 'todo';

      // Stage 4 — a second write on the same conversation. `started`, not "in progress", because
      // `Task.status` is a closed literal set and a value outside it would have the agent either
      // fail or invent one.
      const start = await send(
        `Now set the remaining todo task in space ${spaceId} to the "started" status and give it the ` +
          `description "${DESCRIPTION}". Update the existing task; do not create a new one.`,
      );
      const afterStart = await query(readTasks);
      const backfill = find(afterStart, BACKFILL);
      const started =
        !start.isError &&
        start.toolCalls.includes(tool('invokeOperation')) &&
        backfill?.status === 'started' &&
        (backfill?.description ?? '').includes(DESCRIPTION) &&
        // Still done: a later turn must not roll back what an earlier one committed.
        find(afterStart, ROTATE)?.status === 'done';

      // Stage 5 — the direct-upload path, which exists precisely because these bytes cannot travel
      // as a tool argument. The fixture is planted on the agent's disk rather than described to it,
      // so the only way through is `createUpload` -> shell transfer -> `createFromUpload`.
      let uploaded: boolean | undefined;
      let attached: boolean | undefined;
      let uploadTurn: Turn | undefined;
      if (UPLOAD_STAGE) {
        const fixture = uploadFixture();
        fs.writeFileSync(path.join(workdir, UPLOAD_NAME), fixture);
        const upload = await send(
          `The file ./${UPLOAD_NAME} in your working directory is a ${UPLOAD_BYTES}-byte screenshot. ` +
            `Add it to space ${spaceId} as a file named "${UPLOAD_NAME}". It is far too large to pass ` +
            'as a tool argument, so upload it directly: get an upload URL, transfer the bytes with ' +
            `curl, then create the file object from the upload id. Then attach the new file to the task ` +
            `titled "${ROTATE}" as an artifact.`,
        );
        uploadTurn = upload;
        const stored = await query(readUploadedFile);
        uploaded =
          !upload.isError &&
          upload.toolCalls.includes(tool('createUpload')) &&
          // The operation by name, not merely `invokeOperation`. Without this the stage is
          // satisfiable through `createFromSource`'s base64 arm — which also stores to edge, so the
          // external check below does not exclude it — and would pass by doing the one thing this
          // path exists to avoid. The uploadId needs no separate check: the byte comparison already
          // fails if the operation adopted a different upload.
          invokedOperation(upload, CREATE_FROM_UPLOAD) &&
          // The bytes are the real assertion: they can only match if the transfer completed intact
          // and the service stored what it received, which no amount of model narration produces.
          stored?.size === UPLOAD_BYTES &&
          sameBytes(stored.bytes, fixture) &&
          // External, not inline — an inline blob would mean the bytes came back through the model
          // after all, which is the exact failure this whole path exists to prevent.
          stored.external === true;
        const file = await query(findObject(File.File, (candidate) => candidate.name === UPLOAD_NAME));
        const [onRotate, onBackfill] = await Promise.all([
          query(readArtifactIds(ROTATE)),
          query(readArtifactIds(BACKFILL)),
        ]);
        attached = file != null && onRotate.includes(file.id) && !onBackfill.includes(file.id);
      }

      // After the turns, so the probe's own connection is not competing with the agent's for the
      // listener — and so a latency figure is never what a scenario's writes waited behind. The
      // ledger is at its fullest here too, which is the state worth timing a read against.
      const project = await query(findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME));
      const report = await latency([...readProbes(spaceId), ...(project ? refProbes(spaceId, project.id) : [])]);

      const scores = await score(
        scorers({ scaffolded, listed, readOnly, completed, started, uploaded, attached }, report),
      );
      return {
        scores,
        latency: report,
        turns: [read, complete, start, ...(uploadTurn ? [uploadTurn] : [])].map(({ isError, toolCalls, result }) => ({
          isError,
          toolCalls,
          result,
        })),
      };
    },
  );

evalite(`MCP server (${TARGET}) — Claude Code drives the projected surface`, {
  data: [{ input: null }],
  task: GRADED ? localTask : remoteTask,
  scorers: Scorer.toEvalite(SCORERS),
});
