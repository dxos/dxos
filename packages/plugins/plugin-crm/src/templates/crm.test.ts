//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { Operation, Routine, Trace, Trigger } from '@dxos/compute';
import { Database, Feed, Filter, Query } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Mailbox } from '@dxos/plugin-inbox';

import { crm } from './crm';

/** Number of blueprint keys wired into a CRM routine. */
const BLUEPRINT_COUNT = 4;

const dbLayer = TestDatabaseLayer({
  types: [Routine.Routine, Trigger.Trigger, Operation.PersistentOperation, Mailbox.Mailbox, Feed.Feed],
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
      // Arrange — create a mailbox; ECHO adds the feed as a child automatically.
      const mailbox = Mailbox.make({ name: 'Test Mailbox' });
      yield* Database.add(mailbox);
      yield* Database.flush();

      // Act — run the template scaffold.
      const automation = yield* crm.scaffold({ subject: mailbox });

      // The returned Automation references one trigger and the runnable (AgentPrompt).
      expect(automation.triggers).toHaveLength(1);
      expect(automation.runnable).toBeDefined();

      // A single Routine exists, named after the mailbox, carrying the CRM + supporting blueprints.
      const routines = yield* Database.query(Filter.type(Routine.Routine)).run;
      expect(routines).toHaveLength(1);
      expect(routines[0]?.name).toContain('Test Mailbox');
      // Blueprint refs are registry-bound (Ref.fromURI), not local DB copies.
      expect(routines[0]?.blueprints).toHaveLength(BLUEPRINT_COUNT);

      // A single disabled feed Trigger exists, bound to the mailbox's feed.
      const triggers = yield* Database.query(Query.select(Filter.type(Trigger.Trigger))).run;
      expect(triggers).toHaveLength(1);
      const trigger = triggers[0];
      // Starts disabled so the user can review instructions before activating.
      expect(trigger?.enabled).toBe(false);
      expect(trigger?.spec?.kind).toBe('feed');
      const triggerFeedUri = trigger?.spec?.kind === 'feed' ? trigger.spec.feed?.uri : undefined;
      expect(triggerFeedUri).toBe(mailbox.feed.uri);
      // The trigger input references the routine and uses the message template.
      expect(trigger?.input?.prompt).toBeDefined();
      expect(trigger?.input?.input).toBe('{{event.item}}');

      // The Automation's runnable and the trigger's function both reference the AgentPrompt operation.
      const operations = yield* Database.query(Filter.type(Operation.PersistentOperation)).run;
      expect(operations).toHaveLength(1);
      expect(automation.runnable?.uri).toBe(trigger?.function?.uri);
    }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors);
  });
});
