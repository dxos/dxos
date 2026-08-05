//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { Routine, Trace, Trigger } from '@dxos/compute';
import { Database, Feed, Obj } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Mailbox } from '@dxos/plugin-inbox';

import { CrmOperation } from '../types';
import { crm } from './crm';

const dbLayer = TestDatabaseLayer({
  types: [Routine.Routine, Trigger.Trigger, Mailbox.Mailbox, Feed.Feed],
});

const TestLayer = Layer.mergeAll(dbLayer, Trace.writerLayerNoop);

describe('crm routine template', () => {
  test('applies only to a Mailbox subject', ({ expect }) => {
    const mailbox = Mailbox.make({ name: 'Test Mailbox' });
    expect(crm.appliesTo?.(mailbox)).toBe(true);
    expect(crm.appliesTo?.(undefined)).toBe(false);
  });

  test('scaffolds a routine draft bound to ProcessMailbox with a feed trigger', async ({ expect }) => {
    await Effect.gen(function* () {
      const mailbox = Mailbox.make({ name: 'Test Mailbox' });
      yield* Database.add(mailbox);
      yield* Database.flush();

      const draft = yield* crm.scaffold({ subject: mailbox });

      // The draft is a routine graph with a recognisable name, wired for an operation action.
      expect(Obj.instanceOf(Routine.Routine, draft)).toBe(true);
      expect(draft.name).toContain('Test Mailbox');
      expect(draft.spec?.kind).toBe('runnable');
      expect(draft.spec?.kind === 'runnable' && draft.spec.runnable.uri.toString()).toBe(
        CrmOperation.ProcessMailbox.meta.key.toString(),
      );

      // No model between trigger and operation: an operation action owns no instructions.
      expect(Routine.instructionsRef(draft)).toBeUndefined();

      // Feed trigger pointing at the mailbox's feed, owned by the routine.
      const trigger = draft.triggers[0]?.target;
      expect(trigger != null && Obj.instanceOf(Trigger.Trigger, trigger)).toBe(true);
      expect(trigger?.enabled).toBe(false);
      expect(trigger?.spec?.kind).toBe('feed');
      const triggerFeedUri = trigger?.spec?.kind === 'feed' ? trigger.spec.feed?.uri : undefined;
      expect(triggerFeedUri).toBe(mailbox.feed.uri);

      // The operation reads the mailbox itself, so the input carries the subject ref plus the research flag.
      expect(trigger?.input?.mailbox).toBeDefined();
      expect(trigger?.input?.research).toBe(true);
      expect(trigger?.concurrency).toBe(1);
    }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors);
  });
});
