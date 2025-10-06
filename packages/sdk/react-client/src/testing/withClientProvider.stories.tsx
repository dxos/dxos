//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { log } from '@dxos/log';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withTheme } from '@dxos/react-ui/testing';
import { render } from '@dxos/storybook-utils';

import { useClient } from '../client';
import { type Space, useSpaces } from '../echo';

import { type WithClientProviderProps, withClientProvider, withMultiClientProvider } from './withClientProvider';

const SpaceInfo = ({ space }: { space: Space }) => {
  const name = space.isOpen ? space.properties.name : '';
  return <SyntaxHighlighter language='json'>{JSON.stringify({ id: space.id, name }, null, 2)}</SyntaxHighlighter>;
};

const DefaultStory = () => {
  const client = useClient();
  const spaces = useSpaces();
  if (!client) {
    return null;
  }

  return (
    <div className='flex flex-col divide-y divide-separator border border-separator'>
      <SyntaxHighlighter language='json'>{JSON.stringify(client.toJSON(), null, 2)}</SyntaxHighlighter>
      {spaces.map((space) => (
        <SpaceInfo key={space.id} space={space} />
      ))}
    </div>
  );
};

const meta = {
  title: 'sdk/react-client/withClientProvider',
  render: render(DefaultStory),
  decorators: [withTheme],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const clientProps: WithClientProviderProps = {
  createIdentity: true,
  createSpace: true,
  onInitialized: async (client) => {
    log.info('onInitialized', { client });
  },
  onCreateSpace: async ({ client, space }) => {
    log.info('onCreateSpace', { client, space });
  },
};

export const Default: Story = {
  decorators: [withClientProvider(clientProps)],
  parameters: {
    layout: 'centered',
  },
};

export const Multiple: Story = {
  decorators: [withMultiClientProvider({ ...clientProps, numClients: 3 })],
  parameters: {
    layout: {
      type: 'fullscreen',
      classNames: 'grid grid-cols-3',
    },
  },
};
