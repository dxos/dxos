//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { Instructions, Trace, Trigger } from '@dxos/compute';
import { Database, Feed, Obj } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Mailbox } from '@dxos/plugin-inbox';
import { Routine } from '@dxos/plugin-routine';

import { crm } from './crm';

/** Number of skill keys wired into a CRM routine. */
const SKILL_COUNT = 4;

const dbLayer = TestDatabaseLayer({
  types: [Routine.Routine, Instructions.Instructions, Trigger.Trigger, Mailbox.Mailbox, Feed.Feed],
});

const TestLayer = Layer.mergeAll(dbLayer, Trace.writerLayerNoop);

describe('crm routine template', () => {
  test('applies only to a Mailbox subject', ({ expect }) => {
    const mailbox = Mailbox.make({ name: 'Test Mailbox' });
    expect(crm.appliesTo?.(mailbox)).toBe(true);
    expect(crm.appliesTo?.(undefined)).toBe(false);
  });

  test('scaffolds a RoutineDraft with Instructions, a feed Trigger, and the event-item input binding', async ({
    expect,
  }) => {
    await Effect.gen(function* () {
      const mailbox = Mailbox.make({ name: 'Test Mailbox' });
      yield* Database.add(mailbox);
      yield* Database.flush();

      const draft = yield* crm.scaffold({ subject: mailbox });

      // Routine shell with a recognisable name.
      expect(Obj.instanceOf(Routine.Routine, draft.routine)).toBe(true);
      expect(draft.routine.name).toContain('Test Mailbox');
      expect(draft.routine.runnable).toBeUndefined();

      // Instructions wired with the right number of skills.
      expect(Obj.instanceOf(Instructions.Instructions, draft.instructions)).toBe(true);
      expect(draft.instructions?.name).toContain('Test Mailbox');
      expect(draft.instructions?.skills).toHaveLength(SKILL_COUNT);

      // Feed trigger pointing at the mailbox's feed.
      expect(Obj.instanceOf(Trigger.Trigger, draft.trigger)).toBe(true);
      expect(draft.trigger?.enabled).toBe(false);
      expect(draft.trigger?.spec?.kind).toBe('feed');
      const triggerFeedUri = draft.trigger?.spec?.kind === 'feed' ? draft.trigger.spec.feed?.uri : undefined;
      expect(triggerFeedUri).toBe(mailbox.feed.uri);

      // The `instructions` ref is NOT in the draft trigger's input — saveRoutine merges it at persist time.
      // The event-item binding should already be present.
      expect(draft.trigger?.input?.input).toBe('{{event.item}}');
      expect(draft.trigger?.input?.instructions).toBeUndefined();
    }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors);
  });
});
