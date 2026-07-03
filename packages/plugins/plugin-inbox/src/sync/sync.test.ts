//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Stream from 'effect/Stream';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { type Database, Feed, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Pipeline, Stage } from '@dxos/pipeline';
import { captureSink } from '@dxos/pipeline/testing';
import { TagIndex } from '@dxos/schema';
import { Cursor, Message, Organization, Person } from '@dxos/types';

import * as SyncBinding from './SyncBinding';
import { type Mapped, extractContactsStage, htmlToMarkdownStage, makeDedupStage } from './index';

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
        htmlToMarkdownStage(),
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
      types: [Message.Message, Person.Person, Organization.Organization, Feed.Feed, TagIndex.TagIndex],
    });
    const feed = db.add(Feed.make({ name: 'mailbox' }));
    const tagIndex = TagIndex.make();
    await db.flush({ indexes: true });
    return { db, feed, tagIndex };
  };

  // Provider-agnostic mapping stage: raw → mapped ECHO message (no contact resolution needed here).
  const mapStage: Stage.Stage<Raw, Mapped, never, never> = Stage.map('map', (raw: Raw) =>
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
    options: SyncBinding.LayerOptions & { fault?: Stage.Stage<SyncBinding.CommitUnit, SyncBinding.CommitUnit, Error> },
  ) => {
    const mapped = Stream.fromIterable(RAWS).pipe(
      makeDedupStage<Raw>(
        'dedup',
        (raw) => raw.id,
        (raw) => raw.key,
      ),
      mapStage,
      extractContactsStage,
    );
    const withFault = options.fault ? mapped.pipe(options.fault) : mapped;
    return withFault.pipe(
      Stream.grouped(2),
      Pipeline.run({ sink: SyncBinding.commit }),
      Effect.provide(SyncBinding.layer(options)),
    );
  };

  const feedForeignIds = async (db: Database.Database, feed: Feed.Feed): Promise<string[]> => {
    const messages = await db.queryFeed(feed, Filter.type(Message.Message)).run();
    return messages.flatMap((message) =>
      Obj.getMeta(message)
        .keys.filter((key) => key.source === TEST_SOURCE)
        .map((key) => key.id),
    );
  };

  test('recovers from a mid-run fault without duplicating messages or contacts', async ({ expect }) => {
    const { db, feed, tagIndex } = await setup();
    let cursor: string | undefined;
    const persistCursorKey = (key: number) => {
      cursor = Cursor.formatKey(key);
    };
    const base = { db, feed, tagIndex, foreignKeySource: TEST_SOURCE, persistCursorKey };

    // Run 1: fault after the first page (m1, m2) commits.
    const stats1: SyncBinding.Stats = { newMessages: 0 };
    const exit = await EffectEx.runPromise(
      Effect.exit(drain({ ...base, cursorKey: 0, stats: stats1, fault: faultAfter(2) })),
    );
    expect(Exit.isFailure(exit)).toBe(true);

    // The committed page is durable; the cursor advanced to its last key.
    expect((await feedForeignIds(db, feed)).sort()).toEqual(['m1', 'm2']);
    expect(cursor).toBe('20');
    expect(await db.query(Filter.type(Person.Person)).run()).toHaveLength(1);

    // Run 2: recovery — resumes from the cursor, no fault. No duplicates.
    const stats2: SyncBinding.Stats = { newMessages: 0 };
    await EffectEx.runPromise(drain({ ...base, cursorKey: Cursor.parseKey(cursor), stats: stats2 }));

    expect(stats2.newMessages).toBe(3);
    const foreignIds = (await feedForeignIds(db, feed)).sort();
    expect(foreignIds).toEqual(['m1', 'm2', 'm3', 'm4', 'm5']);
    expect(new Set(foreignIds).size).toBe(foreignIds.length);
    expect(await db.query(Filter.type(Person.Person)).run()).toHaveLength(3);
    expect(cursor).toBe('50');
  });

  test('re-running a completed sync is a no-op', async ({ expect }) => {
    const { db, feed, tagIndex } = await setup();
    let cursor: string | undefined;
    const persistCursorKey = (key: number) => {
      cursor = Cursor.formatKey(key);
    };
    const base = { db, feed, tagIndex, foreignKeySource: TEST_SOURCE, persistCursorKey };

    const stats1: SyncBinding.Stats = { newMessages: 0 };
    await EffectEx.runPromise(drain({ ...base, cursorKey: 0, stats: stats1 }));
    expect(stats1.newMessages).toBe(RAWS.length);

    const stats2: SyncBinding.Stats = { newMessages: 0 };
    await EffectEx.runPromise(drain({ ...base, cursorKey: Cursor.parseKey(cursor), stats: stats2 }));
    expect(stats2.newMessages).toBe(0);
    expect((await feedForeignIds(db, feed)).length).toBe(RAWS.length);
    expect(await db.query(Filter.type(Person.Person)).run()).toHaveLength(3);
  });
});
