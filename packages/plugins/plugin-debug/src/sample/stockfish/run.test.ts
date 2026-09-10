//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Provider } from '@dxos/ai';
import { LanguageModelFixture } from '@dxos/ai/testing';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { AiContext } from '@dxos/assistant';
import {
  ChatContextHandlers,
  ChatContextSkill,
  SkillManagerHandlers,
  SkillManagerSkill,
} from '@dxos/assistant-toolkit';
import * as Chat from '@dxos/assistant/Chat';
import { SpaceProperties } from '@dxos/client-protocol';
import { getSession } from '@dxos/compute/AgentService';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Obj, Query, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { DXN, EntityId } from '@dxos/keys';
import * as ProjectOperationHandlerSet from '@dxos/plugin-projects/ProjectOperationHandlerSet';
import * as ProjectSkill from '@dxos/plugin-projects/ProjectSkill';
import { SandboxSkill } from '@dxos/plugin-sandbox';
import * as SpaceOperationHandlerSet from '@dxos/plugin-space/SpaceOperationHandlerSet';
import * as TasksOperationHandlerSet from '@dxos/plugin-tasks/TasksOperationHandlerSet';
import { Text } from '@dxos/schema';
import { Message, Task } from '@dxos/types';

import { StockfishSpace } from './index';

/**
 * The first turn of the chess-MCP template, driven live.
 *
 * The template is a plan meant to be RUN, and `sample.test.ts` only asserts the shape it ships in.
 * This covers the step after that: the space is instantiated, a chat is opened over its project
 * with the skills the plan names, and a real DeepSeek model is asked to pick the work up. What it
 * proves is the wiring a first run depends on — the template's instructions and skill reach the
 * session, the task ledger's verbs resolve, and the model can move the root task off `todo` — none
 * of which the archive test can see.
 *
 * Manual by tag, for two reasons: it spends a real model call, and the sandbox service the later
 * stages need is unreliable enough that a scheduled run would fail on it rather than on this.
 * Which is also why it stops here: picking up the root task needs no container.
 *
 * Run with, and re-record the conversation with, respectively:
 *   DX_RUN_MANUAL_TESTS=1 moon run plugin-debug:test -- src/sample/stockfish/run.test.ts
 *   DX_UPDATE_MODEL_FIXTURES=1 DX_RUN_MANUAL_TESTS=1 DEEPSEEK_API_KEY=... moon run \
 *     plugin-debug:test -- src/sample/stockfish/run.test.ts
 */

// Stable entity ids, so the memoized conversation matches across runs: the space's own content is
// already dated against the template's fixed reference.
EntityId.dangerouslyDisableRandomness();

/** The model the template's own first step tells the reader to select. */
const MODEL = DXN.make('com.deepseek.model.deepseek-v4-pro.default');

/**
 * The skills a chat working this template is expected to carry, beyond the Development skill the
 * space seeds and binds through its own instructions.
 *
 * `SandboxSkill` is here because the plan names it as where the code gets written; its tools only
 * resolve once a run also registers `plugin-sandbox`'s handlers against a live sandbox service, and
 * an unresolvable tool is dropped from the session toolkit rather than failing it. The DeepSeek
 * harness skill is deliberately absent: it drives the coding agent inside the sandbox image, and
 * the template's instructions forbid delegating this project to it — the harness driving this run
 * is ours.
 */
const EXPECTED_SKILLS = [SkillManagerSkill.make(), ChatContextSkill.make(), ProjectSkill.make(), SandboxSkill.make()];

const template = StockfishSpace();

const TestLayer = AssistantTestLayer({
  // Direct to the vendor rather than through EDGE, which the app routes this model over for auth
  // and metering: that path needs a HALO identity and an `EdgeHttpClient`, and a headless test
  // stack has neither. Memoized like any other preset, so a recorded run replays without a key.
  aiServicePreset: 'deepseek',
  model: MODEL,
  provider: Provider.edge.id,
  // Every verb the bound skills declare, so no tool the model reaches for fails to resolve.
  operationHandlers: [
    ProjectOperationHandlerSet.handlers,
    TasksOperationHandlerSet.handlers,
    SpaceOperationHandlerSet.handlers,
    ChatContextHandlers,
    SkillManagerHandlers,
  ],
  // The template's own schemas plus what a chat over it persists: `SpaceProperties` carries the
  // root-collection annotation the sample builder writes.
  types: [
    ...template.schemas,
    SpaceProperties,
    Chat.Chat,
    AiContext.Binding,
    Feed.Feed,
    Message.Message,
    Text.Text,
    Skill.Skill,
  ],
  skills: EXPECTED_SKILLS,
  tracing: 'pretty',
});

/**
 * Applies the template to the test database and opens a chat over the project it created, wired the
 * way a project companion chat is: the project's own instructions (which carry the Development
 * skill and the brief), and the expected skills bound onto the chat's feed.
 */
const instantiateTemplate = Effect.fnUntraced(function* () {
  const properties = yield* Database.add(Obj.make(SpaceProperties, {}));
  yield* Database.flush();
  const { db } = yield* Database.Service;
  yield* SampleSpace.applyTo(template, { db, properties });

  const [project] = yield* Database.query(Query.type(Project.Project)).run;
  invariant(project, 'Expected the template to create a project.');
  invariant(project.instructions, 'Expected the project to carry instructions.');
  const instructions = yield* Database.load(project.instructions);

  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(
    Chat.make({ name: 'Chess MCP on Workers', feed: Ref.make(feed), instructions: Ref.make(instructions) }),
  );
  Chat.linkCompanion({ chat, subject: project });
  Obj.setParent(feed, chat);

  const runtime = yield* Effect.context<Database.Service>();
  const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
  yield* Effect.promise(() =>
    binder.bind({
      skills: EXPECTED_SKILLS.map((skill) => Ref.make(skill)),
      objects: [Ref.make(project)],
    }),
  );
  yield* Database.flush();

  return { project, instructions, chat };
});

/** The one task with no parent: the plan's root. */
const rootTask = Effect.gen(function* () {
  const tasks = yield* Database.query(Query.type(Task.Task)).run;
  const roots = tasks.filter((task) => task.parentTask === undefined);
  invariant(roots.length === 1, `Expected one root task, got ${roots.length}.`);
  return roots[0];
});

describe('Chess MCP template, run live', { tags: ['manual'] }, () => {
  it.effect(
    'a DeepSeek chat over the instantiated template picks up the root task',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { instructions, chat } = yield* instantiateTemplate();

        // Preconditions, so a failure below is the model's and not the seeding's: the Development
        // skill reaches the session through the project's instructions (the only binding path), and
        // the plan has not been started.
        const bound = new Set<string>();
        for (const skillRef of instructions.skills) {
          bound.add(Skill.getKey(yield* Database.load(skillRef)));
        }
        expect(bound).toContain('org.dxos.skill.development');
        const root = yield* rootTask;
        expect(root.status).toBe('todo');

        const session = yield* getSession(chat);
        yield* session.submitPrompt(
          'Read the task list for this project, then pick up the work: set the root task to started ' +
            'and tell me, in one sentence each, what the first stage is and which of its steps are ' +
            'mine rather than yours. Do not start any stage yet.',
        );
        yield* session.waitForCompletion();

        // The observable effect of picking the work up, read off the ledger rather than the reply.
        expect(root.status).toBe('started');
        // And nothing below it: the plan's stages are ordered, and a run that starts stage one in
        // the same turn it reads the list has skipped the reader's two settings steps.
        const started = (yield* Database.query(Query.type(Task.Task)).run).filter(
          (task) => task.parentTask !== undefined && task.status !== 'todo',
        );
        expect(started).toEqual([]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    // A live model with a task tree to read takes several tool round-trips; a replay does not.
    { timeout: LanguageModelFixture.isUpdateEnabled() ? 300_000 : 60_000 },
  );
});
