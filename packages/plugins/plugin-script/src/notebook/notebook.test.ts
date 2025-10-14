//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { ScriptType } from '@dxos/functions';
import { DataType } from '@dxos/schema';

import { Notebook } from '../types';

import { ComputeGraph } from './notebook';

// TODO(burdon): Create test where one cell could be a AI prompt that references other cells.
// TODO(burdon): UI cells: Value, Query, TS Expression, Prompt (show input and output).

describe('notebook', () => {
  test('parse dependency graph', () => {
    const notebook = Notebook.make({
      cells: [
        Obj.make(ScriptType, {
          source: Ref.make(DataType.makeText('c = a + b')),
        }),
        Obj.make(ScriptType, {
          source: Ref.make(DataType.makeText('a = 100')),
        }),
        Obj.make(ScriptType, {
          source: Ref.make(DataType.makeText('b = 200')),
        }),
        Obj.make(ScriptType, {
          source: Ref.make(DataType.makeText('d = a * 2')),
        }),
        Obj.make(ScriptType, {
          source: Ref.make(DataType.makeText('c + d')),
        }),
      ],
    });

    const computer = new ComputeGraph(notebook);
    const result = computer.parse();

    // Check dependencies.
    expect(result.dependencyGraph).toMatchObject({
      [notebook.cells[0].id]: [notebook.cells[1].id, notebook.cells[2].id],
      [notebook.cells[3].id]: [notebook.cells[1].id],
      [notebook.cells[4].id]: [notebook.cells[0].id, notebook.cells[3].id],
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
