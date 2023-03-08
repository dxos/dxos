//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { PublicKey } from '@dxos/keys';
import { Input } from '@dxos/react-components';

import { useClient } from '../client';
import { observer, useSpace } from '../echo';
import { ClientDecorator } from './ClientDecorator';
import { ClientSpaceDecorator } from './ClientSpaceDecorator';

export default {
  title: 'testing/decorators'
};

const JsonPanel = ({ value }: { value: any }) => (
  <pre
    style={{
      margin: 0,
      // code whiteSpace: 'pre-wrap',
      // code wordBreak: 'break-all',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }}
  >
    {JSON.stringify(value, undefined, 2)}
  </pre>
);

export const Client = {
  render: () => {
    const client = useClient();

    return <JsonPanel value={client.toJSON()} />;
  },
  decorators: [ClientDecorator({ count: 2 })]
};

export const ClientSpace = {
  render: observer(({ spaceKey }: { spaceKey: PublicKey }) => {
    const space = useSpace(spaceKey);

    if (!space) {
      return null;
    }

    return (
      <div className='flex-1 min-w-0 p-4'>
        <Input
          label='Name'
          value={space.properties.name}
          onChange={(event) => (space.properties.name = event.target.value)}
        />
      </div>
    );
  }),
  decorators: [ClientSpaceDecorator({ count: 2 })]
};
