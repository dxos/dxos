//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { Expando } from '@dxos/schema';

import { getSelectionContext } from './useSelectionContext';

describe('getSelectionContext', () => {
  const object = Obj.make(Expando.Expando, { content: 'hello brave world' });
  const typename = Obj.getTypename(object);
  const resolver = {
    key: typename ?? '',
    getText: (_obj: unknown, anchor: string) => (anchor === 'a:b' ? 'brave' : undefined),
  };

  test('resolves selection ranges to text via the typename resolver', ({ expect }) => {
    const context = getSelectionContext({
      object,
      selection: { mode: 'multi-range', ranges: [{ from: 'a', to: 'b' }] },
      resolvers: [resolver],
    });
    expect(context?.selection?.text).toBe('brave');
    expect(context?.selection?.anchors).toEqual(['a:b']);
  });

  test('returns undefined without a matching resolver', ({ expect }) => {
    const context = getSelectionContext({
      object,
      selection: { mode: 'multi-range', ranges: [{ from: 'a', to: 'b' }] },
      resolvers: [],
    });
    expect(context).toBeUndefined();
  });

  test('returns undefined when nothing resolves', ({ expect }) => {
    const context = getSelectionContext({
      object,
      selection: { mode: 'multi-range', ranges: [{ from: 'x', to: 'y' }] },
      resolvers: [resolver],
    });
    expect(context).toBeUndefined();
  });

  test('returns undefined for an empty selection', ({ expect }) => {
    expect(getSelectionContext({ object, selection: undefined, resolvers: [resolver] })).toBeUndefined();
  });

  test('skips a range whose cursor throws and keeps the ranges that resolve', ({ expect }) => {
    const throwingResolver = {
      key: typename ?? '',
      getText: (_obj: unknown, anchor: string) => {
        if (anchor === 'stale:cursor') {
          throw new Error('unparseable cursor');
        }
        return anchor === 'a:b' ? 'brave' : undefined;
      },
    };

    const context = getSelectionContext({
      object,
      selection: {
        mode: 'multi-range',
        ranges: [
          { from: 'stale', to: 'cursor' },
          { from: 'a', to: 'b' },
        ],
      },
      resolvers: [throwingResolver],
    });
    expect(context?.selection?.text).toBe('brave');
    expect(context?.selection?.anchors).toEqual(['a:b']);
  });

  test('drops an unresolvable range from anchors so anchors stay aligned with text', ({ expect }) => {
    const context = getSelectionContext({
      object,
      selection: {
        mode: 'multi-range',
        ranges: [
          { from: 'x', to: 'y' },
          { from: 'a', to: 'b' },
        ],
      },
      resolvers: [resolver],
    });
    expect(context?.selection?.text).toBe('brave');
    expect(context?.selection?.anchors).toEqual(['a:b']);
  });
});
