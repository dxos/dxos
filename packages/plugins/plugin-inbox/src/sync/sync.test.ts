//
// Copyright 2026 DXOS.org
//

import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Stream from 'effect/Stream';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { Blob, Database, Feed, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Pipeline, Stage } from '@dxos/pipeline';
import { captureSink } from '@dxos/pipeline/testing';
import { Connection, SyncBinding } from '@dxos/plugin-connector';
import { TagIndex } from '@dxos/schema';
import { AccessToken, Cursor, Message, Organization, Person } from '@dxos/types';

import { EmailStage } from './index';

const TEST_SOURCE = 'test.mail';

type Raw = { readonly id: string; readonly key: number; readonly email: string; readonly body: string };

// One scripted mailbox: two messages from the same new sender (dedup within a run), one from a
// second sender, and two from a third (dedup again). Keys are ascending (message received time).
const RAWS: readonly Raw[] = [
  { id: 'm1', key: 10, email: 'alice@acme.com', body: '<p>one</p>' },
  { id: 'm2', key: 20, email: 'alice@acme.com', body: '<p>two</p>' },
  { id: 'm3', key: 30, email: 'bob@acme.com', body: '<p>three</p>' },
  { id: 'm4', key: 40, email: 'carol@other.com', body: '<p>four</p>' },
  { id: 'm5', key: 50, email: 'carol@other.com', body: '<p>five</p>' },
];

describe('sync pipeline stages', () => {
  test('htmlToMarkdown converts an HTML body to markdown', async ({ expect }) => {
    const { sink, items } = captureSink<{ body: string }>();
    await EffectEx.runPromise(
      Stream.fromIterable([{ body: '<p>Hello <strong>World</strong></p>' }]).pipe(
        EmailStage.htmlToMarkdown,
        Pipeline.run({ sink }),
      ),
    );

    expect(items).toHaveLength(1);
    expect(items[0].body).not.toContain('<p>');
    expect(items[0].body).toContain('Hello');
    expect(items[0].body).toContain('**World**');
  });
});

describe('sync pipeline harness', () => {
  let builder: EchoTestBuilder;

  beforeAll(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterAll(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({
      types: [
        Message.Message,
        Person.Person,
        Organization.Organization,
        Feed.Feed,
        TagIndex.TagIndex,
        AccessToken.AccessToken,
        Connection.Connection,
        Cursor.Cursor,
        SyncBinding.SyncBinding,
        Blob.Blob,
      ],
    });
    const feed = db.add(Feed.make({ name: 'mailbox' }));
    const tagIndex = TagIndex.make();
    const accessToken = db.add(AccessToken.make({ source: 'test.mail', token: 'token' }));
    const connection = db.add(Connection.make({ connectorId: 'test', accessToken: Ref.make(accessToken) }));
    // The binding's target is unused by the pipeline; the feed stands in as a convenient local root.
    const binding = db.add(SyncBinding.make({ [Relation.Source]: connection, [Relation.Target]: feed }));
    await db.flush({ indexes: true });
    return { db, feed, tagIndex, binding };
  };

  // Provider-agnostic mapping stage: raw → mapped ECHO message (no contact resolution needed here).
  const mapStage: Stage.Stage<Raw, EmailStage.Mapped, never, never> = Stage.map('map', (raw: Raw) =>
    Effect.sync(() => ({
      message: Obj.make(Message.Message, {
        [Obj.Meta]: { keys: [{ id: raw.id, source: TEST_SOURCE }] },
        created: new Date(raw.key).toISOString(),
        sender: { email: raw.email },
        blocks: [{ _tag: 'text', text: raw.body }],
      }),
      foreignId: raw.id,
      key: raw.key,
      tagUris: [],
    })),
  );

  // Faults after `n` units reach it, simulating a crash mid-run.
  const faultAfter = (n: number): Stage.Stage<SyncBinding.CommitUnit, SyncBinding.CommitUnit, Error, never> => {
    let count = 0;
    return Stage.map('fault', (unit: SyncBinding.CommitUnit) => {
      count += 1;
      return count > n ? Effect.fail(new Error('injected fault')) : Effect.succeed(unit);
    });
  };

  const drain = (
    options: SyncBinding.LayerOptions & {
      db: Database.Database;
      fault?: Stage.Stage<SyncBinding.CommitUnit, SyncBinding.CommitUnit, Error>;
    },
  ) => {
    const mapped = Stream.fromIterable(RAWS).pipe(
      SyncBinding.dedupStage<Raw>(
        'dedup',
        (raw) => raw.id,
        (raw) => raw.key,
      ),
      mapStage,
      EmailStage.extractContacts(),
      EmailStage.toCommitUnit(),
    );
    const withFault = options.fault ? mapped.pipe(options.fault) : mapped;
    return withFault.pipe(
      Stream.grouped(2),
      Pipeline.run({ sink: SyncBinding.commit }),
      Effect.provide(SyncBinding.layer(options)),
      Effect.provide(Database.layer(options.db)),
    );
  };

  const cursorOf = (binding: SyncBinding.SyncBinding): string | undefined => binding.cursor.target?.value;

  const feedForeignIds = async (db: Database.Database, feed: Feed.Feed): Promise<string[]> => {
    const messages = await db.query(Query.select(Filter.type(Message.Message)).from(feed)).run();
    return messages.flatMap((message) =>
      Obj.getMeta(message)
        .keys.filter((key) => key.source === TEST_SOURCE)
        .map((key) => key.id),
    );
  };

  test('recovers from a mid-run fault without duplicating messages or contacts', async ({ expect }) => {
    const { db, feed, tagIndex, binding } = await setup();
    const base = { db, binding, feed, tagIndex, foreignKeySource: TEST_SOURCE };

    // Run 1: fault after the first page (m1, m2) commits.
    const stats1: SyncBinding.Stats = { newMessages: 0 };
    const exit = await EffectEx.runPromise(
      Effect.exit(drain({ ...base, cursorKey: 0, stats: stats1, fault: faultAfter(2) })),
    );
    expect(Exit.isFailure(exit)).toBe(true);

    // The committed page is durable; the binding cursor advanced to its last key (internalized).
    expect((await feedForeignIds(db, feed)).sort()).toEqual(['m1', 'm2']);
    expect(cursorOf(binding)).toBe('20');
    expect(await db.query(Filter.type(Person.Person)).run()).toHaveLength(1);

    // Run 2: recovery — resumes from the cursor, no fault. No duplicates.
    const stats2: SyncBinding.Stats = { newMessages: 0 };
    await EffectEx.runPromise(drain({ ...base, cursorKey: Number.parseInt(cursorOf(binding)!, 10), stats: stats2 }));

    expect(stats2.newMessages).toBe(3);
    const foreignIds = (await feedForeignIds(db, feed)).sort();
    expect(foreignIds).toEqual(['m1', 'm2', 'm3', 'm4', 'm5']);
    expect(new Set(foreignIds).size).toBe(foreignIds.length);
    expect(await db.query(Filter.type(Person.Person)).run()).toHaveLength(3);
    expect(cursorOf(binding)).toBe('50');
  });

  test('commit batches identical commit effects (by identity) into one call per page', async ({ expect }) => {
    const { db, feed, tagIndex, binding } = await setup();

    const calls: (readonly SyncBinding.CommitUnit[])[] = [];
    // A single stable reference reused across every unit in a run (the shape a per-run commit effect
    // attaches) — so `commit` must invoke it once per page with every unit that attached it, not once
    // per unit.
    const commitEffect: SyncBinding.CommitEffect = (units) =>
      Effect.sync(() => {
        calls.push(units);
      });

    const makeUnit = (raw: Raw): SyncBinding.CommitUnit => ({
      message: Obj.make(Message.Message, {
        [Obj.Meta]: { keys: [{ id: raw.id, source: TEST_SOURCE }] },
        created: new Date(raw.key).toISOString(),
        sender: { email: raw.email },
        blocks: [{ _tag: 'text', text: raw.body }],
      }),
      foreignId: raw.id,
      key: raw.key,
      tagUris: [],
      commitEffects: [commitEffect],
    });

    const stats: SyncBinding.Stats = { newMessages: 0 };
    await EffectEx.runPromise(
      SyncBinding.commit(Chunk.fromIterable([makeUnit(RAWS[0]), makeUnit(RAWS[1])])).pipe(
        Effect.provide(
          SyncBinding.layer({ binding, feed, tagIndex, foreignKeySource: TEST_SOURCE, cursorKey: 0, stats }),
        ),
        Effect.provide(Database.layer(db)),
      ),
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].map((unit) => unit.foreignId)).toEqual(['m1', 'm2']);
  });

  test('re-running a completed sync is a no-op', async ({ expect }) => {
    const { db, feed, tagIndex, binding } = await setup();
    const base = { db, binding, feed, tagIndex, foreignKeySource: TEST_SOURCE };

    const stats1: SyncBinding.Stats = { newMessages: 0 };
    await EffectEx.runPromise(drain({ ...base, cursorKey: 0, stats: stats1 }));
    expect(stats1.newMessages).toBe(RAWS.length);

    const stats2: SyncBinding.Stats = { newMessages: 0 };
    await EffectEx.runPromise(drain({ ...base, cursorKey: Number.parseInt(cursorOf(binding)!, 10), stats: stats2 }));
    expect(stats2.newMessages).toBe(0);
    expect((await feedForeignIds(db, feed)).length).toBe(RAWS.length);
    expect(await db.query(Filter.type(Person.Person)).run()).toHaveLength(3);
  });

  test('processAttachments creates a resolvable Blob on the feed and skips oversized attachments', async ({
    expect,
  }) => {
    const { db, feed, tagIndex, binding } = await setup();

    type AttachmentRaw = Raw & { readonly attachments?: readonly EmailStage.Attachment[] };
    const smallBytes = new Uint8Array([1, 2, 3, 4]);
    const oversizedBytes = new Uint8Array(Blob.MAX_INLINE_SIZE + 1);
    const raws: readonly AttachmentRaw[] = [
      {
        id: 'a1',
        key: 10,
        email: 'dave@acme.com',
        body: '<p>with attachment</p>',
        attachments: [{ name: 'photo.png', mimeType: 'image/png', size: smallBytes.byteLength, bytes: smallBytes }],
      },
      {
        id: 'a2',
        key: 20,
        email: 'dave@acme.com',
        body: '<p>oversized attachment</p>',
        attachments: [
          {
            name: 'huge.bin',
            mimeType: 'application/octet-stream',
            size: oversizedBytes.byteLength,
            bytes: oversizedBytes,
          },
        ],
      },
    ];

    const mapAttachmentStage: Stage.Stage<AttachmentRaw, EmailStage.Mapped, never, never> = Stage.map(
      'map',
      (raw: AttachmentRaw) =>
        Effect.sync(() => ({
          message: Obj.make(Message.Message, {
            [Obj.Meta]: { keys: [{ id: raw.id, source: TEST_SOURCE }] },
            created: new Date(raw.key).toISOString(),
            sender: { email: raw.email },
            blocks: [{ _tag: 'text', text: raw.body }],
          }),
          foreignId: raw.id,
          key: raw.key,
          tagUris: [],
          attachments: raw.attachments,
        })),
    );

    const stats: SyncBinding.Stats = { newMessages: 0 };
    await EffectEx.runPromise(
      Stream.fromIterable(raws).pipe(
        mapAttachmentStage,
        EmailStage.processAttachments(),
        EmailStage.extractContacts(),
        EmailStage.toCommitUnit(),
        Stream.grouped(2),
        Pipeline.run({ sink: SyncBinding.commit }),
        Effect.provide(
          SyncBinding.layer({ binding, feed, tagIndex, foreignKeySource: TEST_SOURCE, cursorKey: 0, stats }),
        ),
        Effect.provide(Database.layer(db)),
      ),
    );

    // Both messages commit — the oversized attachment is skipped, not fatal to its message.
    expect(stats.newMessages).toBe(2);

    // Only the small attachment produced a Blob on the feed.
    const blobs = await db.query(Query.select(Filter.type(Blob.Blob)).from(feed)).run();
    expect(blobs).toHaveLength(1);

    const messages = await db.query(Query.select(Filter.type(Message.Message)).from(feed)).run();
    const findByForeignId = (id: string): Message.Message => {
      const message = messages.find((candidate) =>
        Obj.getMeta(candidate).keys.some((key) => key.id === id && key.source === TEST_SOURCE),
      );
      if (!message) {
        throw new Error(`expected a message with foreign id ${id}`);
      }
      return message;
    };
    const withAttachment = findByForeignId('a1');
    const [attachment] = withAttachment.attachments ?? [];
    if (!attachment) {
      throw new Error('expected an attachment');
    }
    expect(attachment.name).toBe('photo.png');
    // The attachment's ref resolves back to the very Blob appended to the feed alongside the message.
    const loadedBlob = await attachment.ref.load();
    expect(loadedBlob.id).toEqual(blobs[0].id);

    const withoutAttachment = findByForeignId('a2');
    expect(withoutAttachment.attachments ?? []).toHaveLength(0);
  });

  test('email stages compose in any order (Mapped → Mapped) ahead of the terminal toCommitUnit', async ({ expect }) => {
    const { db, feed, tagIndex, binding } = await setup();

    type AttachmentRaw = Raw & { readonly attachments?: readonly EmailStage.Attachment[] };
    const bytes = new Uint8Array([9, 8, 7]);
    const raw: AttachmentRaw = {
      id: 'b1',
      key: 10,
      email: 'erin@acme.com',
      body: '<p>with attachment</p>',
      attachments: [{ name: 'note.txt', mimeType: 'text/plain', size: bytes.byteLength, bytes }],
    };

    const mapAttachmentStage: Stage.Stage<AttachmentRaw, EmailStage.Mapped, never, never> = Stage.map(
      'map',
      (item: AttachmentRaw) =>
        Effect.sync(() => ({
          message: Obj.make(Message.Message, {
            [Obj.Meta]: { keys: [{ id: item.id, source: TEST_SOURCE }] },
            created: new Date(item.key).toISOString(),
            sender: { email: item.email },
            blocks: [{ _tag: 'text', text: item.body }],
          }),
          foreignId: item.id,
          key: item.key,
          tagUris: [],
          attachments: item.attachments,
        })),
    );

    const stats: SyncBinding.Stats = { newMessages: 0 };
    await EffectEx.runPromise(
      Stream.fromIterable([raw]).pipe(
        mapAttachmentStage,
        // Swapped relative to the production pipelines (extractContacts before processAttachments) —
        // both are Mapped → Mapped, so order doesn't matter; only toCommitUnit must run last.
        EmailStage.extractContacts(),
        EmailStage.processAttachments(),
        EmailStage.toCommitUnit(),
        Stream.grouped(2),
        Pipeline.run({ sink: SyncBinding.commit }),
        Effect.provide(
          SyncBinding.layer({ binding, feed, tagIndex, foreignKeySource: TEST_SOURCE, cursorKey: 0, stats }),
        ),
        Effect.provide(Database.layer(db)),
      ),
    );

    expect(stats.newMessages).toBe(1);
    expect(await db.query(Filter.type(Person.Person)).run()).toHaveLength(1);

    const blobs = await db.query(Query.select(Filter.type(Blob.Blob)).from(feed)).run();
    expect(blobs).toHaveLength(1);

    const [message] = await db.query(Query.select(Filter.type(Message.Message)).from(feed)).run();
    const [attachment] = message.attachments ?? [];
    if (!attachment) {
      throw new Error('expected an attachment');
    }
    expect(attachment.name).toBe('note.txt');
    const loadedBlob = await attachment.ref.load();
    expect(loadedBlob.id).toEqual(blobs[0].id);
  });
});
