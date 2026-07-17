//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Feed } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { QueryBuilder } from '@dxos/echo-query';
import { Message } from '@dxos/types';

import { buildMailboxSelection, getSearchText } from './mailbox-search';

describe('buildMailboxSelection', () => {
  const build = (text: string) => new QueryBuilder({}).build(text).filter;

  const setup = async () => {
    const builder = await new EchoTestBuilder().open();
    const { db } = await builder.createDatabase({ types: [Feed.Feed, Message.Message] });
    const feed = db.add(Feed.make({}));
    await db.flush();
    return { builder, feed };
  };

  // The selection is always `Query.select(Filter.type(Message, { threadId:
  // Filter.in(subquery.project('threadId')) }))`. These tests drill into the embedded subquery's
  // own filter (`ast.filter.props.threadId.subquery.query.filter`) to assert the view-filter
  // behavior that previously lived at the top level.
  const viewFilterAst = (selection: ReturnType<typeof buildMailboxSelection>) =>
    (selection.ast as any).filter.props.threadId.subquery.query.filter;

  test('blank input selects whole threads of any message', async () => {
    const { builder, feed } = await setup();
    try {
      const selection = buildMailboxSelection('', undefined, feed);
      expect(selection.ast).toMatchObject({
        type: 'select',
        filter: { type: 'object', props: { threadId: { type: 'in-query', property: 'threadId' } } },
      });
      expect(viewFilterAst(selection).type).toBe('object');
    } finally {
      await builder.close();
    }
  });

  test('free text routes to a full-text select (no AND with type)', async () => {
    const { builder, feed } = await setup();
    try {
      const text = 'invoice';
      const selection = buildMailboxSelection(text, build(text), feed);
      expect(viewFilterAst(selection)).toMatchObject({ type: 'text-search', searchKind: 'full-text' });
    } finally {
      await builder.close();
    }
  });

  test('structural-only filter is ANDed with the message type', async () => {
    const { builder, feed } = await setup();
    try {
      const text = 'from:alice@example.com';
      const selection = buildMailboxSelection(text, build(text), feed);
      expect(viewFilterAst(selection).type).toBe('and');
    } finally {
      await builder.close();
    }
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
