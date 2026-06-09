//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { Operation, Routine, Trace, Trigger } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Query } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-db/testing';
import { EffectEx } from '@dxos/effect';
import { Mailbox } from '@dxos/plugin-inbox';

import setupMailboxCrmHandler from './setup-mailbox-crm';

/** Number of blueprint keys wired into a CRM routine. */
const BLUEPRINT_COUNT = 4;

const dbLayer = TestDatabaseLayer({
  types: [Routine.Routine, Trigger.Trigger, Operation.PersistentOperation, Mailbox.Mailbox, Feed.Feed],
});

const TestLayer = Layer.mergeAll(dbLayer, Trace.writerLayerNoop);

describe('SetupMailboxCrm operation', () => {
  test('creates a Routine and disabled feed Trigger for the given mailbox', async ({ expect }) => {
    await Effect.gen(function* () {
      // Arrange — create a mailbox; ECHO adds the feed as a child automatically.
      const mailbox = Mailbox.make({ name: 'Test Mailbox' });
      yield* Database.add(mailbox);
      yield* Database.flush();

      const mailboxUri = Obj.getURI(mailbox);

      // Act — invoke the handler.
      yield* setupMailboxCrmHandler.handler({ mailboxUri });

      // Assert: exactly one Routine exists, named after the mailbox.
      const routines = yield* Database.runQuery(Filter.type(Routine.Routine));
      expect(routines).toHaveLength(1);

      const routine = routines[0];
      expect(routine?.name).toContain('Test Mailbox');
      // Blueprint refs are registry-bound (Ref.fromURI), not local DB copies.
      expect(routine?.blueprints).toHaveLength(BLUEPRINT_COUNT);

      // Assert: exactly one disabled feed Trigger exists.
      const triggers = yield* Database.runQuery(Query.select(Filter.type(Trigger.Trigger)));
      expect(triggers).toHaveLength(1);

      const trigger = triggers[0];
      // Trigger starts disabled so user can review instructions before activating.
      expect(trigger?.enabled).toBe(false);
      expect(trigger?.spec?.kind).toBe('feed');

      // The trigger's feed URI must match the mailbox's feed URI.
      const triggerFeedUri = trigger?.spec?.kind === 'feed' ? trigger.spec.feed?.uri : undefined;
      expect(triggerFeedUri).toBe(mailbox.feed.uri);

      // The trigger input must reference the routine and use the message template.
      expect(trigger?.input?.prompt).toBeDefined();
      expect(trigger?.input?.input).toBe('{{event.item}}');
    }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors);
  });

  test('isCrmTrigger identity check recognises the created trigger as configured', async ({ expect }) => {
    await Effect.gen(function* () {
      const mailbox = Mailbox.make({ name: 'Identity Mailbox' });
      yield* Database.add(mailbox);
      yield* Database.flush();

      yield* setupMailboxCrmHandler.handler({ mailboxUri: Obj.getURI(mailbox) });

      const triggers = yield* Database.runQuery(Query.select(Filter.type(Trigger.Trigger)));
      const mailboxFeedUri = mailbox.feed.uri;

      // Apply the same identity predicate used by useCrmRoutine.
      const matched = triggers.filter((trigger) => {
        if (trigger.spec?.kind !== 'feed') {
          return false;
        }
        return trigger.spec.feed?.uri === mailboxFeedUri && Boolean(trigger.input?.prompt);
      });

      expect(matched).toHaveLength(1);
    }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors);
  });
});
