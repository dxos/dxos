//
// Copyright 2026 DXOS.org
//

import { subDays } from 'date-fns';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Filter, Obj, Query, Ref, Scope, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Cursor } from '@dxos/link';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as SystemTags from '@dxos/plugin-inbox/SystemTags';
import { ambientSyncServices, seedMailboxBinding } from '@dxos/plugin-inbox/testing/sync';
import { TagIndex, Tagging } from '@dxos/schema';
import { Message } from '@dxos/types';

import { type GmailDataset, GoogleMailApi } from '#services';

import { GMAIL_CONNECTOR_ID, GMAIL_SOURCE } from '../../../constants';
import { GoogleApiError } from '../../../errors';
import { generateGmailDataset } from '../../../testing/gmail-fixtures';
import { runGoogleSync } from '../../../testing/sync-fixture';

/**
 * Bidirectional tag sync against the mock provider — the local → provider half that
 * `plugin-inbox/docs/TAG-SYNC.md` designs. The mock holds mutable per-message label state, so a push
 * is observable by reading the labels back through the same API the sync writes through.
 */

const seedGmailBinding = (
  builder: EchoTestBuilder,
  options: Omit<Parameters<typeof seedMailboxBinding>[1], 'source' | 'connectorId'> = {},
) => seedMailboxBinding(builder, { source: GMAIL_SOURCE, connectorId: GMAIL_CONNECTOR_ID, ...options });

describe('gmail tag push', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const now = new Date('2026-07-16T12:00:00.000Z');

  /** Records every batchModify the sync issues, so a test can assert what was pushed. */
  const recordingApi = (dataset: GmailDataset) => {
    const pushes: { ids: readonly string[]; add: readonly string[]; remove: readonly string[] }[] = [];
    const layer = Layer.effect(
      GoogleMailApi,
      Effect.gen(function* () {
        const inner = yield* GoogleMailApi;
        return GoogleMailApi.of({
          ...inner,
          batchModifyMessages: (userId, ids, labels) => {
            pushes.push({ ids, add: labels.addLabelIds ?? [], remove: labels.removeLabelIds ?? [] });
            return inner.batchModifyMessages(userId, ids, labels);
          },
        });
      }),
    ).pipe(Layer.provide(GoogleMailApi.mock(dataset)));
    return { layer, pushes };
  };

  /** The feed message carrying the given Gmail id. */
  const feedMessageFor = async (db: Database.Database, mailbox: Mailbox.Mailbox, gmailId: string) => {
    const feed = mailbox.feed.target!;
    const items = await db
      .query(Query.select(Filter.type(Message.Message)).from(Scope.feed(Feed.getFeedUri(feed)!)))
      .run();
    return items.find((message) =>
      Obj.getMeta(message).keys.some((key) => key.source === GMAIL_SOURCE && key.id === gmailId),
    )!;
  };

  /**
   * Copies the heads out of the cursor. `spec.tagHeads` is a live ECHO array, so holding the reference
   * across a run compares the value against itself — a snapshot is what makes "did the base advance?"
   * answerable.
   */
  const tagHeadsOf = (binding: Cursor.Cursor) =>
    binding.spec.kind === 'external' && binding.spec.tagHeads ? [...binding.spec.tagHeads] : undefined;

  test('a first sync records a base but pushes nothing', async ({ expect }) => {
    const dataset = {
      ...generateGmailDataset({ count: 3, seed: 41, start: subDays(now, 6), end: subDays(now, 2) }),
      historyId: '1000',
    };
    const { db, binding } = await seedGmailBinding(builder, { options: { syncBackDays: 14 } });
    const { layer, pushes } = recordingApi(dataset);

    await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding), now }).pipe(
        Effect.provide(Layer.mergeAll(layer, ambientSyncServices(db))),
      ),
    );

    // Nothing was local-only, and with no prior base the push half is suppressed regardless.
    expect(pushes).toEqual([]);
    // The base is recorded, so the NEXT run can tell a local change from a synced one.
    expect(tagHeadsOf(binding)?.length).toBeGreaterThan(0);
  });

  test('a locally applied star reaches Gmail on the next sync', async ({ expect }) => {
    const dataset = {
      ...generateGmailDataset({ count: 3, seed: 42, start: subDays(now, 6), end: subDays(now, 2) }),
      historyId: '1000',
    };
    const { db, mailbox, binding } = await seedGmailBinding(builder, { options: { syncBackDays: 14 } });
    const { layer, pushes } = recordingApi(dataset);
    const services = Layer.mergeAll(layer, ambientSyncServices(db));

    // Run 1: pull the messages and record the base.
    await EffectEx.runPromise(runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(services)));
    const baseHeads = tagHeadsOf(binding);
    expect(baseHeads?.length).toBeGreaterThan(0);

    // The user stars a message in Composer.
    const target = dataset.messages[0];
    const message = await feedMessageFor(db, mailbox, target.id);
    const tagIndex = await EffectEx.runPromise(Database.load(mailbox.tags).pipe(Effect.provide(Database.layer(db))));
    const starred = await Tag.findOrCreate(db, {
      key: SystemTags.systemTagKey('starred'),
      label: 'Starred',
    });
    Tagging.set(message, Obj.getURI(starred).toString(), { index: tagIndex });
    await db.flush({ indexes: true });

    // Run 2: the diff sees a local-only addition and pushes it.
    await EffectEx.runPromise(runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(services)));

    expect(pushes).toHaveLength(1);
    expect(pushes[0].add).toEqual(['STARRED']);
    expect(pushes[0].remove).toEqual([]);
    expect(pushes[0].ids).toContain(target.id);

    // Observable through the API the sync writes through, not just the recorder.
    const labels = await EffectEx.runPromise(
      Effect.flatMap(GoogleMailApi, (api) => api.getMessage('me', target.id)).pipe(Effect.provide(layer)),
    );
    expect(labels.labelIds).toContain('STARRED');

    // The base advanced, so the same change is not pushed again.
    expect(tagHeadsOf(binding)).not.toEqual(baseHeads);
  });

  test('archiving locally removes the INBOX label at Gmail', async ({ expect }) => {
    const dataset = {
      ...generateGmailDataset({ count: 2, seed: 43, start: subDays(now, 6), end: subDays(now, 2) }),
      historyId: '1000',
    };
    const { db, mailbox, binding } = await seedGmailBinding(builder, { options: { syncBackDays: 14 } });
    const { layer, pushes } = recordingApi(dataset);
    const services = Layer.mergeAll(layer, ambientSyncServices(db));

    await EffectEx.runPromise(runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(services)));

    // Archive = the `inbox` tag coming off (see TASKS.md §Phase 1 DECIDED).
    const target = dataset.messages[0];
    const message = await feedMessageFor(db, mailbox, target.id);
    const tagIndex = await EffectEx.runPromise(Database.load(mailbox.tags).pipe(Effect.provide(Database.layer(db))));
    const inbox = await Tag.findOrCreate(db, { key: SystemTags.systemTagKey('inbox'), label: 'Inbox' });
    const inboxUri = Obj.getURI(inbox).toString();
    expect(TagIndex.bind(tagIndex).tags(message.id)).toContain(inboxUri);
    Tagging.unset(message, inboxUri, { index: tagIndex });
    await db.flush({ indexes: true });

    await EffectEx.runPromise(runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(services)));

    expect(pushes).toHaveLength(1);
    expect(pushes[0].remove).toEqual(['INBOX']);
    const labels = await EffectEx.runPromise(
      Effect.flatMap(GoogleMailApi, (api) => api.getMessage('me', target.id)).pipe(Effect.provide(layer)),
    );
    expect(labels.labelIds).not.toContain('INBOX');
  });

  test('a tag pulled from Gmail is never pushed back at it', async ({ expect }) => {
    const dataset = {
      ...generateGmailDataset({ count: 3, seed: 44, start: subDays(now, 6), end: subDays(now, 2) }),
      historyId: '1000',
    };
    const { db, binding } = await seedGmailBinding(builder, { options: { syncBackDays: 14 } });
    const { layer, pushes } = recordingApi(dataset);
    const services = Layer.mergeAll(layer, ambientSyncServices(db));

    // Two runs with no local edits at all: every tag on every message came from Gmail.
    await EffectEx.runPromise(runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(services)));
    await EffectEx.runPromise(runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(services)));

    expect(pushes).toEqual([]);
  });

  test('a user tag has no provider binding and is never pushed', async ({ expect }) => {
    const dataset = {
      ...generateGmailDataset({ count: 2, seed: 45, start: subDays(now, 6), end: subDays(now, 2) }),
      historyId: '1000',
    };
    const { db, mailbox, binding } = await seedGmailBinding(builder, { options: { syncBackDays: 14 } });
    const { layer, pushes } = recordingApi(dataset);
    const services = Layer.mergeAll(layer, ambientSyncServices(db));

    await EffectEx.runPromise(runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(services)));

    const target = dataset.messages[0];
    const message = await feedMessageFor(db, mailbox, target.id);
    const tagIndex = await EffectEx.runPromise(Database.load(mailbox.tags).pipe(Effect.provide(Database.layer(db))));
    // A plain user tag: no foreign key, so no Gmail label, so nothing to push.
    const followUp = await Tag.findOrCreate(db, { label: 'Follow up' });
    Tagging.set(message, Obj.getURI(followUp).toString(), { index: tagIndex });
    await db.flush({ indexes: true });

    await EffectEx.runPromise(runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(services)));

    expect(pushes).toEqual([]);
    // The tag is still there locally — it is simply not the provider's business.
    expect(TagIndex.bind(tagIndex).tags(message.id)).toContain(Obj.getURI(followUp).toString());
  });

  test('a transient push failure holds the base back so the change is retried', async ({ expect }) => {
    const dataset = {
      ...generateGmailDataset({ count: 2, seed: 46, start: subDays(now, 6), end: subDays(now, 2) }),
      historyId: '1000',
    };
    const { db, mailbox, binding } = await seedGmailBinding(builder, { options: { syncBackDays: 14 } });

    let failNext = false;
    const failing = Layer.effect(
      GoogleMailApi,
      Effect.gen(function* () {
        const inner = yield* GoogleMailApi;
        return GoogleMailApi.of({
          ...inner,
          batchModifyMessages: (userId, ids, labels) =>
            failNext
              ? Effect.fail(new GoogleApiError(503, 'Backend error.'))
              : inner.batchModifyMessages(userId, ids, labels),
        });
      }),
    ).pipe(Layer.provide(GoogleMailApi.mock(dataset)));
    const services = Layer.mergeAll(failing, ambientSyncServices(db));

    await EffectEx.runPromise(runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(services)));
    const baseAfterPull = tagHeadsOf(binding);

    const target = dataset.messages[0];
    const message = await feedMessageFor(db, mailbox, target.id);
    const tagIndex = await EffectEx.runPromise(Database.load(mailbox.tags).pipe(Effect.provide(Database.layer(db))));
    const starred = await Tag.findOrCreate(db, {
      key: SystemTags.systemTagKey('starred'),
      label: 'Starred',
    });
    Tagging.set(message, Obj.getURI(starred).toString(), { index: tagIndex });
    await db.flush({ indexes: true });

    failNext = true;
    await EffectEx.runPromise(
      Effect.exit(runGoogleSync({ binding: Ref.make(binding), now })).pipe(Effect.provide(services)),
    );

    // The base did not advance, so the next run re-derives the same diff rather than losing the star.
    expect(tagHeadsOf(binding)).toEqual(baseAfterPull);
  });
});

describe('gmail tag push — the reconciliation base', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const now = new Date('2026-07-16T12:00:00.000Z');

  const recordingApi = (dataset: GmailDataset) => {
    const pushes: { ids: readonly string[]; add: readonly string[]; remove: readonly string[] }[] = [];
    const layer = Layer.effect(
      GoogleMailApi,
      Effect.gen(function* () {
        const inner = yield* GoogleMailApi;
        return GoogleMailApi.of({
          ...inner,
          batchModifyMessages: (userId, ids, labels) => {
            pushes.push({ ids, add: labels.addLabelIds ?? [], remove: labels.removeLabelIds ?? [] });
            return inner.batchModifyMessages(userId, ids, labels);
          },
        });
      }),
    ).pipe(Layer.provide(GoogleMailApi.mock(dataset)));
    return { layer, pushes };
  };

  /**
   * The load-bearing ECHO assumption behind the whole design: heads persisted at the end of one run
   * reconstruct that run's tag state later, even after the index has moved on. If this stops holding,
   * the base must switch to a shadow index (see `docs/TAG-SYNC.md` §"Why not the alternatives").
   */
  test('Obj.getVersion reconstructs the tag index as of stored heads', async ({ expect }) => {
    const dataset = {
      ...generateGmailDataset({ count: 2, seed: 61, start: subDays(now, 6), end: subDays(now, 2) }),
      historyId: '1000',
    };
    const { db, mailbox, binding } = await seedGmailBinding(builder, { options: { syncBackDays: 14 } });
    const { layer } = recordingApi(dataset);

    await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding), now }).pipe(
        Effect.provide(Layer.mergeAll(layer, ambientSyncServices(db))),
      ),
    );

    const heads = binding.spec.kind === 'external' ? [...(binding.spec.tagHeads ?? [])] : [];
    expect(heads.length).toBeGreaterThan(0);

    const tagIndex = await EffectEx.runPromise(Database.load(mailbox.tags).pipe(Effect.provide(Database.layer(db))));
    const before = JSON.parse(JSON.stringify(tagIndex.index ?? {}));

    // Mutate after the heads were taken.
    const followUp = await Tag.findOrCreate(db, { label: 'Follow up' });
    const message = await (async () => {
      const feed = mailbox.feed.target!;
      const items = await db
        .query(Query.select(Filter.type(Message.Message)).from(Scope.feed(Feed.getFeedUri(feed)!)))
        .run();
      return items[0];
    })();
    Tagging.set(message, Obj.getURI(followUp).toString(), { index: tagIndex });
    await db.flush({ indexes: true });

    // The live index moved; the historical view did not.
    expect(TagIndex.bind(tagIndex).tags(message.id)).toContain(Obj.getURI(followUp).toString());
    const historical = Obj.getVersion(tagIndex, heads);
    expect(JSON.parse(JSON.stringify(historical.index ?? {}))).toEqual(before);
  });

  /**
   * Heads that no longer resolve (compaction, an epoch, a fresh replica on another runtime) must not
   * take the local side down with them. The run falls back to an additive reconcile: it may re-push a
   * tag the provider already has, but it must never synthesise a removal from a base it cannot read.
   */
  test('unresolvable heads fall back to an additive reconcile that emits no removals', async ({ expect }) => {
    const dataset = {
      ...generateGmailDataset({ count: 2, seed: 62, start: subDays(now, 6), end: subDays(now, 2) }),
      historyId: '1000',
    };
    const { db, mailbox, binding } = await seedGmailBinding(builder, { options: { syncBackDays: 14 } });
    const { layer, pushes } = recordingApi(dataset);
    const services = Layer.mergeAll(layer, ambientSyncServices(db));

    await EffectEx.runPromise(runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(services)));

    // Archive locally — a removal, which the additive path must refuse to push.
    const feed = mailbox.feed.target!;
    const items = await db
      .query(Query.select(Filter.type(Message.Message)).from(Scope.feed(Feed.getFeedUri(feed)!)))
      .run();
    const message = items[0];
    const tagIndex = await EffectEx.runPromise(Database.load(mailbox.tags).pipe(Effect.provide(Database.layer(db))));
    const inbox = await Tag.findOrCreate(db, { key: SystemTags.systemTagKey('inbox'), label: 'Inbox' });
    Tagging.unset(message, Obj.getURI(inbox).toString(), { index: tagIndex });
    await db.flush({ indexes: true });

    // A head the replica cannot resolve — the shape of a compacted or evicted history.
    Obj.update(binding, (binding) => {
      if (binding.spec.kind === 'external') {
        binding.spec.tagHeads = ['0000000000000000000000000000000000000000000000000000000000000000'];
      }
    });

    const exit = await EffectEx.runPromise(
      Effect.exit(runGoogleSync({ binding: Ref.make(binding), now })).pipe(Effect.provide(services)),
    );

    // The run survives, and nothing destructive was sent.
    expect(exit._tag).toBe('Success');
    for (const push of pushes) {
      expect(push.remove).toEqual([]);
    }
  });
});
