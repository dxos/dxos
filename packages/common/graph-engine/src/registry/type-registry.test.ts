//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { defaultNodeHandler, defaultEdgeHandler } from './default-handlers';
import { TypeRegistry } from './type-registry';

describe('TypeRegistry', () => {
  test('falls back to default handler when type unknown', ({ expect }) => {
    const r = new TypeRegistry();
    const h = r.resolveNode({ id: 'x', type: 'unknown' });
    expect(h).toBe(defaultNodeHandler);
  });

  test('returns registered handler for matching type', ({ expect }) => {
    const r = new TypeRegistry();
    const customHandler = { ...defaultNodeHandler };
    r.registerNode('person', customHandler);
    expect(r.resolveNode({ id: 'x', type: 'person' })).toBe(customHandler);
  });

  test('untyped node resolves to default', ({ expect }) => {
    const r = new TypeRegistry();
    expect(r.resolveNode({ id: 'x' })).toBe(defaultNodeHandler);
  });

  test('edge fallback works the same way', ({ expect }) => {
    const r = new TypeRegistry();
    expect(r.resolveEdge({ id: 'e', source: 'a', target: 'b' } as any)).toBe(defaultEdgeHandler);
  });

  test('returns registered edge handler for matching type', ({ expect }) => {
    const r = new TypeRegistry();
    const customHandler = { ...defaultEdgeHandler };
    r.registerEdge('link', customHandler);
    expect(r.resolveEdge({ id: 'e', type: 'link', source: 'a', target: 'b' } as any)).toBe(customHandler);
  });
});
