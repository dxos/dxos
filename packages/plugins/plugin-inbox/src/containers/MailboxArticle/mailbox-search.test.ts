//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { QueryBuilder } from '@dxos/echo-query';

import { buildMailboxSelection } from './mailbox-search';

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
