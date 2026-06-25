//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { Instructions, Trace, Trigger } from '@dxos/compute';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
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

  test('scaffolds a routine draft graph with instructions, a feed trigger, and the event-item input binding', async ({
    expect,
  }) => {
    await Effect.gen(function* () {
      const mailbox = Mailbox.make({ name: 'Test Mailbox' });
      yield* Database.add(mailbox);
      yield* Database.flush();

      const draft = yield* crm.scaffold({ subject: mailbox });

      // The draft is a routine graph with a recognisable name, wired for an instructions action.
      expect(Obj.instanceOf(Routine.Routine, draft)).toBe(true);
      expect(draft.name).toContain('Test Mailbox');
      expect(draft.runnable).toBeDefined();

      // Feed trigger pointing at the mailbox's feed, owned by the routine.
      const trigger = draft.triggers[0]?.target;
      expect(trigger != null && Obj.instanceOf(Trigger.Trigger, trigger)).toBe(true);
      expect(trigger?.enabled).toBe(false);
      expect(trigger?.spec?.kind).toBe('feed');
      const triggerFeedUri = trigger?.spec?.kind === 'feed' ? trigger.spec.feed?.uri : undefined;
      expect(triggerFeedUri).toBe(mailbox.feed.uri);

      // The event-item input binding is preserved (the instructions ref is wired into the trigger input at
      // save time, not on the draft).
      expect(trigger?.input?.input).toBe('{{event.item}}');

      // The owned instructions is the routine's runnable (an instructions action).
      const instructions = Ref.isRef(draft.runnable) ? draft.runnable.target : undefined;
      expect(Obj.instanceOf(Instructions.Instructions, instructions)).toBe(true);
      expect(Obj.instanceOf(Instructions.Instructions, instructions) ? instructions.name : undefined).toContain(
        'Test Mailbox',
      );
      expect(Obj.instanceOf(Instructions.Instructions, instructions) ? instructions.skills : []).toHaveLength(
        SKILL_COUNT,
      );
    }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors);
  });
});
