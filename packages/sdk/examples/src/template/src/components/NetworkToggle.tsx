//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type Client } from '@dxos/react-client';
import { ConnectionState } from '@dxos/react-client/mesh';
import { Next } from '@dxos/react-ui/next';

export const NetworkToggle = ({ clients }: { clients: Client[] }) => {
  const toggleNetwork = async (checked: boolean) => {
    const mode = checked ? ConnectionState.OFFLINE : ConnectionState.ONLINE;
    await Promise.all(clients.map((client) => client.mesh.updateConfig(mode)));
  };

  return (
    <div className='flex'>
      <Next.Checkbox
        classNames='mr-2'
        onCheckedChange={({ checked }) => toggleNetwork(checked === true)}
        label={
          <>
            Disable{' '}
            <a
              href='https://docs.dxos.org/guide/platform/'
              target='_blank'
              rel='noreferrer'
              className='text-primary-600 dark:text-primary-400'
            >
              replication
            </a>{' '}
            (go offline)
          </>
        }
      />
    </div>
  );
};
