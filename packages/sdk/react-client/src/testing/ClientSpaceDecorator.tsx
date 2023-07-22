//
// Copyright 2022 DXOS.org
//

import { faker } from '@faker-js/faker';
import { DecoratorFunction } from '@storybook/csf';
import { ReactRenderer } from '@storybook/react';
import React, { PropsWithChildren, ReactNode, useState } from 'react';

import { Client, PublicKey } from '@dxos/client';
import { EchoSchema, SpaceProxy, Space } from '@dxos/client/echo';
import { performInvitation, TestBuilder } from '@dxos/client/testing';
import { MaybePromise } from '@dxos/util';

import { ClientProvider } from '../client';

const testBuilder = new TestBuilder();
const services = () => testBuilder.createLocal();

// TODO(wittjosiah): Generates warning `No peers to notarize with` during invitation, but retry succeeds.
const ChildClient = ({ rootSpace, schema, children }: PropsWithChildren<{ rootSpace: Space; schema?: EchoSchema }>) => {
  return (
    <ClientProvider
      fallback={() => <p>Loading</p>}
      services={services}
      onInitialized={async (client) => {
        await client.halo.createIdentity({ displayName: faker.name.firstName() });
        schema && client.addSchema(schema);
        await performInvitation({ host: rootSpace as SpaceProxy, guest: client });
      }}
    >
      {children}
    </ClientProvider>
  );
};

export type PeersInSpaceProps = {
  count?: number;
  schema?: EchoSchema;
  onCreateSpace?: (space: Space) => MaybePromise<void>;
  children: (id: number, spaceKey: PublicKey) => ReactNode;
};

/**
 * Sets up identity for n peers and join them into a single space.
 * Child is function which recieves an id and a space key.
 * The child is rendered n times, once for each peer.
 */
export const PeersInSpace = ({ count = 1, schema, onCreateSpace, children }: PeersInSpaceProps) => {
  const [space, setSpace] = useState<Space>();

  return (
    <div className='flex' style={{ display: 'flex' }}>
      <ClientProvider
        fallback={() => <p>Loading</p>}
        services={services}
        onInitialized={async (client) => {
          await client.halo.createIdentity({ displayName: faker.name.firstName() });
          schema && client.addSchema(schema);
          const space = await client.createSpace({ name: faker.animal.bird() });
          await onCreateSpace?.(space);
          setSpace(space);
        }}
      >
        {space && children(0, space.key)}
      </ClientProvider>

      {space &&
        [...Array(count - 1)].map((_, index) => (
          <ChildClient key={index} rootSpace={space} schema={schema}>
            {children(index + 1, space.key)}
          </ChildClient>
        ))}
    </div>
  );
};

// TODO(wittjosiah): This isn't working with latest storybook.
//   https://github.com/storybookjs/storybook/issues/15223
/**
 * Storybook decorator to setup identity for n peers and join them into a single space.
 * The story is rendered n times, once for each peer and the space is passed to the story as an arg.
 */
// prettier-ignore
export const ClientSpaceDecorator =
  (options: Omit<PeersInSpaceProps, 'children'> = {}): DecoratorFunction<ReactRenderer, any> => {
    return (Story, context) => (
      <PeersInSpace {...options}>
        {(id, spaceKey) => <Story args={{ spaceKey, id, ...context.args }} />}
      </PeersInSpace>
    );
  };

export const setupPeersInSpace = async (options: Omit<PeersInSpaceProps, 'children'> = {}) => {
  const { count = 1, schema, onCreateSpace } = options;
  const clients = [...Array(count)].map((_) => new Client({ services: testBuilder.createLocal() }));
  await Promise.all(clients.map((client) => client.initialize()));
  await Promise.all(clients.map((client) => client.halo.createIdentity({ displayName: faker.name.firstName() })));
  schema && clients.map((client) => client.addSchema(schema));
  const space = await clients[0].createSpace({ name: faker.animal.bird() });
  await onCreateSpace?.(space);
  await Promise.all(clients.slice(1).map((client) => performInvitation({ host: space as SpaceProxy, guest: client })));

  return { spaceKey: space.key, clients };
};
