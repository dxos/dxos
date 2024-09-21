//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { type PublicKey } from '@dxos/client';
import { Input } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { ClientRepeater } from './ClientRepeater';
import { useClient } from '../client';
import { useSpace } from '../echo';

export default {
  title: 'react-client/ClientRepeater',
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

const ClientSpace = ({ spaceKey }: { spaceKey: PublicKey }) => {
  const client = useClient();
  const space = useSpace(spaceKey);
  if (!space?.isOpen) {
    return null;
  }

  return (
    <div className='flex flex-col'>
      <Input.Root>
        <Input.TextInput
          placeholder='Name'
          value={space.properties.name}
          onChange={(event) => (space.properties.name = event.target.value)}
        />
      </Input.Root>
      <JsonPanel value={client.toJSON()} />
    </div>
  );
};

export const Default = {
  render: () => <ClientRepeater component={ClientStory} count={2} />,
};

export const Space = {
  render: () => <ClientRepeater component={ClientSpace} count={2} createSpace />,
};
