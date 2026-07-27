//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayerWithTriggers } from '@dxos/agent-runtime/testing';
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

import { Agent, Chat, Plan } from '../../../types';
import { AgentSkillHandlers } from '../../agent/operations';
import { AgentWorker } from '../../agent/operations/definitions';
import AgentSkillDef from '../../agent/skill';
import { AgentWizardHandlers, AgentWizardOperations } from '../index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayerWithTriggers({
  operationHandlers: OperationHandlerSet.merge(AgentSkillHandlers, AgentWizardHandlers, MarkdownOperationHandlerSet),
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
  disableLlmMemoization: true,
});

describe('SyncTriggers', () => {
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
});
