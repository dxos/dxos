//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { withClientProvider, withMultiClientProvider } from './withClientProvider';
import { useClient } from '../client';
import { type Space, useSpaces } from '../echo';

const SpaceInfo = ({ space }: { space: Space }) => {
  const name = space.isOpen ? space.properties.name : '';
  return <SyntaxHighlighter language='json'>{JSON.stringify({ id: space.id, name }, null, 2)}</SyntaxHighlighter>;
};

const Test = () => {
  const client = useClient();
  // TODO(burdon): [SDK]: 'all' property has no effect?
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
  component: Test,
  decorators: [withTheme, withClientProvider({ createIdentity: true })],
};

export const Default = {};

export const Multiple = {
  decorators: [
    withMultiClientProvider({
      numClients: 3,
      createIdentity: true,
      createSpace: true,
    }),
    withLayout({ classNames: ['flex gap-2'] }),
    withTheme,
  ],
};
