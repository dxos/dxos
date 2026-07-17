//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Filter } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';

import { buildDraftFilter, buildMailboxSelection, buildSystemTagSelection, getSearchText } from './mailbox-search';

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

describe('buildDraftFilter', () => {
  test('selects messages scoped to this mailbox by properties.mailbox', () => {
    const filter = buildDraftFilter('echo:mailbox-1');
    expect(filter.ast.type).toBe('object');
  });
});

describe('buildSystemTagSelection', () => {
  test('ANDs the message type with the resolved tag uri', () => {
    const selection = buildSystemTagSelection('dxn:echo:@:tag-1');
    expect(selection.ast).toMatchObject({ type: 'and', filters: [{ type: 'object' }, { type: 'tag' }] });
  });

  test('selects nothing when the tag has not been resolved yet (e.g. before first sync)', () => {
    const selection = buildSystemTagSelection(undefined);
    expect(selection.ast).toMatchObject(Filter.nothing().ast);
  });
});
