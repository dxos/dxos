//
// Copyright 2025 DXOS.org
//

import { Ref } from '@dxos/echo';
import { createObject } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { DataType } from '@dxos/schema';

import { Notebook } from '../types';

// NOTE: createObject(DataType.makeText is required to make codemirror work.
export const createNotebook = () =>
  Notebook.make({
    cells: [
      {
        id: PublicKey.random().toString(),
        source: Ref.make(createObject(DataType.makeText(['c = a() + b', '', ''].join('\n')))),
      },
      {
        id: PublicKey.random().toString(),
        source: Ref.make(createObject(DataType.makeText(['a = () => 100', ''].join('\n')))),
      },
      {
        id: PublicKey.random().toString(),
        source: Ref.make(createObject(DataType.makeText(['b = 200'].join('\n')))),
      },
      {
        id: PublicKey.random().toString(),
        source: Ref.make(createObject(DataType.makeText(['d = a() * 2'].join('\n')))),
      },
      {
        id: PublicKey.random().toString(),
        source: Ref.make(createObject(DataType.makeText(['c + d', '', '', ''].join('\n')))),
      },
    ],
  });
