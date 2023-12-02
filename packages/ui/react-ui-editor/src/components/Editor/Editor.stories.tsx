//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { type PublicKey } from '@dxos/react-client';
import { TextObject, TextKind, useQuery, useSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ClientDecorator, setupPeersInSpace, textGenerator, useDataGenerator } from '@dxos/react-client/testing';
import { useId } from '@dxos/react-ui';

import { Editor, type EditorProps } from './Editor';
import { EditorDocument, types as schema } from '../../testing';

export default {
  component: Editor,
};

const Story = ({ spaceKey, ...params }: Pick<EditorProps, 'slots'> & { spaceKey: PublicKey }) => {
  const [generate, setGenerate] = useState(false);
  const generateId = useId('generate');

  const identity = useIdentity();
  const space = useSpace(spaceKey);
  const [document] = useQuery(space, EditorDocument.filter());

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
      <Editor identity={identity} space={space} text={document?.content} {...params} />
    </main>
  );
};

const { spaceKey: markdownSpaceKey, clients: markdownClients } = await setupPeersInSpace({
  count: 2,
  schema,
  onCreateSpace: async (space) => {
    const document = new EditorDocument({ content: new TextObject('Hello, Storybook!') });
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
    const document = new EditorDocument({ content: new TextObject('Hello, Storybook!', TextKind.RICH) });
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
