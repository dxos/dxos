//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { createNotebook } from '../testing';

import { ComputeGraph } from './notebook';

// TODO(burdon): Create test where one cell could be a AI prompt that references other cells.
// TODO(burdon): UI cells: Value, Query, TS Expression, Prompt (show input and output).

describe('notebook', () => {
  test('parse dependency graph', () => {
    const notebook = createNotebook();

    const computer = new ComputeGraph(notebook);
    const result = computer.parse();

    const getId = (i: number) => notebook.cells[i].script.target!.id;

    // Check dependencies.
    expect(result.dependencyGraph).toMatchObject({
      [getId(0)]: [getId(1), getId(2)],
      [getId(3)]: [getId(1)],
      [getId(4)]: [getId(0), getId(3)],
    });

    // Compute values.
    const values = computer.evaluate();
    expect(values).toEqual({
      a: 100,
      b: 200,
      c: 300,
      d: 200,
    });

    // Check that values are accessible via the getter.
    expect(computer.values).toEqual({
      a: 100,
      b: 200,
      c: 300,
      d: 200,
    });
  });
});
