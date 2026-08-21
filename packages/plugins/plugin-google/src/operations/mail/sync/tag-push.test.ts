//
// Copyright 2026 DXOS.org
//

import { subDays } from 'date-fns';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { PROGRESS_STATUS_COMPLETE } from '@dxos/app-toolkit';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Filter, Obj, Query, Ref, Scope, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Cursor } from '@dxos/link';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as SystemTags from '@dxos/plugin-inbox/SystemTags';
import { ambientSyncServices, seedMailboxBinding } from '@dxos/plugin-inbox/testing/sync';
import { Tagging, TagIndex } from '@dxos/schema';
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

  /**
   * Gmail records a client's own label write in the account history, so the run AFTER a push sees its
   * own change come back as a delta (verified live against a real account). The ordering rule absorbs
   * it: the tag is already in the base by then, so all three sides agree and nothing is emitted.
   *
   * The mock appends a history step for every write made through it, which is what lets this be a unit
   * test rather than something only the live suite can prove. Get the ordering wrong and this loops
   * forever, pushing the same tag on every run.
   */
  test('the provider echoing our own push back produces no second push', async ({ expect }) => {
    const dataset = {
      ...generateGmailDataset({ count: 2, seed: 81, start: subDays(now, 6), end: subDays(now, 2) }),
      historyId: '1000',
    };
    const { db, mailbox, binding } = await seedGmailBinding(builder, { options: { syncBackDays: 14 } });
    const { layer, pushes } = recordingApi(dataset);
    const services = Layer.mergeAll(layer, ambientSyncServices(db));

    await EffectEx.runPromise(runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(services)));

    const target = dataset.messages[0];
    const message = await feedMessageFor(db, mailbox, target.id);
    const tagIndex = await EffectEx.runPromise(Database.load(mailbox.tags).pipe(Effect.provide(Database.layer(db))));
    const starred = await Tag.findOrCreate(db, { key: SystemTags.systemTagKey('starred'), label: 'Starred' });
    Tagging.set(message, Obj.getURI(starred).toString(), { index: tagIndex });
    await db.flush({ indexes: true });

    // Run 2 pushes the star; the mock records a history step for it, exactly as Gmail would.
    await EffectEx.runPromise(runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(services)));
    expect(pushes).toHaveLength(1);

    // Run 3 reads that step as an incoming delta — the echo. Nothing further may be pushed, and the
    // tag must survive rather than being reconciled away.
    await EffectEx.runPromise(runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(services)));
    expect(pushes).toHaveLength(1);
    expect(TagIndex.bind(tagIndex).tags(message.id)).toContain(Obj.getURI(starred).toString());
  });

  /**
   * The push phase runs OUTSIDE the pipeline's `tapError`, so a defect escaping it would end the run
   * with no terminal status — leaving the progress key live and the mailbox's Sync button disabled
   * until the user navigates away. The pull has already committed by then, so losing the push is a
   * degradation; losing the completion signal is a visible break. Regression for exactly that.
   */
  test('a broken push phase still completes the run and reports COMPLETE', async ({ expect }) => {
    const dataset = {
      ...generateGmailDataset({ count: 2, seed: 91, start: subDays(now, 6), end: subDays(now, 2) }),
      historyId: '1000',
    };
    const { db, mailbox, binding } = await seedGmailBinding(builder, { options: { syncBackDays: 14 } });

    // A provider whose push DEFECTS (dies) rather than failing in the typed error channel — the shape
    // an unexpected bug takes, and the one a `catch` on the error channel alone would not contain.
    const exploding = Layer.effect(
      GoogleMailApi,
      Effect.gen(function* () {
        const inner = yield* GoogleMailApi;
        return GoogleMailApi.of({
          ...inner,
          batchModifyMessages: () => Effect.die(new Error('injected push defect')),
        });
      }),
    ).pipe(Layer.provide(GoogleMailApi.mock(dataset)));

    const statusUpdates: Trace.PayloadType<typeof Trace.StatusUpdate>[] = [];
    const traceLayer = Trace.testTraceService().pipe(
      Layer.provide(
        Layer.succeed(Trace.TraceSink, {
          write: (message) => {
            for (const event of Trace.flatten(message)) {
              if (Trace.isOfType(Trace.StatusUpdate, event)) {
                statusUpdates.push(event.data);
              }
            }
          },
        }),
      ),
    );
    const services = Layer.mergeAll(exploding, ambientSyncServices(db, { traceLayer }));

    await EffectEx.runPromise(runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(services)));

    const target = dataset.messages[0];
    const message = await feedMessageFor(db, mailbox, target.id);
    const tagIndex = await EffectEx.runPromise(Database.load(mailbox.tags).pipe(Effect.provide(Database.layer(db))));
    const starred = await Tag.findOrCreate(db, { key: SystemTags.systemTagKey('starred'), label: 'Starred' });
    Tagging.set(message, Obj.getURI(starred).toString(), { index: tagIndex });
    await db.flush({ indexes: true });

    statusUpdates.length = 0;
    const result = await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(services)),
    );

    // The run completes rather than dying, and the meter is released.
    expect(result.newMessages).toBe(0);
    expect(statusUpdates.map((update) => update.message)).toContain(PROGRESS_STATUS_COMPLETE);
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

describe('gmail tag push — unpushable labels', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const now = new Date('2026-07-16T12:00:00.000Z');

  /**
   * `SENT` maps inbound but Gmail refuses it in a `modify` write (`400 Invalid label: SENT`, verified
   * live). The send flow applies the canonical `sent` tag locally on every send, so without the
   * exclusion every sent message would produce a permanent 400 — an error per message for a change
   * that could never have been applied.
   */
  test('the canonical `sent` tag is never pushed', async ({ expect }) => {
    const dataset = {
      ...generateGmailDataset({ count: 2, seed: 71, start: subDays(now, 6), end: subDays(now, 2) }),
      historyId: '1000',
    };
    const { db, mailbox, binding } = await seedGmailBinding(builder, { options: { syncBackDays: 14 } });
    const pushes: { add: readonly string[]; remove: readonly string[] }[] = [];
    const layer = Layer.effect(
      GoogleMailApi,
      Effect.gen(function* () {
        const inner = yield* GoogleMailApi;
        return GoogleMailApi.of({
          ...inner,
          batchModifyMessages: (userId, ids, labels) => {
            pushes.push({ add: labels.addLabelIds ?? [], remove: labels.removeLabelIds ?? [] });
            return inner.batchModifyMessages(userId, ids, labels);
          },
        });
      }),
    ).pipe(Layer.provide(GoogleMailApi.mock(dataset)));
    const services = Layer.mergeAll(layer, ambientSyncServices(db));

    await EffectEx.runPromise(runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(services)));

    const target = dataset.messages[0];
    const feed = mailbox.feed.target!;
    const items = await db
      .query(Query.select(Filter.type(Message.Message)).from(Scope.feed(Feed.getFeedUri(feed)!)))
      .run();
    const message = items.find((item) =>
      Obj.getMeta(item).keys.some((key) => key.source === GMAIL_SOURCE && key.id === target.id),
    )!;
    const tagIndex = await EffectEx.runPromise(Database.load(mailbox.tags).pipe(Effect.provide(Database.layer(db))));

    // What the send flow does locally.
    const sent = await Tag.findOrCreate(db, { key: SystemTags.systemTagKey('sent'), label: 'Sent' });
    Tagging.set(message, Obj.getURI(sent).toString(), { index: tagIndex });
    await db.flush({ indexes: true });

    await EffectEx.runPromise(runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(services)));

    expect(pushes.flatMap((push) => push.add)).not.toContain('SENT');
    expect(pushes).toEqual([]);
  });
});

describe('gmail tag push — an existing binding gaining tag sync', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const now = new Date('2026-07-16T12:00:00.000Z');

  /**
   * A mailbox that has been syncing for weeks and only now gains tag sync has no `tagHeads` — the same
   * signal a brand-new binding gives. Treating it as a first sync would absorb every tag the user had
   * already applied into the base, after which `local ⊖ base` is empty forever and they could never
   * reach the provider. Diagnosed against a real mailbox whose four existing stars had become
   * permanently unpushable exactly this way.
   */
  test('pre-existing local tags are pushed, not absorbed into the base', async ({ expect }) => {
    const dataset = {
      ...generateGmailDataset({ count: 2, seed: 95, start: subDays(now, 6), end: subDays(now, 2) }),
      historyId: '1000',
    };
    const { db, mailbox, binding } = await seedGmailBinding(builder, { options: { syncBackDays: 14 } });
    const pushes: { add: readonly string[]; remove: readonly string[] }[] = [];
    const layer = Layer.effect(
      GoogleMailApi,
      Effect.gen(function* () {
        const inner = yield* GoogleMailApi;
        return GoogleMailApi.of({
          ...inner,
          batchModifyMessages: (userId, ids, labels) => {
            pushes.push({ add: labels.addLabelIds ?? [], remove: labels.removeLabelIds ?? [] });
            return inner.batchModifyMessages(userId, ids, labels);
          },
        });
      }),
    ).pipe(Layer.provide(GoogleMailApi.mock(dataset)));
    const services = Layer.mergeAll(layer, ambientSyncServices(db));

    // Backfill first, which leaves the binding with a watermark — it has synced before. Then clear the
    // tag heads, which is exactly the state a mailbox is in the moment tag sync ships: syncing for
    // weeks, but never a tag-aware pass.
    await EffectEx.runPromise(runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(services)));
    Obj.update(binding, (binding) => {
      if (binding.spec.kind === 'external') {
        binding.spec.tagHeads = undefined;
      }
    });

    const target = dataset.messages[0];
    const feed = mailbox.feed.target!;
    const items = await db
      .query(Query.select(Filter.type(Message.Message)).from(Scope.feed(Feed.getFeedUri(feed)!)))
      .run();
    const message = items.find((item) =>
      Obj.getMeta(item).keys.some((key) => key.source === GMAIL_SOURCE && key.id === target.id),
    )!;
    const tagIndex = await EffectEx.runPromise(Database.load(mailbox.tags).pipe(Effect.provide(Database.layer(db))));
    const starred = await Tag.findOrCreate(db, { key: SystemTags.systemTagKey('starred'), label: 'Starred' });
    Tagging.set(message, Obj.getURI(starred).toString(), { index: tagIndex });
    await db.flush({ indexes: true });
    pushes.length = 0;

    await EffectEx.runPromise(runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(services)));

    // The pre-existing star reaches Gmail rather than being silently baselined away.
    expect(pushes.flatMap((push) => push.add)).toContain('STARRED');
    // Additive only: an upgrade must never synthesise a removal from a base it never had.
    expect(pushes.flatMap((push) => push.remove)).toEqual([]);
  });
});
