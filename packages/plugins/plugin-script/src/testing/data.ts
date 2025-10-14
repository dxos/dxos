//
// Copyright 2025 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { ScriptType } from '@dxos/functions';
import { DataType } from '@dxos/schema';

import { Notebook } from '../types';

export const notebook = Notebook.make({
  cells: [
    Obj.make(ScriptType, {
      source: Ref.make(DataType.makeText(['c = a + b', '', ''].join('\n'))),
    }),
    Obj.make(ScriptType, {
      source: Ref.make(DataType.makeText(['a = 100', ''].join('\n'))),
    }),
    Obj.make(ScriptType, {
      source: Ref.make(DataType.makeText(['b = 200'].join('\n'))),
    }),
    Obj.make(ScriptType, {
      source: Ref.make(DataType.makeText(['d = a * 2'].join('\n'))),
    }),
    Obj.make(ScriptType, {
      source: Ref.make(DataType.makeText(['c + d', '', '', ''].join('\n'))),
    }),
  ],
});
