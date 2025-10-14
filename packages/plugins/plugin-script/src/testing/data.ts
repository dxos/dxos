//
// Copyright 2025 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { createObject } from '@dxos/echo-db';
import { ScriptType } from '@dxos/functions';
import { DataType } from '@dxos/schema';

import { Notebook } from '../types';

// NOTE: createObject(DataType.makeText is required to make codemirror work.

export const notebook = Notebook.make({
  cells: [
    {
      script: Ref.make(
        Obj.make(ScriptType, {
          source: Ref.make(createObject(DataType.makeText(['c = a + b', '', ''].join('\n')))),
        }),
      ),
    },
    {
      script: Ref.make(
        Obj.make(ScriptType, {
          source: Ref.make(createObject(DataType.makeText(['a = 100', ''].join('\n')))),
        }),
      ),
    },
    {
      script: Ref.make(
        Obj.make(ScriptType, {
          source: Ref.make(createObject(DataType.makeText(['b = 200'].join('\n')))),
        }),
      ),
    },
    {
      script: Ref.make(
        Obj.make(ScriptType, {
          source: Ref.make(createObject(DataType.makeText(['d = a * 2'].join('\n')))),
        }),
      ),
    },
    {
      script: Ref.make(
        Obj.make(ScriptType, {
          source: Ref.make(createObject(DataType.makeText(['c + d', '', '', ''].join('\n')))),
        }),
      ),
    },
  ],
});
