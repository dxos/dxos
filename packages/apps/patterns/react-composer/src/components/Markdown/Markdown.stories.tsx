//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React, { useState } from 'react';

import { PublicKey, Text } from '@dxos/client';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
import { useIdentity, useQuery, useSpace } from '@dxos/react-client';
import { ClientDecorator, ClientSpaceDecorator, textGenerator, useDataGenerator } from '@dxos/react-client/testing';
import { useId } from '@dxos/react-components';

import { useTextModel } from '../../model';
import { ComposerDocument, Replicator, schema, useYjsModel } from '../../testing';
import { MarkdownComposer } from './Markdown';

export default {
  component: MarkdownComposer
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
  render: ({ id, spaceKey }: { id: number; spaceKey: PublicKey }) => {
    const [generate, setGenerate] = useState(false);
    const generateId = useId('generate');

    const identity = useIdentity();
    const space = useSpace(spaceKey);
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
        <MarkdownComposer model={model} />
      </main>
    );
  },
  decorators: [
    ClientSpaceDecorator({
      schema,
      count: 2,
      onCreateSpace: async (space) => {
        const document = new ComposerDocument({ content: new Text('Hello, Storybook!') });
        await space?.db.add(document);
      }
    })
  ]
};

const replicator = new Replicator(TextKind.PLAIN);
export const WithYjs = {
  render: () => {
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
        <MarkdownComposer model={model} />
      </main>
    );
  },
  // TODO(wittjosiah): Decorator for doing this without clients being initialized?
  decorators: [ClientDecorator({ count: 2 })]
};
