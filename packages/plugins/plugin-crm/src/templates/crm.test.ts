//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { Operation, Routine, Trace, Trigger } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Query } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Automation } from '@dxos/plugin-automation';
import { Mailbox } from '@dxos/plugin-inbox';

import { crm } from './crm';

/** Number of blueprint keys wired into a CRM routine. */
const BLUEPRINT_COUNT = 4;

const dbLayer = TestDatabaseLayer({
  types: [
    Automation.Automation,
    Routine.Routine,
    Trigger.Trigger,
    Operation.PersistentOperation,
    Mailbox.Mailbox,
    Feed.Feed,
  ],
});

const TestLayer = Layer.mergeAll(dbLayer, Trace.writerLayerNoop);

describe('crm automation template', () => {
  test('applies only to a Mailbox subject', ({ expect }) => {
    const mailbox = Mailbox.make({ name: 'Test Mailbox' });
    expect(crm.appliesTo?.(mailbox)).toBe(true);
    expect(crm.appliesTo?.(undefined)).toBe(false);
  });

  test('scaffolds a Routine, a disabled feed Trigger, and an Automation wiring them together', async ({ expect }) => {
    await Effect.gen(function* () {
      const mailbox = Mailbox.make({ name: 'Test Mailbox' });
      yield* Database.add(mailbox);
      yield* Database.flush();

      const automation = yield* crm.scaffold({ subject: mailbox });
      yield* Database.add(automation);
      yield* Database.flush();

      expect(automation.triggers).toHaveLength(1);
      expect(automation.runnable).toBeDefined();

      const routines = yield* Database.query(Filter.type(Routine.Routine)).run;
      expect(routines).toHaveLength(1);
      expect(routines[0]?.name).toContain('Test Mailbox');
      expect(routines[0]?.blueprints).toHaveLength(BLUEPRINT_COUNT);

      const triggers = yield* Database.query(Query.select(Filter.type(Trigger.Trigger))).run;
      expect(triggers).toHaveLength(1);
      const trigger = triggers[0];
      expect(trigger?.enabled).toBe(false);
      expect(trigger?.spec?.kind).toBe('feed');
      const triggerFeedUri = trigger?.spec?.kind === 'feed' ? trigger.spec.feed?.uri : undefined;
      expect(triggerFeedUri).toBe(mailbox.feed.uri);
      expect(trigger?.input?.prompt).toBeDefined();
      expect(trigger?.input?.input).toBe('{{event.item}}');
      // The trigger is owned by the automation (cascade-deletes with it); the routine stays independent.
      expect(trigger && Obj.getParent(trigger)?.id).toBe(automation.id);
      expect(routines[0] && Obj.getParent(routines[0])).toBeUndefined();

      const operations = yield* Database.query(Filter.type(Operation.PersistentOperation)).run;
      expect(operations).toHaveLength(1);
      expect(automation.runnable?.uri).toBe(trigger?.function?.uri);
    }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors);
  });
});
