//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Operation, Trigger } from '@dxos/compute';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';

import { OperationTestLayer } from '../../../testing';
import { Agent } from '../../../types';
import { AgentWorker } from '../../agent/operations/definitions';
import AgentSkillDef from '../../agent/skill';
import { AgentWizardOperations } from '../index';

EntityId.dangerouslyDisableRandomness();

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
            skills: [Ref.make(AgentSkillDef.make())],
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
      Effect.provide(OperationTestLayer),
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
            skills: [Ref.make(AgentSkillDef.make())],
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
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
