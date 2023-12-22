//
// Copyright 2022 DXOS.org
//

import { faker } from '@faker-js/faker';
import React, { useState, type FC, useEffect } from 'react';

import { Client, type PublicKey } from '@dxos/client';
import { type SpaceProxy, type Space, type TypeCollection } from '@dxos/client/echo';
import { ConnectionState } from '@dxos/client/mesh';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { registerSignalFactory } from '@dxos/echo-signals/react';
import { Input } from '@dxos/react-ui';
import { type MaybePromise } from '@dxos/util';

import { ClientContext } from '../client';

const testBuilder = new TestBuilder();

export type RepeatedComponentProps = { id: number; count: number };

export type ClientRepeaterProps<P extends RepeatedComponentProps> = {
  clients?: Client[];
  count?: number;
  registerSignalFactory?: boolean;
  className?: string;
  Component: FC<any>;
  types?: TypeCollection;
  networkToggle?: boolean;
  createIdentity?: boolean;
  createSpace?: boolean;
  onCreateSpace?: (space: Space) => MaybePromise<void>;
  args?: Omit<P, 'id' | 'count'>;
};

/**
 * Utility component for Storybook stories which sets up clients for n peers.
 * The `Component` property is rendered n times, once for each peer.
 */
// TODO(wittjosiah): Rename.
export const ClientRepeater = <P extends RepeatedComponentProps>(props: ClientRepeaterProps<P>) => {
  const {
    count = 1,
    className = 'flex w-full place-content-evenly',
    Component,
    networkToggle,
    types,
    createIdentity,
    createSpace,
    onCreateSpace,
  } = props;
  if (props.registerSignalFactory ?? true) {
    registerSignalFactory();
  }

  const [clients, setClients] = useState(props.clients ?? []);
  const [spaceKey, setSpaceKey] = useState<PublicKey>();

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const clients = [...Array(count)].map((_) => new Client({ services: testBuilder.createLocal() }));
      await Promise.all(clients.map((client) => client.initialize()));
      types && clients.map((client) => client.spaces.addSchema(types));
      setClients(clients);

      if (createIdentity || createSpace) {
        await Promise.all(clients.map((client) => client.halo.createIdentity()));
      }

      if (createSpace) {
        const space = await clients[0].spaces.create({ name: faker.animal.bird() });
        setSpaceKey(space.key);
        await onCreateSpace?.(space);
        await Promise.all(
          clients.slice(1).map((client) => performInvitation({ host: space as SpaceProxy, guest: client.spaces })),
        );
      }
    });

    return () => clearTimeout(timeout);
  }, []);

  if (clients.length === 0) {
    return null;
  }

  return (
    <>
      {networkToggle && <ToggleNetwork clients={clients} />}
      <div className={className}>
        {clients.map((client, index) => (
          <ClientContext.Provider key={index} value={{ client }}>
            <Component id={index} count={clients.length} {...{ ...props.args, spaceKey }} />
          </ClientContext.Provider>
        ))}
      </div>
    </>
  );
};

const ToggleNetwork = ({ clients }: { clients: Client[] }) => {
  const toggleNetwork = async (checked: boolean) => {
    const mode = checked ? ConnectionState.OFFLINE : ConnectionState.ONLINE;
    await Promise.all(clients.map((client) => client.mesh.updateConfig(mode)));
  };

  return (
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
  );
};
