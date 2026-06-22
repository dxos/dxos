//
// Copyright 2025 DXOS.org
//

import { Instructions } from '@dxos/compute';
import { Ref, Type } from '@dxos/echo';
import { createObject } from '@dxos/echo-client';
import { PublicKey } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown';
import { Text } from '@dxos/schema';

import { Notebook } from '#types';

// TODO(burdon): NOTE: createObject is required for tests.
export const createNotebook = (): Notebook.Notebook =>
  Notebook.make({
    cells: [
      {
        id: PublicKey.random().toString(),
        type: 'script',
        source: Ref.make(createObject(Text.make({ content: 'c = a() + b' }))),
      },
      {
        id: PublicKey.random().toString(),
        type: 'script',
        source: Ref.make(createObject(Text.make({ content: 'a = () => 100' }))),
      },
      {
        id: PublicKey.random().toString(),
        type: 'script',
        source: Ref.make(createObject(Text.make({ content: 'b = 200' }))),
      },
      {
        id: PublicKey.random().toString(),
        type: 'script',
        source: Ref.make(createObject(Text.make({ content: 'd = a() * 2' }))),
      },
      {
        id: PublicKey.random().toString(),
        type: 'script',
        source: Ref.make(createObject(Text.make({ content: 'c + d' }))),
      },
      {
        id: PublicKey.random().toString(),
        type: 'prompt',
        prompt: Ref.make(
          createObject(
            Instructions.make({
              text: 'Very briefly, what colors are associated with the numbers {{a}} and {{b}}.',
            }),
          ),
        ),
      },
      {
        id: PublicKey.random().toString(),
        type: 'query',
        source: Ref.make(createObject(Text.make({ content: `docs = (type: ${Type.getTypename(Markdown.Document)})` }))),
      },
      {
        id: PublicKey.random().toString(),
        type: 'prompt',
        prompt: Ref.make(
          createObject(
            Instructions.make({
              text: 'Very briefly, summarize the documents: {{docs}}',
            }),
          ),
        ),
      },
    ],
  });
