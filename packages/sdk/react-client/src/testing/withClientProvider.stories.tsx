//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { log } from '@dxos/log';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { withClientProvider, type WithClientProviderProps, withMultiClientProvider } from './withClientProvider';
import { useClient } from '../client';
import { type Space, useSpaces } from '../echo';

const SpaceInfo = ({ space }: { space: Space }) => {
  const name = space.isOpen ? space.properties.name : '';
  return <SyntaxHighlighter language='json'>{JSON.stringify({ id: space.id, name }, null, 2)}</SyntaxHighlighter>;
};

const Test = () => {
  const client = useClient();
  const spaces = useSpaces();
  if (!client) {
    return null;
  }

  return (
    <div className='flex flex-col min-w-[28rem] divide-y divide-separator border border-separator rounded'>
      <SyntaxHighlighter language='json'>{JSON.stringify(client.toJSON(), null, 2)}</SyntaxHighlighter>
      {spaces.map((space) => (
        <SpaceInfo key={space.id} space={space} />
      ))}
    </div>
  );
};

export default {
  title: 'react-client/withClientProvider',
  render: Test,
};

const clientProps: WithClientProviderProps = {
  createIdentity: true,
  createSpace: true,
  onInitialized: async (client) => {
    log.info('onInitialized', { client });
  },
  onSpaceCreated: async ({ client, space }) => {
    log.info('onSpaceCreated', { client, space });
  },
};

export const Default = {
  decorators: [withClientProvider(clientProps), withTheme, withLayout({ classNames: ['flex gap-2'] })],
};

export const Multiple = {
  decorators: [
    withMultiClientProvider({ ...clientProps, numClients: 3 }),
    withTheme,
    withLayout({ classNames: ['flex gap-2'] }),
  ],
};
