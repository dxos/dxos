//
// Copyright 2025 DXOS.org
//

import { Prompt } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { createObject } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown/types';
import { DataType } from '@dxos/schema';

import { Notebook } from '../types';

export const createNotebook = (): Notebook.Notebook =>
  Notebook.make({
    cells: [
      {
        id: PublicKey.random().toString(),
        type: 'script',
        script: Ref.make(createObject(DataType.makeText(['c = a() + b'].join('\n')))),
      },
      {
        id: PublicKey.random().toString(),
        type: 'script',
        script: Ref.make(createObject(DataType.makeText(['a = () => 100'].join('\n')))),
      },
      {
        id: PublicKey.random().toString(),
        type: 'script',
        script: Ref.make(createObject(DataType.makeText(['b = Math.PI'].join('\n')))),
      },
      {
        id: PublicKey.random().toString(),
        type: 'script',
        script: Ref.make(createObject(DataType.makeText(['d = a() * 2'].join('\n')))),
      },
      {
        id: PublicKey.random().toString(),
        type: 'script',
        script: Ref.make(createObject(DataType.makeText(['c + d'].join('\n')))),
      },
      {
        id: PublicKey.random().toString(),
        type: 'query',
        script: Ref.make(
          createObject(DataType.makeText(`docs = ( type: ${Markdown.Document.typename} AND #research )`)),
        ),
      },
      {
        id: PublicKey.random().toString(),
        type: 'prompt',
        prompt: Ref.make(
          Prompt.make({
            instructions: 'Very briefly, what colors are associated with the numbers {{a}} and {{b}}.',
          }),
        ),
      },
    ],
  });
