//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { createDiagramCache } from './diagram-cache.ts';

const svg = (chars: number) => 'x'.repeat(chars);

describe('diagram cache', () => {
  test('keeps at most 4M characters, dropping the least recently used diagram first', () => {
    const { get: getDiagram, set: setDiagram } = createDiagramCache();
    setDiagram('a', svg(1_500_000));
    setDiagram('b', svg(1_500_000));
    getDiagram('a');
    setDiagram('c', svg(1_500_000));
    expect(getDiagram('a')).toBeDefined();
    expect(getDiagram('b')).toBeUndefined();
    expect(getDiagram('c')).toBeDefined();
  });

  test('a diagram larger than the whole budget is not kept and evicts nothing', () => {
    const { get: getDiagram, set: setDiagram } = createDiagramCache();
    setDiagram('small', svg(10));
    setDiagram('huge', svg(4_000_001));
    expect(getDiagram('huge')).toBeUndefined();
    expect(getDiagram('small')).toBeDefined();
  });
});
