//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Feed, Filter, Obj, Scope } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { QueryBuilder } from '@dxos/echo-query';
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
