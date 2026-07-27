//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayerWithTriggers } from '@dxos/agent-runtime/testing';
import { AiContext } from '@dxos/assistant';
import { SpaceProperties } from '@dxos/client-protocol';
import { Operation, OperationHandlerSet, Skill, Trigger } from '@dxos/compute';
import { Collection, Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';
import { MarkdownSkill } from '@dxos/plugin-markdown';
import { Markdown } from '@dxos/plugin-markdown';
import { MarkdownOperationHandlerSet } from '@dxos/plugin-markdown/plugin';
import { Text } from '@dxos/schema';

import { Agent, Chat, Plan } from '../../types';
import { AgentWizardHandlers, AgentWizardOperations } from '../agent-wizard';
import { PlanningHandlers } from '../planning';
import { AgentSkillHandlers } from './operations';
import * as AgentSkillOperations from './operations/definitions';
import { AgentWorker } from './operations/definitions';
import AgentSkillDef from './skill';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayerWithTriggers({
  aiServicePreset: 'edge-remote',
  operationHandlers: OperationHandlerSet.merge(
    AgentSkillHandlers,
    AgentWizardHandlers,
    MarkdownOperationHandlerSet,
    PlanningHandlers,
  ),
  types: [
    Agent.Agent,
    Plan.Plan,
    Chat.CompanionTo,
    Chat.Chat,
    SpaceProperties,
    Skill.Skill,
    Trigger.Trigger,
    Text.Text,
    Markdown.Document,
    Collection.Collection,
  ],
  tracing: 'pretty',
  disableLlmMemoization: true,
});

describe('Agent', () => {
  // The sync-triggers cases invoke the handler directly and never reach a model; only the
  // agent-driven cases replay a memoized conversation and carry the gate.
  const skill = AgentSkillDef.make();

  it.scoped(
    'cron field creates a timer trigger that invokes the agent worker',
    Effect.fnUntraced(
      function* ({ expect }) {
        const cron = '*/5 * * * *';
        const agent = yield* Agent.makeInitialized(
          {
            name: 'Scheduled agent',
            instructions: 'A scheduled agent that runs on a timer.',
            skills: [Ref.make(MarkdownSkill.make())],
            cron,
          },
          skill,
        );
        yield* Database.flush();

        yield* Operation.invoke(AgentWizardOperations.SyncTriggers, { agent: Ref.make(agent) });

        const triggers = yield* Database.query(
          Query.select(Filter.type(Trigger.Trigger)).debugLabel('assistant-toolkit.skill.test.timer'),
        ).run;
        const timerTriggers = triggers.filter(
          (trigger) => trigger.spec?.kind === 'timer' && trigger.spec.cron === cron,
        );
        expect(timerTriggers).toHaveLength(1);

        const timerTrigger = timerTriggers[0];
        invariant(timerTrigger.spec?.kind === 'timer');
        expect(timerTrigger.spec.cron).toBe(cron);
        expect(timerTrigger.enabled).toBe(true);

        // Timer trigger bypasses the qualifier and points to the agent worker.
        invariant(timerTrigger.runnable);
        const operation = yield* Database.load(timerTrigger.runnable);
        invariant(Obj.instanceOf(Operation.PersistentOperation, operation));
        expect(Obj.getMeta(operation).key).toBe(AgentWorker.meta.key);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'sync-triggers sets trigger enabled from agent.enabled',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* Agent.makeInitialized(
          {
            name: 'Toggle agent',
            instructions: 'Test enabled propagation.',
            skills: [Ref.make(MarkdownSkill.make())],
            enabled: false,
            cron: '0 9 * * *',
          },
          skill,
        );
        yield* Database.flush();

        yield* Operation.invoke(AgentWizardOperations.SyncTriggers, { agent: Ref.make(agent) });

        const triggers = yield* Database.query(
          Query.select(Filter.type(Trigger.Trigger)).debugLabel('assistant-toolkit.skill.test.toggle-enabled'),
        ).run;
        expect(triggers.every((trigger) => trigger.enabled === false)).toBe(true);

        Obj.update(agent, (agent) => {
          agent.enabled = true;
        });
        yield* Database.flush();
        yield* Operation.invoke(AgentWizardOperations.SyncTriggers, { agent: Ref.make(agent) });

        const triggersAfter = yield* Database.query(
          Query.select(Filter.type(Trigger.Trigger)).debugLabel('assistant-toolkit.skill.test.after'),
        ).run;
        expect(triggersAfter).toHaveLength(triggers.length);
        expect(triggersAfter.every((trigger) => trigger.enabled === true)).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'add-artifact: appends a resolvable artifact to the bound agent',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, conversation } = yield* setupBoundAgent();
        const document = yield* Database.add(
          Obj.make(Markdown.Document, {
            name: 'Test Document',
            content: Ref.make(Text.make({ content: 'This is a test document with some content.' })),
          }),
        );
        yield* Database.flush();
        expect(agent.artifacts).toHaveLength(0);

        yield* Operation.invoke(AgentSkillOperations.AddArtifact, {
          name: 'My Test Document',
          artifact: document.id,
        }).pipe(Effect.provide(conversation));

        expect(agent.artifacts.map((artifact) => artifact.name)).toEqual(['My Test Document']);
        const data = yield* Database.load(agent.artifacts[0].data);
        expect(Obj.instanceOf(Markdown.Document, data)).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'get-context: reports the bound agent name, instructions and artifacts',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, conversation } = yield* setupBoundAgent();
        const document = yield* Database.add(
          Obj.make(Markdown.Document, {
            name: 'Test Document',
            content: Ref.make(Text.make({ content: 'Body.' })),
          }),
        );
        yield* Database.flush();
        yield* Operation.invoke(AgentSkillOperations.AddArtifact, {
          name: 'My Test Document',
          artifact: document.id,
        }).pipe(Effect.provide(conversation));

        const context = yield* Operation.invoke(AgentSkillOperations.GetContext, {}).pipe(Effect.provide(conversation));

        expect(context.id).toBe(agent.id);
        expect(context.name).toBe('Test Agent');
        expect(context.instructions).toBe('A test agent for adding artifacts.');
        expect(context.artifacts).toEqual([
          { name: 'My Test Document', type: Obj.getTypename(document), dxn: Obj.getURI(document) },
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

// Creates an agent and binds it to its own chat feed so the harness-scoped operations resolve it.
const setupBoundAgent = Effect.fnUntraced(function* () {
  const agent = yield* Agent.makeInitialized(
    { name: 'Test Agent', instructions: 'A test agent for adding artifacts.' },
    AgentSkillDef.make(),
  );
  yield* Database.flush();

  const chatFeed = agent.chat?.target?.feed?.target;
  invariant(chatFeed, 'Agent chat feed not found.');
  const runtime = yield* Effect.runtime<Database.Service>();
  const binder = new AiContext.Binder({ feed: chatFeed, runtime });
  yield* Effect.promise(() => binder.bind({ objects: [Ref.make(agent)] }));

  return { agent, conversation: Operation.withInvocationOptions({ conversation: Obj.getURI(chatFeed) }) };
});
