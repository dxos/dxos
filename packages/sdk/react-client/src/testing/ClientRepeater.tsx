//
// Copyright 2022 DXOS.org
//

import React, { useState, type FC, useEffect } from 'react';

import { Client, type PublicKey } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { registerSignalFactory } from '@dxos/echo-signals/react';
import { faker } from '@dxos/random';
import { type MaybePromise } from '@dxos/util';

import { ClientContext } from '../client';

const testBuilder = new TestBuilder();

export type RepeatedComponentProps = { id: number; count: number };

export type ClientRepeaterProps<P extends RepeatedComponentProps> = {
  component: FC<any>;
  className?: string;
  controls?: FC<{ clients: Client[] }>;
  clients?: Client[];
  count?: number;
  registerSignalFactory?: boolean;
  schema?: Parameters<Client['addType']>;
  createIdentity?: boolean;
  createSpace?: boolean;
  onCreateSpace?: (space: Space) => MaybePromise<void>;
  args?: Omit<P, 'id' | 'count'>;
};

/**
 * Utility component for Storybook stories which sets up clients for n peers.
 * The `Component` property is rendered n times, once for each peer.
 */
// NOTE: This is specifically not a storybook decorator because it broke stories as a decorator.
//   This seems primarily due to the fact that it required top-level await for the clients to initialize.
//   Storybook seemed to handle it alright, but Chromatic had a lot of trouble with it.
//   There was also a question of whether or not calling the story function multiple times was a good idea.
// TODO(wittjosiah): Rename.
export const ClientRepeater = <P extends RepeatedComponentProps>(props: ClientRepeaterProps<P>) => {
  const {
    component: Component,
    controls: Controls,
    count = 1,
    className = 'flex w-full place-content-evenly',
    schema,
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
      const clients = [...Array(count)].map((_) => new Client({ services: testBuilder.createLocalClientServices() }));
      await Promise.all(clients.map((client) => client.initialize()));
      schema && clients.map((client) => client.addType(...schema));

      if (createIdentity || createSpace) {
        await Promise.all(clients.map((client) => client.halo.createIdentity()));
      }

      if (createSpace) {
        const space = await clients[0].spaces.create({ name: faker.commerce.productName() });
        setSpaceKey(space.key);
        await onCreateSpace?.(space);
        await Promise.all(clients.slice(1).map((client) => performInvitation({ host: space, guest: client.spaces })));
      }

      setClients(clients);
    });

    return () => clearTimeout(timeout);
  }, []);

  if (clients.length === 0) {
    return null;
  }

  return (
    <>
      {Controls && <Controls clients={clients} />}
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
