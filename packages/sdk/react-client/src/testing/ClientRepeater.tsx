//
// Copyright 2022 DXOS.org
//

import React, { type FC, useEffect, useRef, useState } from 'react';

import { Client, type PublicKey } from '@dxos/client';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { type TypedObject } from '@dxos/echo-schema';
import { registerSignalsRuntime } from '@dxos/echo-signals/react';
import { faker } from '@dxos/random';
import { useAsyncEffect } from '@dxos/react-hooks';

import { ClientProvider } from '../client';

import { type WithClientProviderProps } from './withClientProvider';

export type ClientRepeatedComponentProps = { id: number; count: number; spaceKey?: PublicKey };

export type ClientRepeaterControlsProps = { clients: Client[] };

// TODO(burdon): Reconcile with ClientProviderProps.
export type ClientRepeaterProps<P extends ClientRepeatedComponentProps> = {
  className?: string;
  component: FC<ClientRepeatedComponentProps>;
  controls?: FC<ClientRepeaterControlsProps>;
  count?: number;
  clients?: Client[];
  types?: TypedObject[];
  args?: Omit<P, 'id' | 'count'>;
} & Pick<WithClientProviderProps, 'createIdentity' | 'createSpace' | 'onCreateSpace'>;

/**
 * Utility component for Storybook stories which sets up clients for n peers.
 * The `Component` property is rendered n times, once for each peer.
 * @deprecated use `withClientProvider`.
 */
// TODO(burdon): To discuss: evolve ClientRepeater with optional decorator that uses it.
// NOTE: This is specifically not a storybook decorator because it broke stories as a decorator.
//   This seems primarily due to the fact that it required top-level await for the clients to initialize.
//   Storybook seemed to handle it alright, but Chromatic had a lot of trouble with it.
//   There was also a question of whether or not calling the story function multiple times was a good idea.
export const ClientRepeater = <P extends ClientRepeatedComponentProps>(props: ClientRepeaterProps<P>) => {
  const {
    component: Component,
    controls: Controls,
    count = 1,
    types,
    createIdentity,
    createSpace,
    onCreateSpace,
  } = props;
  useEffect(() => {
    registerSignalsRuntime();
  }, []);

  const [clients, setClients] = useState(props.clients ?? []);
  const [spaceKey, setSpaceKey] = useState<PublicKey>();

  const testBuilder = useRef(new TestBuilder());
  useAsyncEffect(async () => {
    const clients = [...Array(count)].map(
      (_) => new Client({ services: testBuilder.current.createLocalClientServices(), types }),
    );

    await Promise.all(clients.map((client) => client.initialize()));
    if (createIdentity || createSpace) {
      await Promise.all(clients.map((client) => client.halo.createIdentity()));
    }

    if (createSpace) {
      const client = clients[0];
      const space = await client.spaces.create({ name: faker.commerce.productName() });
      setSpaceKey(space.key);
      await onCreateSpace?.({ client, space }, {});
      await Promise.all(clients.slice(1).flatMap((client) => performInvitation({ host: space, guest: client.spaces })));
    }

    setClients(clients);
  }, []);

  if (clients.length === 0) {
    return null;
  }

  return (
    <>
      {Controls && <Controls clients={clients} />}
      {clients.map((client, index) => (
        <ClientProvider key={index} client={client}>
          <Component id={index} count={clients.length} spaceKey={spaceKey} {...{ ...props.args }} />
        </ClientProvider>
      ))}
    </>
  );
};
