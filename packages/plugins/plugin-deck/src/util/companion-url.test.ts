//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import {
  expandCompanionPairs,
  formatCompanionUrlId,
  formatContextUrlValue,
  parseCompanionUrlId,
  parseContextUrlValue,
} from './companion-url';

const source = { key: 'doc', id: 'A', workspace: 'space' };

describe('popped companion url ids', () => {
  test('round-trips source and variant', () => {
    const urlId = formatCompanionUrlId(source, 'comments');
    expect(urlId).toEqual('doc~A~comments');
    expect(parseCompanionUrlId(urlId)).toEqual({ sourceKey: 'doc', sourceId: 'A', variant: 'comments' });
  });

  test('round-trips a compound source id', () => {
    // Static-path ids carry the tail separator; the composite must not be confused by it.
    const urlId = formatCompanionUrlId({ ...source, key: 'db', id: 'contact+01J9' }, 'assistant-chat');
    expect(parseCompanionUrlId(urlId)).toEqual({
      sourceKey: 'db',
      sourceId: 'contact+01J9',
      variant: 'assistant-chat',
    });
  });

  test('is self-contained, so it does not depend on the source being in the chain', () => {
    // The whole point: a clone outlives the plank it was popped from.
    const parsed = parseCompanionUrlId(formatCompanionUrlId(source, 'comments'));
    expect(parsed?.sourceKey).toEqual('doc');
    expect(parsed?.sourceId).toEqual('A');
  });

  test('a bare variant is not a composite', () => {
    // The sidebar-relative form older URLs carry; it has no source to resolve against.
    expect(parseCompanionUrlId('comments')).toBeUndefined();
  });
});

describe('context url values', () => {
  test('a node selection round-trips by variant', () => {
    const value = formatContextUrlValue('node/comments', 'comments');
    expect(value).toEqual('~comments');
    expect(parseContextUrlValue(value)).toEqual({ variant: 'comments' });
  });

  test('a root selection round-trips by id', () => {
    const value = formatContextUrlValue('search', undefined);
    expect(value).toEqual('search');
    expect(parseContextUrlValue(value)).toEqual({ panel: 'search' });
  });
});

describe('expandCompanionPairs', () => {
  const pair = (key: string, id?: string) => ({ key, id, workspace: 'space' });

  test('expands a composite into its source and the companion, marking the source synthetic', () => {
    const { pairs, synthetic } = expandCompanionPairs([pair('doc', 'A'), pair('companion', 'doc~A~comments')]);
    expect(pairs).toEqual([pair('doc', 'A'), pair('doc', 'A'), pair('companion', 'comments')]);
    // Index 1 is the synthesized source; the clone itself resolves at index 2.
    expect([...synthetic]).toEqual([1]);
  });

  test('expands a clone whose source is not otherwise in the chain', () => {
    const { pairs, synthetic } = expandCompanionPairs([pair('companion', 'doc~A~comments')]);
    expect(pairs).toEqual([pair('doc', 'A'), pair('companion', 'comments')]);
    expect([...synthetic]).toEqual([0]);
  });

  test('leaves non-composite pairs untouched', () => {
    const input = [pair('doc', 'A'), pair('sheet', 'B')];
    const { pairs, synthetic } = expandCompanionPairs(input);
    expect(pairs).toEqual(input);
    expect(synthetic.size).toEqual(0);
  });
});
