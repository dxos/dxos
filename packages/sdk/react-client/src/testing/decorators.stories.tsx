//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { type PublicKey } from '@dxos/client';
import { withTheme } from '@dxos/storybook-utils';

import { ClientRepeater } from './ClientRepeater';
import { useClient } from '../client';
import { useSpace } from '../echo';

export default {
  title: 'testing/decorators',
  decorators: [withTheme],
};

const JsonPanel = ({ value }: { value: any }) => (
  <pre
    style={{
      margin: 0,
      // code whiteSpace: 'pre-wrap',
      // code wordBreak: 'break-all',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}
  >
    {JSON.stringify(value, undefined, 2)}
  </pre>
);

const ClientStory = () => {
  const client = useClient();

  return <JsonPanel value={client.toJSON()} />;
};

export const WithClient = {
  render: () => <ClientRepeater Component={ClientStory} count={2} />,
};

const ClientSpace = ({ spaceKey }: { spaceKey: PublicKey }) => {
  const space = useSpace(spaceKey);

  if (!space) {
    return <>null</>;
  }

  return (
    <div className='flex-1 min-w-0 p-4'>
      <label>
        Name <input value={space.properties.name} onChange={(event) => (space.properties.name = event.target.value)} />
      </label>
    </div>
  );
};

export const WithClientSpace = {
  render: () => <ClientRepeater Component={ClientSpace} count={2} createSpace />,
};

export const WithNetworkToggle = {
  render: () => <ClientRepeater Component={ClientSpace} count={2} createSpace networkToggle />,
};
