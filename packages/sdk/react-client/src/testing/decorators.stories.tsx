//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { PublicKey } from '@dxos/keys';
import { observer } from '@dxos/observable-object/react';

import { useClient } from '../client';
import { useSpace } from '../echo';
import { ClientDecorator } from './ClientDecorator';
import { setupPeersInSpace } from './ClientSpaceDecorator';

export default {
  title: 'testing/decorators',
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
  render: () => <ClientStory />,
  decorators: [ClientDecorator({ count: 2 })],
};

const ClientSpace = observer(({ spaceKey }: { spaceKey: PublicKey }) => {
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
});

const { spaceKey, clients } = await setupPeersInSpace({ count: 2 });

export const WithClientSpace = {
  render: (args: { id: number }) => <ClientSpace {...args} spaceKey={spaceKey} />,
  decorators: [ClientDecorator({ clients })],
};
