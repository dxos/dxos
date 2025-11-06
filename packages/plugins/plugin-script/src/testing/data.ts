//
// Copyright 2025 DXOS.org
//

import { Prompt } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { createObject } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown/types';

import { Notebook } from '../types';

// TODO(burdon): NOTE: createObject is required for tests.

export const createNotebook = (): Notebook.Notebook =>
  Notebook.make({
    cells: [
      {
        id: PublicKey.random().toString(),
        type: 'script',
        source: Ref.make(createObject(Text.make('c = a() + b'))),
      },
      {
        id: PublicKey.random().toString(),
        type: 'script',
        source: Ref.make(createObject(Text.make('a = () => 100'))),
      },
      {
        id: PublicKey.random().toString(),
        type: 'script',
        source: Ref.make(createObject(Text.make('b = 200'))),
      },
      {
        id: PublicKey.random().toString(),
        type: 'script',
        source: Ref.make(createObject(Text.make('d = a() * 2'))),
      },
      {
        id: PublicKey.random().toString(),
        type: 'script',
        source: Ref.make(createObject(Text.make('c + d'))),
      },
      {
        id: PublicKey.random().toString(),
        type: 'prompt',
        prompt: Ref.make(
          createObject(
            Prompt.make({
              instructions: 'Very briefly, what colors are associated with the numbers {{a}} and {{b}}.',
            }),
          ),
        ),
      },
      {
        id: PublicKey.random().toString(),
        type: 'query',
        source: Ref.make(createObject(Text.make(`docs = (type: ${Markdown.Document.typename})`))),
      },
      {
        id: PublicKey.random().toString(),
        type: 'prompt',
        prompt: Ref.make(
          createObject(
            Prompt.make({
              instructions: 'Very briefly, summarize the documents: {{docs}}',
            }),
          ),
        ),
      },
    ],
  });
