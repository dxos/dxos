//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { useId } from '@dxos/aurora';
import { PublicKey } from '@dxos/react-client';
import { Text, TextKind, useQuery, useSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ClientDecorator, setupPeersInSpace, textGenerator, useDataGenerator } from '@dxos/react-client/testing';

import { Composer, ComposerProps } from './Composer';
import { ComposerDocument, types as schema } from '../../testing';

export default {
  component: Composer,
};

const Story = ({ spaceKey, ...args }: Pick<ComposerProps, 'slots'> & { spaceKey: PublicKey }) => {
  const [generate, setGenerate] = useState(false);
  const generateId = useId('generate');

  const identity = useIdentity();
  const space = useSpace(spaceKey);
  const [document] = useQuery(space, ComposerDocument.filter());

  useDataGenerator({
    generator: generate ? textGenerator : undefined,
    options: { text: document?.content.content },
  });

  return (
    <main className='flex-1 min-w-0 p-4'>
      <div id={generateId} className='flex'>
        <input type='checkbox' onChange={(event) => setGenerate(event.target.checked)} />
        Generate Data
      </div>
      {document?.content.toString().length}
      <Composer identity={identity} space={space} text={document?.content} {...args} />
    </main>
  );
};

const { spaceKey: markdownSpaceKey, clients: markdownClients } = await setupPeersInSpace({
  count: 2,
  schema,
  onCreateSpace: async (space) => {
    const document = new ComposerDocument({ content: new Text('Hello, Storybook!') });
    await space?.db.add(document);
  },
});

export const Markdown = {
  render: (args: { id: number }) => <Story {...args} spaceKey={markdownSpaceKey} />,
  decorators: [ClientDecorator({ clients: markdownClients })],
};

const { spaceKey: richSpaceKey, clients: richClients } = await setupPeersInSpace({
  count: 2,
  schema,
  onCreateSpace: async (space) => {
    const document = new ComposerDocument({ content: new Text('Hello, Storybook!', TextKind.RICH) });
    await space?.db.add(document);
  },
});

export const Rich = {
  render: (args: { id: number }) => <Story {...args} spaceKey={richSpaceKey} />,
  args: {
    slots: {
      editor: {
        className: 'z-0 rounded bg-white text-neutral-900 w-full p-4 dark:bg-neutral-850 dark:text-white min-bs-[12em]',
      },
    },
  },
  decorators: [ClientDecorator({ clients: richClients })],
};
