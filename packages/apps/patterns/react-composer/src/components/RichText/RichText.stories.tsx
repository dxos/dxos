//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { useState } from 'react';

import { PublicKey, Text } from '@dxos/client';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
import { useIdentity, useQuery, useSpace } from '@dxos/react-client';
import { ClientDecorator, ClientSpaceDecorator, textGenerator, useDataGenerator } from '@dxos/react-client/testing';
import { mx, useId } from '@dxos/react-components';

import { useTextModel } from '../../model';
import { ComposerDocument, Replicator, schema, useYjsModel } from '../../testing';
import { RichTextComposer, RichTextComposerProps } from './RichText';

export default {
  component: RichTextComposer
};

export const Default = {
  args: {
    model: {
      id: 'editor',
      content: 'Hello, Storybook!'
    }
  }
};

export const WithEcho = {
  render: ({ spaceKey, id, ...args }: Omit<RichTextComposerProps, 'model'> & { spaceKey?: PublicKey; id: number }) => {
    const [generate, setGenerate] = useState(false);
    const generateId = useId('generate');

    const identity = useIdentity();
    const space = useSpace(spaceKey);
    // TODO(burdon): Update on mutation?
    const [document] = useQuery(space, ComposerDocument.filter());
    const model = useTextModel({ identity, space, text: document?.content });

    useDataGenerator({
      generator: generate ? textGenerator : undefined,
      options: { text: typeof model?.content !== 'string' ? model?.content : undefined }
    });

    return (
      <main className='flex-1 min-w-0 p-4'>
        <div id={generateId} className='flex'>
          <input type='checkbox' onChange={(event) => setGenerate(event.target.checked)} />
          Generate Data
        </div>
        <RichTextComposer
          {...args}
          model={model}
          slots={{
            editor: {
              className: mx(
                'z-0 rounded bg-white text-neutral-900 w-full p-4 dark:bg-neutral-850 dark:text-white min-bs-[12em]',
                args.slots?.editor?.className
              )
            }
          }}
        />
      </main>
    );
  },
  decorators: [
    ClientSpaceDecorator({
      schema,
      count: 2,
      onCreateSpace: async (space) => {
        const document = new ComposerDocument({ content: new Text('Hello, Storybook!', TextKind.RICH) });
        await space?.db.add(document);
      }
    })
  ]
};

const replicator = new Replicator(TextKind.RICH);
export const WithYjs = {
  render: (args: Omit<RichTextComposerProps, 'model'>) => {
    const [generate, setGenerate] = useState(false);
    const generateId = useId('generate');

    const [id] = useState(PublicKey.random().toHex());
    const model = useYjsModel({ id, replicator });

    useDataGenerator({
      generator: generate ? textGenerator : undefined,
      options: { text: typeof model?.content !== 'string' ? model?.content : undefined }
    });

    return (
      <main className='flex-1 min-w-0 p-4'>
        <div id={generateId} className='flex'>
          <input type='checkbox' onChange={(event) => setGenerate(event.target.checked)} />
          Generate Data
        </div>
        <RichTextComposer
          {...args}
          model={model}
          slots={{
            editor: {
              className: mx(
                'z-0 rounded bg-white text-neutral-900 w-full p-4 dark:bg-neutral-850 dark:text-white min-bs-[12em]',
                args.slots?.editor?.className
              )
            }
          }}
        />
      </main>
    );
  },
  // TODO(wittjosiah): Decorator for doing this without clients being initialized?
  decorators: [ClientDecorator({ count: 2 })]
};
