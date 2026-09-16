//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import { Database, Feed, Filter, Obj, Scope, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { QueryBuilder } from '@dxos/echo-query';
import { EffectEx } from '@dxos/effect';
import { EntityId } from '@dxos/keys';
import { Message } from '@dxos/types';

import {
  buildMailboxSelection,
  buildSystemTagSelection,
  buildThreadSemiJoin,
  getSearchText,
} from './mailbox-search.ts';

const TAG_MAP = { 'tag:work': Tag.make({ label: 'work' }), 'tag:urgent': Tag.make({ label: 'urgent' }) };

describe('buildMailboxSelection', () => {
  const build = (text: string) => new QueryBuilder({}).build(text).filter;

  test('blank input selects all messages by type', () => {
    const selection = buildMailboxSelection('', undefined);
    expect(selection.ast.type).toBe('object');
  });

  test('free text composes the full-text select with the message type', () => {
    const text = 'invoice';
    const selection = buildMailboxSelection(text, build(text));
    expect(selection.ast).toMatchObject({
      type: 'and',
      filters: [{ type: 'object' }, { type: 'text-search', searchKind: 'full-text' }],
    });
  });

  test('structural-only filter is ANDed with the message type', () => {
    const text = 'from:alice@example.com';
    const selection = buildMailboxSelection(text, build(text));
    expect(selection.ast.type).toBe('and');
  });

  test('a tag term with a resolver scopes the text search to the tag members', () => {
    const tagged = EntityId.deterministic('tagged-message');
    const selection = buildMailboxSelection('#work invoice', buildTagged('#work invoice'), {
      resolveTagIds: (tagUri) => (tagUri === 'tag:work' ? [tagged] : undefined),
    });
    expect(selection.ast).toMatchObject({
      type: 'and',
      filters: [{ type: 'object' }, { type: 'object', id: [tagged] }, { type: 'text-search' }],
    });
  });

  test('multiple tag terms intersect their member ids', () => {
    const both = EntityId.deterministic('both');
    const onlyWork = EntityId.deterministic('only-work');
    const selection = buildMailboxSelection('#work #urgent invoice', buildTagged('#work #urgent invoice'), {
      resolveTagIds: (tagUri) => (tagUri === 'tag:work' ? [both, onlyWork] : [both]),
    });
    expect(selection.ast).toMatchObject({
      type: 'and',
      filters: [{ type: 'object' }, { type: 'object', id: [both] }, { type: 'text-search' }],
    });
  });

  test('a tag with no members matches nothing rather than falling back to the whole feed', () => {
    const selection = buildMailboxSelection('#work invoice', buildTagged('#work invoice'), {
      resolveTagIds: () => [],
    });
    // `Filter.id()` of an empty member set is `Filter.nothing()` (a negated match-all).
    expect(selection.ast).toMatchObject({
      type: 'and',
      filters: [{ type: 'object' }, { type: 'not' }, { type: 'text-search' }],
    });
  });

  test('an unresolvable tag term is dropped from the text selection', () => {
    const selection = buildMailboxSelection('#work invoice', buildTagged('#work invoice'));
    expect(selection.ast).toMatchObject({
      type: 'and',
      filters: [{ type: 'object' }, { type: 'text-search' }],
    });
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

      // A union of the semi-join and the direct matches, so a threadless message still reaches the list.
      expect(query.ast).toMatchObject({ type: 'union' });
      expect((query.ast as any).queries).toHaveLength(2);
      expect(semiJoinArm(query)).toMatchObject({
        type: 'select',
        filter: {
          type: 'object',
          props: { threadId: { type: 'in-query', property: 'threadId' } },
        },
      });
      // The second arm is the view filter itself, unscoped — the caller's own `.from` scopes it.
      expect((query.ast as any).queries[1]).toMatchObject({ type: 'select', filter: viewFilter.ast });
      // The subquery carries the view filter over exactly the given matches scope.
      const subquery = semiJoinArm(query).filter.props.threadId.subquery;
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

      const subquery = semiJoinArm(query).filter.props.threadId.subquery;
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
      // shape a compose draft takes (a thread of one). All four must survive the semi-join.
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

  test('a message with no threadId still reaches the list', async () => {
    const fixture = await setup();
    try {
      const t1 = message('one', '2020-01-01T00:00:00.000Z', 'thread-a');
      const standalone = message('two', '2020-01-02T00:00:00.000Z'); // No threadId (draft/transcription/assistant).
      await append(fixture, [t1, standalone]);

      // `threadId IN (…)` can never admit the threadless row, so the union's direct-match arm is the
      // only thing that carries it. Without that arm this returns `[t1]` and the message is invisible.
      expect(await runSemiJoin(fixture, buildMailboxSelection('', undefined))).toEqual(ids(t1, standalone));
    } finally {
      await fixture.builder.close();
    }
  });

  test('a threadless message is returned once, not duplicated by the union', async () => {
    const fixture = await setup();
    try {
      const standalone = message('only', '2020-01-01T00:00:00.000Z');
      await append(fixture, [standalone]);

      const results = await runSemiJoin(fixture, buildMailboxSelection('', undefined));
      expect(results).toEqual(ids(standalone));
    } finally {
      await fixture.builder.close();
    }
  });

  test('free text scoped to tag members returns only the tagged thread', async () => {
    const fixture = await setup();
    try {
      // Both messages contain the term; only `a1` carries the tag, so only its thread returns.
      const a1 = message('alpha report', '2020-01-01T00:00:00.000Z', 'thread-a');
      const b1 = message('alpha memo', '2020-01-02T00:00:00.000Z', 'thread-b');
      await append(fixture, [a1, b1]);

      const filter = Filter.and(Filter.tag('tag:work'), Filter.text('alpha', { type: 'full-text' }));
      const viewFilter = buildMailboxSelection('#work alpha', filter, { resolveTagIds: () => [a1.id] });
      expect(await runSemiJoin(fixture, viewFilter)).toEqual(ids(a1));
    } finally {
      await fixture.builder.close();
    }
  });

  test('a threaded message matching both union arms is returned once', async () => {
    const fixture = await setup();
    try {
      // `t1` matches the view filter directly AND is pulled in by the semi-join as a member of its own
      // thread, so it arrives from both arms — the union must de-duplicate it.
      const t1 = message('one', '2020-01-01T00:00:00.000Z', 'thread-a');
      const t2 = message('two', '2020-01-02T00:00:00.000Z', 'thread-a');
      await append(fixture, [t1, t2]);

      expect(await runSemiJoin(fixture, buildMailboxSelection('', undefined))).toEqual(ids(t1, t2));
    } finally {
      await fixture.builder.close();
    }
  });
});

const buildTagged = (text: string) => new QueryBuilder(TAG_MAP).build(text).filter;

/** The semi-join arm of the union (the other arm is the bare view filter). */
const semiJoinArm = (query: ReturnType<typeof buildThreadSemiJoin>): any => (query.ast as any).queries[0];
