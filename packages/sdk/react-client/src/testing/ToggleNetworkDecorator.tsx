//
// Copyright 2022 DXOS.org
//

import { DecoratorFunction } from '@storybook/csf';
import { ReactRenderer } from '@storybook/react';
import React from 'react';

import { Input } from '@dxos/aurora';
import { Client } from '@dxos/client';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';

export type ToggleNetworkDecoratorOptions = {
  clients: Client[];
};

/**
 * Storybook decorator which provides a toggle for disabling replication in the specified clients.
 *
 * @param {number} clients
 * @returns {DecoratorFunction}
 */
export const ToggleNetworkDecorator = ({
  clients,
}: ToggleNetworkDecoratorOptions): DecoratorFunction<ReactRenderer, any> => {
  const toggleNetwork = async (checked: boolean) => {
    const mode = checked ? ConnectionState.OFFLINE : ConnectionState.ONLINE;
    await Promise.all(clients.map((client) => client.mesh.updateConfig(mode)));
  };

  return (Story, context) => (
    <>
      <div className='flex'>
        <Input.Root>
          <Input.Checkbox classNames='me-2' onCheckedChange={toggleNetwork} />
          <Input.Label>
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
          </Input.Label>
        </Input.Root>
      </div>
      {Story({ args: context.args })}
    </>
  );
};
