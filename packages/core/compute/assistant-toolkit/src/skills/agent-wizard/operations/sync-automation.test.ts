//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Operation, Routine, Trigger } from '@dxos/compute';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';

import { OperationTestLayer } from '../../../testing';
import { Agent } from '../../../types';
import { Relay } from '../../agent/operations/definitions';
import AgentSkillDef from '../../agent/skill';
import { AgentWizardOperations } from '../index';

EntityId.dangerouslyDisableRandomness();

describe('SyncAutomation', () => {
  const skill = AgentSkillDef.make();

  it.effect(
    'cron creates a timer routine that relays into the agent session',
    Effect.fnUntraced(
      function* (_) {
        const cron = '*/5 * * * *';
        const agent = yield* Agent.makeInitialized(
          { name: 'Scheduled agent', instructions: 'A scheduled agent that runs on a timer.' },
          skill,
        );
        yield* Database.flush();

        yield* Operation.invoke(AgentWizardOperations.SyncAutomation, { agent: Ref.make(agent), cron });

        const triggers = yield* Database.query(
          Query.select(Filter.type(Trigger.Trigger)).debugLabel('assistant-toolkit.sync-automation.timer'),
        ).run;
        const timerTriggers = triggers.filter(
          (trigger) => trigger.spec?.kind === 'timer' && trigger.spec.cron === cron,
        );
        expect(timerTriggers).toHaveLength(1);

        const timerTrigger = timerTriggers[0];
        expect(timerTrigger.enabled).toBe(true);

        // The timer routine relays a synthetic wake prompt into the agent's durable session.
        invariant(timerTrigger.runnable);
        const operation = yield* Database.load(timerTrigger.runnable);
        invariant(Obj.instanceOf(Operation.PersistentOperation, operation));
        expect(Obj.getMeta(operation).key).toBe(Relay.meta.key);

        // The trigger is wrapped in a user-facing Routine aggregate.
        const routines = yield* Database.query(
          Query.select(Filter.type(Routine.Routine)).debugLabel('assistant-toolkit.sync-automation.timer-routine'),
        ).run;
        expect(routines).toHaveLength(1);
        expect(routines[0].triggers.map((ref) => ref.uri)).toContain(Ref.make(timerTrigger).uri);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'copies enabled from the agent onto every trigger',
    Effect.fnUntraced(
      function* (_) {
        const cron = '0 9 * * *';
        const agent = yield* Agent.makeInitialized(
          { name: 'Toggle agent', instructions: 'Test enabled propagation.', enabled: false },
          skill,
        );
        yield* Database.flush();

        yield* Operation.invoke(AgentWizardOperations.SyncAutomation, { agent: Ref.make(agent), cron });

        const triggers = yield* Database.query(
          Query.select(Filter.type(Trigger.Trigger)).debugLabel('assistant-toolkit.sync-automation.toggle'),
        ).run;
        // `every` is vacuously true on an empty array; assert the triggers exist first.
        expect(triggers.length).toBeGreaterThan(0);
        expect(triggers.every((trigger) => trigger.enabled === false)).toBe(true);

        Obj.update(agent, (agent) => {
          agent.enabled = true;
        });
        yield* Database.flush();
        yield* Operation.invoke(AgentWizardOperations.SyncAutomation, { agent: Ref.make(agent), cron });

        const triggersAfter = yield* Database.query(
          Query.select(Filter.type(Trigger.Trigger)).debugLabel('assistant-toolkit.sync-automation.after'),
        ).run;
        expect(triggersAfter).toHaveLength(triggers.length);
        expect(triggersAfter.every((trigger) => trigger.enabled === true)).toBe(true);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
