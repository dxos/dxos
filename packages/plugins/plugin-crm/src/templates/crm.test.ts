//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { Instructions, Operation, Trace, Trigger } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Query } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Mailbox } from '@dxos/plugin-inbox';
import { Routine } from '@dxos/plugin-routine';

import { crm } from './crm';

/** Number of skill keys wired into a CRM routine. */
const SKILL_COUNT = 4;

const dbLayer = TestDatabaseLayer({
  types: [
    Routine.Routine,
    Instructions.Instructions,
    Trigger.Trigger,
    Operation.PersistentOperation,
    Mailbox.Mailbox,
    Feed.Feed,
  ],
});

const TestLayer = Layer.mergeAll(dbLayer, Trace.writerLayerNoop);

describe('crm routine template', () => {
  test('applies only to a Mailbox subject', ({ expect }) => {
    const mailbox = Mailbox.make({ name: 'Test Mailbox' });
    expect(crm.appliesTo?.(mailbox)).toBe(true);
    expect(crm.appliesTo?.(undefined)).toBe(false);
  });

  test('scaffolds a Routine, a disabled feed Trigger, and an Instructions wiring them together', async ({ expect }) => {
    await Effect.gen(function* () {
      const mailbox = Mailbox.make({ name: 'Test Mailbox' });
      yield* Database.add(mailbox);
      yield* Database.flush();

      const routine = yield* crm.scaffold({ subject: mailbox });
      yield* Database.add(routine);
      yield* Database.flush();

      expect(routine.triggers).toHaveLength(1);
      expect(routine.runnable).toBeDefined();

      const routines = yield* Database.query(Filter.type(Instructions.Instructions)).run;
      expect(routines).toHaveLength(1);
      expect(routines[0]?.name).toContain('Test Mailbox');
      expect(routines[0]?.skills).toHaveLength(SKILL_COUNT);

      const triggers = yield* Database.query(Query.select(Filter.type(Trigger.Trigger))).run;
      expect(triggers).toHaveLength(1);
      const trigger = triggers[0];
      expect(trigger?.enabled).toBe(false);
      expect(trigger?.spec?.kind).toBe('feed');
      const triggerFeedUri = trigger?.spec?.kind === 'feed' ? trigger.spec.feed?.uri : undefined;
      expect(triggerFeedUri).toBe(mailbox.feed.uri);
      expect(trigger?.input?.instructions).toBeDefined();
      expect(trigger?.input?.input).toBe('{{event.item}}');
      // The trigger is owned by the routine (cascade-deletes with it); the instructions stays independent.
      expect(trigger && Obj.getParent(trigger)?.id).toBe(routine.id);
      expect(routines[0] && Obj.getParent(routines[0])).toBeUndefined();

      const operations = yield* Database.query(Filter.type(Operation.PersistentOperation)).run;
      expect(operations).toHaveLength(1);
      expect(routine.runnable?.uri).toBe(trigger?.runnable?.uri);
    }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors);
  });
});
