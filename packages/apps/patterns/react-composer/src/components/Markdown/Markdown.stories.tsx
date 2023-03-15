//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React, { useState } from 'react';

import { PublicKey, Text } from '@dxos/client';
import { useIdentity, useQuery, useSpace } from '@dxos/react-client';
import { ClientDecorator, ClientSpaceDecorator, loremGenerator, useDataGenerator } from '@dxos/react-client/testing';
import { useId } from '@dxos/react-components';

import { ComposerDocument, Replicator, schema, usePlainYjsModel } from '../../testing';
import { MarkdownComposer } from './Markdown';
import { usePlainTextModel } from './model';

export default {
  component: MarkdownComposer
};

export const Echo = {
  render: ({ id, spaceKey }: { id: number; spaceKey: PublicKey }) => {
    const [generate, setGenerate] = useState(false);
    const generateId = useId('generate');

    const identity = useIdentity();
    const space = useSpace(spaceKey);
    const [document] = useQuery(space, ComposerDocument.filter());
    const model = usePlainTextModel({ identity, space, text: document?.content });

    useDataGenerator({
      generator: generate ? loremGenerator : undefined,
      options: { plainText: model?.fragment }
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
        const document = new ComposerDocument({ content: new Text() });
        await space?.db.add(document);
      }
    })
  ]
};

const replicator = new Replicator();
export const Yjs = {
  render: () => {
    const [generate, setGenerate] = useState(false);
    const generateId = useId('generate');

    const model = usePlainYjsModel({ replicator });

    useDataGenerator({
      generator: generate ? loremGenerator : undefined,
      options: { plainText: model.fragment }
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
