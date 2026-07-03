//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { type Database, Feed, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Pipeline, Stage } from '@dxos/pipeline';
import { captureSink, scriptedSource } from '@dxos/pipeline/testing';
import { TagIndex } from '@dxos/schema';
import { Cursor, Message, Organization, Person } from '@dxos/types';

import * as SyncPipeline from './SyncPipeline';
import { type DedupContext, makeDedupStage } from './stages/dedup';
import { type ExtractContext, type Mapped, extractContactsStage } from './stages/extractContacts';
import { htmlToMarkdownStage } from './stages/htmlToMarkdown';

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
  test('dedup drops items below the cursor key or already committed', async ({ expect }) => {
    const context: DedupContext = { cursorKey: 15, dedupSet: new Set(['m2']) };
    const { sink, items } = captureSink<Raw>();
    await EffectEx.runPromise(
      Pipeline.run({
        source: scriptedSource(RAWS),
        stages: [
          makeDedupStage<Raw>(
            'dedup',
            (raw) => raw.id,
            (raw) => raw.key,
          ),
        ],
        sink,
        context,
      }),
    );

    // m1 (key 10 < 15) dropped by cursor; m2 dropped by dedupSet; m3/m4/m5 survive.
    expect(items.map((raw) => raw.id)).toEqual(['m3', 'm4', 'm5']);
  });

  test('htmlToMarkdown converts an HTML body to markdown', async ({ expect }) => {
    const { sink, items } = captureSink<{ body: string }>();
    await EffectEx.runPromise(
      Pipeline.run({
        source: scriptedSource([{ body: '<p>Hello <strong>World</strong></p>' }]),
        stages: [htmlToMarkdownStage()],
        sink,
        context: {},
      }),
    );

    expect(items).toHaveLength(1);
    expect(items[0].body).not.toContain('<p>');
    expect(items[0].body).toContain('Hello');
    expect(items[0].body).toContain('**World**');
  });
});

describe('sync pipeline extract-contacts stage', () => {
  let builder: EchoTestBuilder;
  let db: Database.Database;

  beforeAll(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Message.Message, Person.Person, Organization.Organization] }));
  });

  afterAll(async () => {
    await builder.close();
  });

  test('extracts a Person once per sender within a run', async ({ expect }) => {
    const context: ExtractContext = { db, createdContactEmails: new Set<string>() };
    const mapped: readonly Mapped[] = RAWS.map((raw) => ({
      message: Obj.make(Message.Message, {
        created: new Date(raw.key).toISOString(),
        sender: { email: raw.email },
        blocks: [{ _tag: 'text', text: raw.body }],
      }),
      foreignId: raw.id,
      key: raw.key,
      tagUris: [],
    }));

    const { sink, items } = captureSink<SyncPipeline.CommitUnit>();
    await EffectEx.runPromise(
      Pipeline.run({ source: scriptedSource(mapped), stages: [extractContactsStage], sink, context }),
    );

    // alice extracted on m1 only; m2 (same email) yields nothing; bob on m3; carol on m4 only.
    expect(items.map((unit) => unit.extractedObjects.length)).toEqual([1, 0, 1, 1, 0]);
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

  // Provider-agnostic mapping stage for the harness tests: raw → mapped ECHO message.
  const mapStage: Stage.Stage<Raw, Mapped, unknown, never> = Stage.map('map', (raw) =>
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
  const faultAfter = (n: number): Stage.Stage<SyncPipeline.CommitUnit, SyncPipeline.CommitUnit, unknown, Error> => {
    let count = 0;
    return Stage.map('fault', (unit) => {
      count += 1;
      return count > n ? Effect.fail(new Error('injected fault')) : Effect.succeed(unit);
    });
  };

  const run = <E>(
    opts: Pick<SyncPipeline.RunOptions<Raw, E>, 'db' | 'feed' | 'tagIndex' | 'cursorKey' | 'stages' | 'persistCursorKey'>,
  ) =>
    SyncPipeline.run<Raw, E>({
      foreignKeySource: TEST_SOURCE,
      source: scriptedSource(RAWS),
      resolveContact: () => Promise.resolve(undefined),
      pageSize: 2,
      ...opts,
    });

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

    // Run 1: fault after the first page (m1, m2) commits.
    const exit = await EffectEx.runPromise(
      Effect.exit(
        run<Error>({
          db,
          feed,
          tagIndex,
          cursorKey: 0,
          stages: [makeDedupStage<Raw>('dedup', (raw) => raw.id, (raw) => raw.key), mapStage, extractContactsStage, faultAfter(2)],
          persistCursorKey,
        }),
      ),
    );
    expect(Exit.isFailure(exit)).toBe(true);

    // The committed page is durable; the cursor advanced to its last key.
    expect((await feedForeignIds(db, feed)).sort()).toEqual(['m1', 'm2']);
    expect(cursor).toBe('20');
    const personsAfterFault = await db.query(Filter.type(Person.Person)).run();
    expect(personsAfterFault).toHaveLength(1);

    // Run 2: recovery — resumes from the cursor, no fault. No duplicates.
    const { newMessages } = await EffectEx.runPromise(
      run<never>({
        db,
        feed,
        tagIndex,
        cursorKey: Cursor.parseKey(cursor),
        stages: [makeDedupStage<Raw>('dedup', (raw) => raw.id, (raw) => raw.key), mapStage, extractContactsStage],
        persistCursorKey,
      }),
    );

    expect(newMessages).toBe(3);
    const foreignIds = (await feedForeignIds(db, feed)).sort();
    expect(foreignIds).toEqual(['m1', 'm2', 'm3', 'm4', 'm5']);
    expect(new Set(foreignIds).size).toBe(foreignIds.length);
    const persons = await db.query(Filter.type(Person.Person)).run();
    expect(persons).toHaveLength(3);
    expect(cursor).toBe('50');
  });

  test('re-running a completed sync is a no-op', async ({ expect }) => {
    const { db, feed, tagIndex } = await setup();
    let cursor: string | undefined;
    const persistCursorKey = (key: number) => {
      cursor = Cursor.formatKey(key);
    };
    const stages = [
      makeDedupStage<Raw>('dedup', (raw) => raw.id, (raw) => raw.key),
      mapStage,
      extractContactsStage,
    ];

    const first = await EffectEx.runPromise(
      run<never>({ db, feed, tagIndex, cursorKey: 0, stages, persistCursorKey }),
    );
    expect(first.newMessages).toBe(RAWS.length);

    const second = await EffectEx.runPromise(
      run<never>({ db, feed, tagIndex, cursorKey: Cursor.parseKey(cursor), stages, persistCursorKey }),
    );
    expect(second.newMessages).toBe(0);
    expect((await feedForeignIds(db, feed)).length).toBe(RAWS.length);
    expect(await db.query(Filter.type(Person.Person)).run()).toHaveLength(3);
  });
});
