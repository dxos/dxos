//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, expect } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Chat from '@dxos/assistant/Chat';
import * as AgentService from '@dxos/compute/AgentService';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Database, Feed, Filter, Obj, Ref, Registry } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import * as AcpAgent from '@dxos/plugin-code/AcpAgent';
import * as ComposerMcp from '@dxos/plugin-code/ComposerMcp';
import * as ProjectOperationHandlerSet from '@dxos/plugin-projects/ProjectOperationHandlerSet';
import * as ProjectSkill from '@dxos/plugin-projects/ProjectSkill';
import * as SpaceOperationHandlerSet from '@dxos/plugin-space/SpaceOperationHandlerSet';
import * as TaskOperation from '@dxos/plugin-tasks/TaskOperation';
import * as TasksOperationHandlerSet from '@dxos/plugin-tasks/TasksOperationHandlerSet';
import { Text } from '@dxos/schema';
import { Message, Milestone, Outline, RemoteSession, Task, TaskSet } from '@dxos/types';

import { CLAUDE_CODE_AGENT } from '../constants.ts';
import {
  API_KEY,
  type Decision,
  answerPermissions,
  eventually,
  installAdapter,
  makeAdapter,
  processesUnder,
  serveComposerMcp,
} from './harness.ts';

/**
 * End to end: a chat whose harness is Claude Code runs through `AgentService`, whose turns
 * `AcpAgent` produces against the real ACP adapter and the real Claude Code on the Anthropic API,
 * with Composer's own MCP surface served over the chat's space. The adapter is started as the desktop
 * app's agent helper starts it. Every claim is read back out of the database, the workspace or the
 * process table, never taken from what the agent says it did.
 *
 * Runs on the live clock (`it.live`): every wait here is on a real process, which a test clock would freeze.
 *
 * Tagged `manual`: it spends real tokens, so `DX_RUN_MANUAL_TESTS=1` with `DX_ANTHROPIC_API_KEY`
 * opts in and CI never selects it. See the package README for the command.
 */

/** Per turn: a real agent with tools is slow, and the reply is all a turn waits on. */
const TURN_TIMEOUT = 240_000;

const PROJECT_NAME = 'Lighthouse';
const RUNBOOK_NAME = 'Rotation runbook';
/** Distinctive enough that a query cannot match one by accident, or the model invent one. */
const SEEDED_TASKS = ['Audit the beacon firmware', 'Repaint the lantern room'];
const NEW_TASK = 'Rotate the staging credentials';
const E2E_SESSION = 'e2e-claude-code-0000-1111';

const TYPES = [
  Feed.Feed,
  Message.Message,
  Project.Project,
  TaskSet.TaskSet,
  Task.Task,
  Milestone.Milestone,
  Outline.Outline,
  RemoteSession.RemoteSession,
  Text.Text,
];

let adapter: { dir: string; entry: string };

/** Set per test, since the agent needs the sessions and tools that test made. */
let claudeCode: AcpAgent.AgentOptions | undefined;

const TestLayer = AssistantTestLayer({
  types: TYPES,
  operationHandlers: [
    TasksOperationHandlerSet.handlers,
    ProjectOperationHandlerSet.handlers,
    SpaceOperationHandlerSet.handlers,
  ],
  skills: [ProjectSkill.make()],
  // As plugin-assistant routes a chat whose harness is Claude Code to its agent's turns.
  agent: {
    makeTurnProducer: (options) =>
      claudeCode ? AcpAgent.makeTurnProducer(claudeCode)(options) : Effect.die(new Error('the test set no agent')),
  },
});

type SetupOptions = {
  /** Serve Composer's MCP surface to the agent. */
  composer?: boolean;
  /** How a person answers the agent's permission requests; everything is allowed by default. */
  decide?: (title: string) => Decision;
};

const setup = Effect.fnUntraced(function* ({ composer = false, decide = () => 'allow' }: SetupOptions = {}) {
  const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'claude-code-e2e-workspace-')));
  if (composer) {
    // As a project's code folder binds the spaces its projects live in, which the project skill reads before any call.
    const { db } = yield* Database.Service;
    mkdirSync(join(workspace, '.agents', 'projects'), { recursive: true });
    writeFileSync(
      join(workspace, '.agents', 'projects', 'space.yml'),
      `default: ${db.spaceId}\nspaces:\n  - ${db.spaceId}\n`,
    );
  }
  const sessions = yield* AcpAgent.Sessions.make();
  const host = composer ? yield* serveComposerMcp({ registry: yield* Registry.Service }) : undefined;
  const started = makeAdapter(adapter.entry);
  yield* Effect.addFinalizer(() => Effect.sync(() => started.stop()));
  claudeCode = {
    id: CLAUDE_CODE_AGENT,
    sessions,
    workspace: () => Effect.succeed(workspace),
    connect: started.connect,
    // Asks before anything that writes, so a permission is something a person has to give.
    mode: () => 'default',
    // As the app opens a session: Composer's lookups run without asking, its writes ask.
    sessionMeta: {
      claudeCode: {
        options: {
          allowedTools: ComposerMcp.READ_ONLY_TOOLS.map((tool) => `mcp__${ComposerMcp.SERVER_NAME}__${tool}`),
        },
      },
    },
    tools: host?.tools,
  };

  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed), session: { harness: CLAUDE_CODE_AGENT } }));
  const asked = yield* answerPermissions({ chat, feed, sessions, decide });
  const session = yield* AgentService.getSession(chat);
  return { workspace, sessions, host, chat, feed, asked, session };
});

/** Sends `prompt` and waits for the turn it starts to end, returning everything the agent said in it. */
const turn = Effect.fnUntraced(function* (session: AgentService.Session, prompt: string) {
  const before = yield* messages(session.feed);
  const seen = new Set(before.map((message) => message.id));
  const ended = before.filter(endsTurn).length;
  yield* session.submitPrompt(prompt);
  let latest = before;
  const after = yield* eventually(
    messages(session.feed).pipe(
      Effect.tap((all) => Effect.sync(() => (latest = all))),
      Effect.map((all) => (all.filter(endsTurn).length > ended ? all : undefined)),
    ),
    () => `the turn did not end: ${prompt}\nthe chat ends with:\n${summarize(latest.slice(-5))}`,
    TURN_TIMEOUT,
  );
  return after
    .filter((message) => message.sender.role === 'assistant' && !seen.has(message.id))
    .map((message) => Message.extractText(message))
    .filter((text) => text.length > 0)
    .join('\n');
});

const messages = Effect.fnUntraced(function* (feed: Feed.Feed) {
  return (yield* Feed.query(feed, Filter.type(Message.Message)).run).filter(Obj.instanceOf(Message.Message));
});

/** One line per message, naming its blocks, so a turn that stalls says where. */
const summarize = (tail: readonly Message.Message[]): string =>
  tail
    .map(
      (message) =>
        `${message.sender.role}: ${message.blocks.map((block) => block._tag).join(', ')} ${Message.extractText(message).slice(0, 200)}`,
    )
    .join('\n');

/** An ACP turn closes with its usage, so a stats block marks a turn that ended rather than one still talking. */
const endsTurn = (message: Message.Message): boolean => message.blocks.some((block) => block._tag === 'stats');

/** The assistant's text, in the order the turns produced it. */
const transcript = Effect.fnUntraced(function* (feed: Feed.Feed) {
  return (yield* messages(feed))
    .filter((message) => message.sender.role === 'assistant')
    .map((message) => Message.extractText(message))
    .filter((text) => text.length > 0);
});

/** A project with two tasks and a runbook among its artifacts, seeded directly rather than through the agent. */
const seedProject = Effect.fnUntraced(function* () {
  const runbook = yield* Database.add(Text.make({ content: 'Rotate keys in staging first, then production.' }));
  const project = yield* Database.add(Project.make({ name: PROJECT_NAME, artifacts: [Ref.make(runbook)] }));
  if (!project.taskSet) {
    return yield* Effect.die(new Error('a project is made with a task set'));
  }
  const taskSet = yield* Database.load(project.taskSet);
  for (const title of SEEDED_TASKS) {
    yield* Operation.invoke(TaskOperation.CreateTask, { taskSet: Ref.make(taskSet), title });
  }
  yield* Database.flush();
  return { project, taskSet, runbook };
});

const tasksIn = Effect.fnUntraced(function* (taskSet: TaskSet.TaskSet) {
  return yield* Effect.forEach(taskSet.tasks, (ref) => Database.load(ref));
});

describe.skipIf(!API_KEY)('Claude Code, end to end', { tags: ['manual'] }, () => {
  beforeAll(() => {
    adapter = installAdapter();
  }, 300_000);

  describe('turns', () => {
    it.live(
      'answers on Claude Code and remembers the conversation, on one agent kept between turns',
      Effect.fnUntraced(
        function* (_) {
          const { session } = yield* setup();
          const first = yield* turn(session, 'Reply with exactly the single word "pong" and nothing else.');
          expect(first.toLowerCase()).toContain('pong');
          const agents = processesUnder(adapter.dir);
          expect(agents.length).toBeGreaterThan(0);

          const second = yield* turn(
            session,
            'Which word did you just reply with? Answer with that word only, in upper case.',
          );
          expect(second).toContain('PONG');
          // The follow-up did not start the agent again.
          expect(processesUnder(adapter.dir)).toEqual(agents);
        },
        Effect.scoped,
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: 2 * TURN_TIMEOUT },
    );

    it.live(
      'holds a prompt sent mid-turn until the turn ends, then answers it',
      Effect.fnUntraced(
        function* (_) {
          const { session } = yield* setup();
          yield* session.submitPrompt('Reply with exactly the single word "ALPHA" and nothing else.');
          yield* session.submitPrompt('Reply with exactly the single word "BRAVO" and nothing else.');
          const replies = yield* eventually(
            transcript(session.feed).pipe(
              Effect.map((texts) => (texts.some((text) => text.includes('BRAVO')) ? texts : undefined)),
            ),
            () => 'no reply to the second prompt',
            2 * TURN_TIMEOUT,
          );
          const alpha = replies.findIndex((text) => text.includes('ALPHA'));
          const bravo = replies.findIndex((text) => text.includes('BRAVO'));
          expect(alpha).toBeGreaterThanOrEqual(0);
          expect(bravo).toBeGreaterThan(alpha);
        },
        Effect.scoped,
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: 3 * TURN_TIMEOUT },
    );
  });

  describe('workspace and permissions', () => {
    it.live(
      "asks before writing to the chat's workspace, and writes once a person allows it",
      Effect.fnUntraced(
        function* (_) {
          const { session, workspace, asked } = yield* setup({ decide: () => 'allow' });
          yield* turn(
            session,
            'Create a file named note.txt in the current directory containing exactly the text: lighthouse',
          );
          expect(asked.length).toBeGreaterThan(0);
          expect(readFileSync(join(workspace, 'note.txt'), 'utf8').trim()).toBe('lighthouse');
        },
        Effect.scoped,
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: TURN_TIMEOUT + 60_000 },
    );

    it.live(
      'leaves the workspace as it was when a person declines',
      Effect.fnUntraced(
        function* (_) {
          const { session, workspace, asked } = yield* setup({ decide: () => 'reject' });
          yield* turn(
            session,
            'Create a file named declined.txt in the current directory containing exactly the text: lighthouse. ' +
              'If you are not allowed to, say so and stop.',
          );
          expect(asked.length).toBeGreaterThan(0);
          expect(asked.every(({ decision }) => decision === 'reject')).toBe(true);
          expect(existsSync(join(workspace, 'declined.txt'))).toBe(false);
        },
        Effect.scoped,
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: TURN_TIMEOUT + 60_000 },
    );
  });

  describe('process lifetime', () => {
    it.live(
      'ends the agent, and everything it started, when the process ends',
      Effect.fnUntraced(
        function* (_) {
          const { session } = yield* setup();
          yield* turn(session, 'Reply with exactly the single word "pong" and nothing else.');
          expect(processesUnder(adapter.dir).length).toBeGreaterThan(0);

          yield* session.terminate();
          yield* eventually(
            Effect.sync(() => processesUnder(adapter.dir).length === 0),
            () => `processes outlived the process that started them: ${processesUnder(adapter.dir).join(', ')}`,
            15_000,
          );
        },
        Effect.scoped,
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: TURN_TIMEOUT + 60_000 },
    );

    it.live(
      'replaces an agent that died, and the chat carries on where it left off',
      Effect.fnUntraced(
        function* (_) {
          const { chat, session } = yield* setup();
          yield* turn(session, 'Remember the code word ORCHID. Reply with exactly "noted" and nothing else.');
          const agents = processesUnder(adapter.dir);
          expect(agents.length).toBeGreaterThan(0);
          for (const pid of agents) {
            process.kill(pid, 'SIGKILL');
          }
          yield* eventually(
            Effect.sync(() => processesUnder(adapter.dir).length === 0),
            () => 'the killed agent is still running',
          );

          const next = yield* AgentService.getSession(chat);
          const reply = yield* turn(next, 'What code word did I ask you to remember? Answer with the word only.');
          expect(reply.toUpperCase()).toContain('ORCHID');
          expect(processesUnder(adapter.dir).length).toBeGreaterThan(0);
        },
        Effect.scoped,
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: 2 * TURN_TIMEOUT + 60_000 },
    );
  });

  describe("Composer's MCP tools", () => {
    it.live(
      "reaches Composer's tools with the token from its environment, and reads the chat's space",
      Effect.fnUntraced(
        function* (_) {
          yield* seedProject();
          const { session, host } = yield* setup({ composer: true });
          const reply = yield* turn(
            session,
            `Using the ${ComposerMcp.SERVER_NAME} MCP tools, list the titles of every task in the project ` +
              `"${PROJECT_NAME}". Reply with the titles only, one per line.`,
          );
          for (const title of SEEDED_TASKS) {
            expect(reply).toContain(title);
          }
          expect(host?.rejected()).toBe(0);
          // The titles came from the server, not from the prompt.
          expect(host?.calls.some(({ method }) => method === 'tools/call')).toBe(true);
        },
        Effect.scoped,
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: TURN_TIMEOUT + 60_000 },
    );

    it.live(
      'manages project tasks over MCP: create, claim, ask, act on the answer, attach, report',
      Effect.fnUntraced(
        function* (_) {
          const { taskSet, runbook } = yield* seedProject();
          const { session, host, asked } = yield* setup({ composer: true });
          const operationsCalled = () =>
            (host?.calls ?? []).flatMap(({ operation }) => (operation ? [operation] : [])).join(', ');
          const findNew = Effect.gen(function* () {
            const task = (yield* tasksIn(taskSet)).find((task) => task.title === NEW_TASK);
            return task ?? (yield* Effect.die(new Error(`no task titled "${NEW_TASK}"`)));
          });

          // Created over the server, and the write went through the person's approval.
          yield* turn(
            session,
            `Load the project skill from the ${ComposerMcp.SERVER_NAME} MCP server, then create a task titled ` +
              `"${NEW_TASK}" in the project "${PROJECT_NAME}". Reply "done" when it exists.`,
          );
          const task = yield* findNew;
          expect(task.status).toBe('todo');
          expect(host?.calls.some(({ tool }) => tool === 'loadSkill')).toBe(true);
          expect(asked.length).toBeGreaterThan(0);

          // Claimed by the agent's session and started.
          yield* turn(
            session,
            `Assign the task "${NEW_TASK}" to your session, whose id is "${E2E_SESSION}", and set its status ` +
              'to started. Reply "done" when that is recorded.',
          );
          expect(task.status).toBe('started');
          const assignee = task.assignee?.subject ? yield* Database.load(task.assignee.subject) : undefined;
          expect(
            Obj.instanceOf(RemoteSession.RemoteSession, assignee) ? RemoteSession.getSessionId(assignee) : undefined,
          ).toBe(E2E_SESSION);

          // A question the agent cannot answer itself blocks the task until a person answers it.
          yield* turn(
            session,
            `Ask me, as a question on the task "${NEW_TASK}", which vault the credentials should go to, offering ` +
              'the options "staging-vault" and "ops-vault". Then stop and wait for my answer.',
          );
          expect(task.status).toBe('blocked');
          const [question] = Task.getPendingQuestions(task.history);
          if (!question) {
            return yield* Effect.die(new Error('the blocked task has no pending question'));
          }
          expect(question.options?.map(({ title }) => title).sort()).toEqual(['ops-vault', 'staging-vault']);
          yield* Operation.invoke(TaskOperation.AnswerQuestion, {
            task: Ref.make(task),
            question: question.id,
            answer: 'ops-vault',
          });

          yield* turn(
            session,
            `I answered your question on the task "${NEW_TASK}". Read my answer from the task, put the vault I ` +
              'chose in the task description, and mark the task done.',
          );
          expect(task.status).toBe('done');
          expect(task.description).toContain('ops-vault');

          // Attaches an existing object, and reports the session's state.
          const reported = yield* turn(
            session,
            `Attach the project's "${RUNBOOK_NAME}" artifact (the text document among the project's artifacts) ` +
              `to the task "${NEW_TASK}" as an artifact. Then record your session "${E2E_SESSION}" with a ` +
              'one-sentence summary of what you did.',
          );
          const artifacts = yield* Effect.forEach(task.artifacts ?? [], (ref) => Database.load(ref));
          expect(artifacts.map((artifact) => artifact.id)).toContain(runbook.id);
          const recorded = (yield* Database.query(Filter.type(RemoteSession.RemoteSession)).run).find(
            (candidate) => RemoteSession.getSessionId(candidate) === E2E_SESSION,
          );
          expect(
            recorded?.summary?.length ?? 0,
            `the agent said:\n${reported}\ncalled: ${operationsCalled()}`,
          ).toBeGreaterThan(0);
          expect(host?.rejected()).toBe(0);
        },
        Effect.scoped,
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: 5 * TURN_TIMEOUT },
    );
  });

  // Flows the suite covers once the work they exercise lands; each names what it will assert.
  describe('planned', () => {
    it.todo('remote: a chat on Claude Code runs in an EDGE sandbox, with the same turns, tools and permissions');
    it.todo('remote: the sandbox starts Claude Code with CLAUDE_CODE_OAUTH_TOKEN from the space, never logged');
    it.todo('remote: Composer MCP reaches the sandboxed agent with the credentials provisioned for it');
    it.todo('registry: a chat names its process by a dxn: reference, resolved through the operation registry');
    it.todo('shell: ShellService runs, streams and kills bash commands, through Tauri and the vite dev server');
    it.todo('shell: every ShellService child ends when the compute process that started it ends');
    it.todo("shell: plugin-computer's Bash and ApplyEdits run through ShellService");
  });
});
