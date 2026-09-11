//
// Copyright 2026 DXOS.org
//

import { afterAll, beforeAll, describe, test } from '@effect/vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ClaudeAgent, McpSession, bootstrapProfile, dxBin, runDx } from '../../testing/index.ts';

/**
 * End-to-end: a real Claude Code subprocess, talking to a real `dx mcp serve`, against a real
 * ECHO database — where every claim about what happened is read back out of the database by a
 * separate `dx` process rather than taken from what the agent said it did.
 *
 * That separation is the whole point. An agent reporting "I marked the task done" is the model
 * narrating its own tool call; only a `dx database query` in another process proves the write
 * reached the database, and only running it BETWEEN turns proves it reached the database at the
 * stage the test claims — a suite that asserts once at the end cannot tell a first-turn write
 * from a third-turn one.
 *
 * Tagged `manual`: it spends real tokens against the Anthropic API and needs a `claude` binary on
 * PATH, so `DX_RUN_MANUAL_TESTS=1` opts in (see `vitest.tags.ts`) and CI never selects it.
 */

/**
 * The credential the suite runs on. Deliberately not `ANTHROPIC_API_KEY`: that variable, or an
 * interactive login, is whatever the developer happens to have, and the test would then charge an
 * account nobody chose — `claude-agent.ts` maps this one into the child. Empty rather than
 * undefined so `skipIf` below is the single place absence is handled.
 */
const API_KEY = process.env.DX_ANTHROPIC_API_KEY ?? '';

/** An alias, not a pinned revision: the suite asserts the agent's effects, not a model version. */
const MODEL = process.env.DX_E2E_MODEL ?? 'sonnet';

/** How the server is named to the agent, and therefore the prefix of every tool it exposes. */
const SERVER = 'dx-dev';

const tool = (name: string) => `mcp__${SERVER}__${name}`;

/**
 * Only the server's own surface is allowed. No Bash, no file tools: an agent that can shell out
 * could satisfy a prompt without ever reaching the server, and the run would prove nothing about
 * `dx mcp serve`.
 */
const ALLOWED_TOOLS = [tool('queryOperations'), tool('invokeOperation'), tool('loadSkill'), tool('whoami')];

/**
 * The agent's own ceiling for one turn. Must stay strictly below `TEST_TIMEOUT`, or vitest kills
 * the test first and the driver's "last events" diagnostic — the only record of what the agent
 * was doing — never prints.
 */
const TURN_TIMEOUT = 240_000;

/**
 * Per-test budget: one agent turn plus the `dx database query` that follows it. The package
 * defaults to 15s for its `runDx` subprocess tests, which a turn alone routinely exceeds — an
 * early run had one stage pass at 14.7s, a flake waiting to happen rather than a pass.
 */
const TEST_TIMEOUT = TURN_TIMEOUT + 120_000;

const TASK_TYPE = 'org.dxos.type.task';
const TASK_SET_TYPE = 'org.dxos.type.taskSet';

/** Distinctive enough that a query cannot match one by accident, or the model invent one. */
const ROTATE = 'Rotate the staging credentials';
const BACKFILL = 'Backfill the sync telemetry dashboard';

type TaskRow = { id: string; title?: string; status?: string; description?: string };

// `skipIf` rather than an early return in every test: without the credential the suite would
// otherwise report a row of passes having asserted nothing, which is worse than a visible skip.
describe.skipIf(!API_KEY)('claude code against dx mcp serve', { tags: ['manual'] }, () => {
  let home: string;
  let workdir: string;
  let spaceId: string;
  let agent: ClaudeAgent;

  /** Every task in the space, read by a `dx` process of its own — never through the agent. */
  const readTasks = (): TaskRow[] => {
    const { stdout, stderr, status } = runDx(
      ['--json', 'database', 'query', '--space-id', spaceId, '--typename', TASK_TYPE],
      { home, timeout: 120_000 },
    );
    if (status !== 0) {
      throw new Error(`dx database query failed (${status}): ${stderr}`);
    }
    return JSON.parse(stdout);
  };

  const findTask = (tasks: TaskRow[], title: string): TaskRow => {
    const task = tasks.find((row) => row.title === title);
    if (!task) {
      throw new Error(`no task titled ${JSON.stringify(title)} among ${JSON.stringify(tasks.map((t) => t.title))}`);
    }
    return task;
  };

  beforeAll(async () => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-agent-e2e-home-'));
    // The agent's working directory is a throwaway tree, so a prompt that goes wrong cannot touch
    // the checkout the test runs from.
    workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-agent-e2e-cwd-'));

    // An identity and a space must exist before anything else can run, and the server surface
    // has no verb for either.
    spaceId = bootstrapProfile(home);

    // The tasks are scaffolded over the same surface the agent will use rather than through an
    // in-process client: a fixture built by a different writer than the subject can hide a
    // defect in the subject's own write path.
    const scaffold = await McpSession.open({ home });
    try {
      // `tasks` and `milestones` are required by the schema even when empty; a draft missing
      // them is rejected before it reaches the database.
      const taskSet = await scaffold.invoke(
        'org.dxos.operation.space.addObject',
        { object: { '@type': TASK_SET_TYPE, 'name': 'Agent E2E backlog', 'tasks': [], 'milestones': [] } },
        spaceId,
      );
      for (const title of [ROTATE, BACKFILL]) {
        // `taskSet.id` is already a full `echo://` URI, which is what a ref envelope carries;
        // re-deriving one from `spaceId` produces a doubled URI the handler rejects.
        await scaffold.invoke('org.dxos.operation.tasks.create', { taskSet: { '/': taskSet.id }, title }, spaceId);
      }
    } finally {
      // Closed before the agent starts: its own server boots against this same data directory,
      // and two writers to one directory is a race the assertions could not attribute.
      await scaffold.close();
    }

    agent = ClaudeAgent.start({
      cwd: workdir,
      mcpServers: {
        [SERVER]: {
          command: dxBin,
          args: ['mcp', 'serve'],
          // The same isolated data root the scaffold wrote: without this the agent would talk to
          // the developer's own profile and the assertions below would read a different database.
          env: {
            HOME: home,
            PROTO_HOME: process.env.PROTO_HOME ?? path.join(process.env.HOME ?? '', '.proto'),
            PATH: process.env.PATH ?? '',
            DX_DEBUG: 'error',
            NO_COLOR: '1',
            PROTO_REPORTER: 'text',
          },
        },
      },
      apiKey: API_KEY,
      model: MODEL,
      allowedTools: ALLOWED_TOOLS,
      timeout: TURN_TIMEOUT,
    });
  }, 600_000);

  afterAll(async () => {
    await agent?.close();
    for (const dir of [home, workdir]) {
      if (dir) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  // Stage 1 — the starting state, proven from outside before a single token is spent. Without it,
  // a later "the task is done" assertion cannot distinguish the agent's work from a bad fixture.
  test(
    'stage 1: the scaffold is visible to a separate dx process before the agent runs',
    ({ expect }) => {
      const tasks = readTasks();
      expect(tasks.map((task) => task.title).sort()).toEqual([BACKFILL, ROTATE]);
      expect(findTask(tasks, ROTATE).status).toBe('todo');
      expect(findTask(tasks, BACKFILL).status).toBe('todo');
    },
    TEST_TIMEOUT,
  );

  // Stage 2 — a read-only turn. It must NOT change the database: an agent that writes while
  // answering a question is a defect the write-turn assertions below would happily absorb.
  test(
    'stage 2: the agent reads the scaffolded tasks through the server, changing nothing',
    async ({ expect }) => {
      const turn = await agent.send(
        `Using only the ${SERVER} MCP server, list the tasks in space ${spaceId}. ` +
          'Reply with their exact titles, one per line, and change nothing.',
      );

      expect(turn.isError, `turn failed: ${turn.result}`).toBe(false);
      // The agent went through the server rather than answering from the prompt.
      expect(turn.toolCalls.some((name) => name.startsWith(`mcp__${SERVER}__`))).toBe(true);
      expect(turn.result).toContain(ROTATE);
      expect(turn.result).toContain(BACKFILL);

      const tasks = readTasks();
      expect(tasks).toHaveLength(2);
      expect(findTask(tasks, ROTATE).status).toBe('todo');
      expect(findTask(tasks, BACKFILL).status).toBe('todo');
    },
    TEST_TIMEOUT,
  );

  // Stage 3 — one write, and the database read back between turns. The `toHaveLength(2)` is doing
  // work: the natural failure of an agent that cannot find a task is to create a new one and
  // report success, which a title-only assertion would pass.
  test(
    'stage 3: the agent completes one task, and only that task moves',
    async ({ expect }) => {
      const turn = await agent.send(
        `In space ${spaceId}, mark the task titled "${ROTATE}" as done. ` +
          'Update the existing task; do not create a new one. Leave every other task alone.',
      );

      expect(turn.isError, `turn failed: ${turn.result}`).toBe(false);
      expect(turn.toolCalls).toContain(tool('invokeOperation'));

      const tasks = readTasks();
      expect(tasks).toHaveLength(2);
      expect(findTask(tasks, ROTATE).status).toBe('done');
      // The untouched task is the control: it proves the write was targeted, not a blanket update.
      expect(findTask(tasks, BACKFILL).status).toBe('todo');
    },
    TEST_TIMEOUT,
  );

  // Stage 4 — a second write on the same conversation, asserted on its own so the suite is staged
  // rather than cumulative: stage 3 already proved the database at its own point in time, so a
  // regression here cannot be excused as "it happened later". The prompt says `started`, not "in
  // progress", because `Task.status` is a closed literal set and a value outside it would have
  // the agent either fail or invent one.
  test(
    'stage 4: a follow-up turn writes the second task without disturbing the first',
    async ({ expect }) => {
      const turn = await agent.send(
        `Now set the remaining todo task in space ${spaceId} to the "started" status and give it the ` +
          'description "picked up by the e2e agent". Update the existing task; do not create a new one.',
      );

      expect(turn.isError, `turn failed: ${turn.result}`).toBe(false);
      expect(turn.toolCalls).toContain(tool('invokeOperation'));

      const tasks = readTasks();
      expect(tasks).toHaveLength(2);
      const backfill = findTask(tasks, BACKFILL);
      expect(backfill.status).toBe('started');
      expect(backfill.description).toContain('e2e agent');
      // Still done: a later turn must not roll back what an earlier one committed.
      expect(findTask(tasks, ROTATE).status).toBe('done');
    },
    TEST_TIMEOUT,
  );
});
