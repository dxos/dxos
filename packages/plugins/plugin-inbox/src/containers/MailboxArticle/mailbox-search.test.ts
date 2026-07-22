//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import { Database, Feed, Filter, Obj, Scope } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { QueryBuilder } from '@dxos/echo-query';
import { EffectEx } from '@dxos/effect';
import { EntityId } from '@dxos/keys';
import { Message } from '@dxos/types';

import { buildMailboxSelection, buildSystemTagSelection, buildThreadSemiJoin, getSearchText } from './mailbox-search';

describe('buildMailboxSelection', () => {
  const build = (text: string) => new QueryBuilder({}).build(text).filter;

  test('blank input selects all messages by type', () => {
    const selection = buildMailboxSelection('', undefined);
    expect(selection.ast.type).toBe('object');
  });

  test('free text routes to a full-text select (no AND with type)', () => {
    const text = 'invoice';
    const selection = buildMailboxSelection(text, build(text));
    expect(selection.ast).toMatchObject({ type: 'text-search', searchKind: 'full-text' });
  });

  test('structural-only filter is ANDed with the message type', () => {
    const text = 'from:alice@example.com';
    const selection = buildMailboxSelection(text, build(text));
    expect(selection.ast.type).toBe('and');
  });
});

describe('getSearchText', () => {
  const build = (text: string) => new QueryBuilder({}).build(text).filter;

  test('free text returns the term', () => {
    const text = 'invoice';
    expect(getSearchText(build(text))).toBe(text);
  });

  test('structural-only filter returns undefined', () => {
    expect(getSearchText(build('from:alice@example.com'))).toBeUndefined();
  });

  test('undefined filter returns undefined', () => {
    expect(getSearchText(undefined)).toBeUndefined();
  });
});

describe('buildSystemTagSelection', () => {
  test('ANDs the message type with the resolved member ids', () => {
    const id = EntityId.deterministic('test-message-1');
    const selection = buildSystemTagSelection([id]);
    expect(selection.ast).toMatchObject({
      type: 'and',
      filters: [{ type: 'object' }, { type: 'object', id: [id] }],
    });
  });

  test('selects nothing when no messages are tagged yet (e.g. before first sync)', () => {
    const selection = buildSystemTagSelection([]);
    expect(selection.ast).toMatchObject(Filter.nothing().ast);
  });
});

describe('buildThreadSemiJoin', () => {
  const setup = async () => {
    const builder = await new EchoTestBuilder().open();
    const { db } = await builder.createDatabase({ types: [Feed.Feed, Message.Message] });
    const feed = db.add(Feed.make({}));
    await db.flush();
    return { builder, feed };
  };

  test('wraps a view filter in the whole-thread semi-join over the given matches scope', async () => {
    const { builder, feed } = await setup();
    try {
      const viewFilter = buildMailboxSelection('', undefined);
      const query = buildThreadSemiJoin(viewFilter, Scope.feed(Obj.getURI(feed, { prefer: 'absolute' })));

      expect(query.ast).toMatchObject({
        type: 'select',
        filter: {
          type: 'object',
          props: { threadId: { type: 'in-query', property: 'threadId' } },
        },
      });
      // The subquery carries the view filter over exactly the given matches scope.
      const subquery = (query.ast as any).filter.props.threadId.subquery;
      expect(subquery.query.filter).toEqual(viewFilter.ast);
      expect(subquery.from).toMatchObject({ _tag: 'scope', scopes: [{ _tag: 'feed' }] });
    } finally {
      await builder.close();
    }
  });

  test('accepts a multi-scope matches array (e.g. system-tag ids resolving on either side)', async () => {
    const { builder, feed } = await setup();
    try {
      const viewFilter = buildSystemTagSelection([]);
      const query = buildThreadSemiJoin(viewFilter, [
        Scope.feed(Obj.getURI(feed, { prefer: 'absolute' })),
        Scope.space(),
      ]);

      const subquery = (query.ast as any).filter.props.threadId.subquery;
      expect(subquery.from).toMatchObject({
        _tag: 'scope',
        scopes: [{ _tag: 'feed' }, { _tag: 'space' }],
      });
    } finally {
      await builder.close();
    }
  });
});

// Live-DB coverage of what the semi-join actually returns. These are the query behaviors the mailbox
// depends on (whole-thread expansion, thread-of-one retention); previously only exercised through the
// storybook/e2e integration path.
describe('buildThreadSemiJoin (results)', () => {
  const setup = async () => {
    const builder = await new EchoTestBuilder().open();
    const { db } = await builder.createDatabase({ types: [Feed.Feed, Message.Message] });
    const feed = db.add(Feed.make({}));
    await db.flush();
    return { builder, db, feed, feedUri: Obj.getURI(feed, { prefer: 'absolute' }) };
  };

  const message = (text: string, created: string, threadId?: string) =>
    Message.make({
      created,
      sender: { email: 'a@example.com', name: 'A' },
      blocks: [{ _tag: 'text', text }],
      threadId,
    });

  type Fixture = Awaited<ReturnType<typeof setup>>;

  const append = async ({ db, feed }: Fixture, messages: Message.Message[]) => {
    await EffectEx.runAndForwardErrors(Feed.append(feed, messages).pipe(Effect.provide(Database.layer(db))));
    await db.flush();
  };

  const runSemiJoin = async ({ db, feedUri }: Fixture, viewFilter: Filter.Any): Promise<string[]> => {
    const scope = Scope.feed(feedUri);
    const results = await db.query(buildThreadSemiJoin(viewFilter, scope).from(scope)).run();
    return results.map((row) => row.id).sort();
  };

  const ids = (...messages: Message.Message[]) => messages.map((message) => message.id).sort();

  test('a partial match pulls in the whole thread but not unrelated threads', async () => {
    const fixture = await setup();
    try {
      // `a1` and `a2` share a thread; only `a1` matches the filter, yet the whole thread must return.
      const a1 = message('one', '2020-01-01T00:00:00.000Z', 'thread-a');
      const a2 = message('two', '2020-01-02T00:00:00.000Z', 'thread-a');
      const b1 = message('three', '2020-01-03T00:00:00.000Z', 'thread-b');
      await append(fixture, [a1, a2, b1]);

      // Match `a1` alone (by its unique `created`); the semi-join expands to its whole thread.
      const viewFilter = Filter.type(Message.Message, { created: a1.created });
      expect(await runSemiJoin(fixture, viewFilter)).toEqual(ids(a1, a2));
    } finally {
      await fixture.builder.close();
    }
  });

  test('retains thread-of-one messages (each keyed on its own threadId)', async () => {
    const fixture = await setup();
    try {
      // Two messages share a thread; two are singletons keyed on a unique threadId of their own — the
      // shape the JMAP mapper produces for threadless mail. All four must survive the semi-join.
      const t1 = message('one', '2020-01-01T00:00:00.000Z', 'thread-a');
      const t2 = message('two', '2020-01-02T00:00:00.000Z', 'thread-a');
      const s1 = message('three', '2020-01-03T00:00:00.000Z', 'thread-of-one-1');
      const s2 = message('four', '2020-01-04T00:00:00.000Z', 'thread-of-one-2');
      await append(fixture, [t1, t2, s1, s2]);

      // Blank view matches every message; all four must survive the semi-join (2 in one thread + 2 singletons).
      expect(await runSemiJoin(fixture, buildMailboxSelection('', undefined))).toEqual(ids(t1, t2, s1, s2));
    } finally {
      await fixture.builder.close();
    }
  });

  test('a message with no threadId is dropped by the semi-join (documents the bug the mapper prevents)', async () => {
    const fixture = await setup();
    try {
      const t1 = message('one', '2020-01-01T00:00:00.000Z', 'thread-a');
      const standalone = message('two', '2020-01-02T00:00:00.000Z'); // no threadId — the shape the mapper normalizes away
      await append(fixture, [t1, standalone]);

      // The `threadId IN (…)` semi-join excludes the null-threadId row — the exact failure this fix prevents.
      expect(await runSemiJoin(fixture, buildMailboxSelection('', undefined))).toEqual(ids(t1));
    } finally {
      await fixture.builder.close();
    }
  });
});
