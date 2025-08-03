//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from 'vitest';

import { topologicalSort } from './helpers';

describe('topologicalSort', () => {
  it('should handle empty array', () => {
    const result = topologicalSort([]);
    expect(result).toEqual([]);
  });

  it('should handle single node with no dependencies', () => {
    const nodes = [{ id: 'A', dependsOn: [], data: 1 }];
    const result = topologicalSort(nodes);
    expect(result).toEqual(nodes);
  });

  it('should sort simple linear dependencies', () => {
    const nodes = [
      { id: 'A', dependsOn: ['B'], data: 1 },
      { id: 'B', dependsOn: ['C'], data: 2 },
      { id: 'C', data: 3 },
    ];
    const result = topologicalSort(nodes);

    expect(result.map((n) => n.id)).toEqual(['C', 'B', 'A']);
  });

  it('should handle multiple dependencies', () => {
    const nodes = [
      { id: 'A', dependsOn: ['B', 'C'], data: 1 },
      { id: 'B', dependsOn: ['D'], data: 2 },
      { id: 'C', dependsOn: ['D'], data: 3 },
      { id: 'D', data: 4 },
    ];
    const result = topologicalSort(nodes);

    const resultIds = result.map((n) => n.id);
    expect(resultIds[0]).toBe('D'); // D must be first.
    expect(resultIds[3]).toBe('A'); // A must be last.
    // B and C can be in either order.
    expect(resultIds.slice(1, 3)).toContain('B');
    expect(resultIds.slice(1, 3)).toContain('C');
  });

  it('should throw on circular dependencies', () => {
    const nodes = [
      { id: 'A', dependsOn: ['B'], data: 1 },
      { id: 'B', dependsOn: ['A'], data: 2 },
    ];

    expect(() => topologicalSort(nodes)).toThrow(/Circular dependency detected/);
  });

  it('should throw on missing dependencies', () => {
    const nodes = [
      { id: 'A', dependsOn: ['B'], data: 1 },
      { id: 'B', dependsOn: ['C'], data: 2 },
      // C is missing.
    ];

    expect(() => topologicalSort(nodes)).toThrow(/Node C not found/);
  });

  it('should maintain data integrity', () => {
    const nodes = [
      { id: 'A', dependsOn: ['B'], data: { value: 1 } },
      { id: 'B', data: { value: 2 } },
    ];
    const result = topologicalSort(nodes);

    expect(result[0].data).toEqual({ value: 2 });
    expect(result[1].data).toEqual({ value: 1 });
  });

  it('should handle complex dependency graph', () => {
    const nodes = [
      { id: 'A', dependsOn: ['B', 'C'], data: 1 },
      { id: 'B', dependsOn: ['D'], data: 2 },
      { id: 'C', dependsOn: ['D', 'E'], data: 3 },
      { id: 'D', dependsOn: ['F'], data: 4 },
      { id: 'E', dependsOn: ['F'], data: 5 },
      { id: 'F', data: 6 },
    ];
    const result = topologicalSort(nodes);
    const resultIds = result.map((n) => n.id);

    // Verify order constraints.
    expect(resultIds[0]).toBe('F'); // F must be first.
    expect(resultIds[resultIds.length - 1]).toBe('A'); // A must be last.
    expect(resultIds.indexOf('D')).toBeLessThan(resultIds.indexOf('B'));
    expect(resultIds.indexOf('E')).toBeLessThan(resultIds.indexOf('C'));
  });
});
