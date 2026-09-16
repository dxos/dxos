//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import * as Routine from '@dxos/compute/Routine';
import * as Trace from '@dxos/compute/Trace';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';

import { CrmOperation } from '#types';

import { crm } from './crm.ts';

const dbLayer = TestDatabaseLayer({
  types: [Routine.Routine, Trigger.Trigger, Mailbox.Mailbox, Feed.Feed],
});

const TestLayer = Layer.mergeAll(dbLayer, Trace.writerLayerNoop);

describe('crm routine template', () => {
  test('scaffolds a routine draft bound to ProcessMailbox with a feed trigger', async ({ expect }) => {
    await Effect.gen(function* () {
      const mailbox = Mailbox.make({ name: 'Test Mailbox' });
      yield* Database.add(mailbox);
      yield* Database.flush();

      const draft = yield* crm.scaffold({ input: { mailbox: Ref.make(mailbox) } });

      // The draft is a routine graph with a recognisable name, wired for an operation action.
      expect(Obj.instanceOf(Routine.Routine, draft)).toBe(true);
      expect(draft.name).toContain('Test Mailbox');
      expect(draft.spec?.kind).toBe('runnable');
      expect(draft.spec?.kind === 'runnable' && draft.spec.runnable.uri.toString()).toBe(
        CrmOperation.ProcessMailbox.meta.key.toString(),
      );

      // No model between trigger and operation: an operation action owns no instructions.
      expect(Routine.instructionsRef(draft)).toBeUndefined();

      // Feed trigger pointing at the mailbox's feed, enabled (the create dialog is the review step),
      // owned by the routine.
      const trigger = draft.triggers[0]?.target;
      expect(trigger != null && Obj.instanceOf(Trigger.Trigger, trigger)).toBe(true);
      expect(trigger?.enabled).toBe(true);
      expect(trigger?.spec?.kind).toBe('feed');
      const triggerFeedUri = trigger?.spec?.kind === 'feed' ? trigger.spec.feed?.uri : undefined;
      expect(triggerFeedUri).toBe(mailbox.feed.uri);

      // The operation reads the mailbox itself, so the input carries the subject ref plus the research flag.
      expect(trigger?.input?.mailbox?.target?.id).toBe(mailbox.id);
      expect(trigger?.input?.research).toBe(true);
      expect(trigger?.concurrency).toBe(1);
    }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors);
  });
});
