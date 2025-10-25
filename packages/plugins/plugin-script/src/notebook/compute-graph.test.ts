//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { createNotebook } from '../testing';

import { ComputeGraph } from './compute-graph';

describe('notebook', () => {
  test('parse dependency graph', async () => {
    const notebook = createNotebook();
    const graph = new ComputeGraph(notebook);
    const result = graph.parse();

    const getId = (i: number) => notebook.cells[i].id;

    // Check dependencies.
    expect(result.dependencyGraph).toMatchObject({
      [getId(0)]: [getId(1), getId(2)],
      [getId(3)]: [getId(1)],
      [getId(4)]: [getId(0), getId(3)],
    });

    // Compute values.
    const values = await graph.evaluate();
    expect(values).toEqual({
      [getId(0)]: 300,
      [getId(2)]: 200,
      [getId(3)]: 200,
      [getId(4)]: 500,
    });
  });

  test('evalScript blocks access to window and document', async () => {
    const notebook = createNotebook();
    // Replace one of the cells with code that tries to access window/document.
    if (notebook.cells[2].source?.target) {
      notebook.cells[2].source.target.content = 'b = typeof window';
    }

    const graph = new ComputeGraph(notebook);
    graph.parse();
    const values = await graph.evaluate();

    // Should evaluate to 'undefined' since window is blocked.
    expect(values[notebook.cells[2].id]).toBe('undefined');

    // Test document access.
    if (notebook.cells[2].source?.target) {
      notebook.cells[2].source.target.content = 'b = typeof document';
    }
    graph.parse();
    const values2 = await graph.evaluate();

    // Should evaluate to 'undefined' since document is blocked.
    expect(values2[notebook.cells[2].id]).toBe('undefined');

    // Test that safe globals still work.
    if (notebook.cells[2].source?.target) {
      notebook.cells[2].source.target.content = 'b = Math.max(100, 200)';
    }
    graph.parse();
    const values3 = await graph.evaluate();

    // Should evaluate correctly.
    expect(values3[notebook.cells[2].id]).toBe(200);
  });
});
