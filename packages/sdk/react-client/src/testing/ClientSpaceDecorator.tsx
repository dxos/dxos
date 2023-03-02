//
// Copyright 2022 DXOS.org
//

import { faker } from '@faker-js/faker';
import { DecoratorFunction } from '@storybook/csf';
import { ReactRenderer } from '@storybook/react';
import React, { PropsWithChildren, useState } from 'react';

import { Trigger } from '@dxos/async';
import { EchoSchema, Invitation, Space } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { raise } from '@dxos/debug';
import { log } from '@dxos/log';
import { Loading } from '@dxos/react-components';

import { ClientProvider } from '../client';

const testBuilder = new TestBuilder();
const services = () => testBuilder.createClientServicesHost();

const ChildClient = ({ rootSpace, schema, children }: PropsWithChildren<{ rootSpace: Space; schema?: EchoSchema }>) => {
  return (
    <ClientProvider
      fallback={() => <Loading label='Loading…' />}
      services={services}
      onInitialized={async (client) => {
        await client.halo.createIdentity({ displayName: faker.name.firstName() });
        schema && client.echo.setSchema(schema);

        const success1 = new Trigger<Invitation>();
        const success2 = new Trigger<Invitation>();

        const observable1 = rootSpace.createInvitation({ type: Invitation.Type.INTERACTIVE_TESTING });
        log('invitation created');
        observable1.subscribe({
          onConnecting: (invitation) => {
            const observable2 = client.echo.acceptInvitation(invitation);
            log('invitation accepted');

            observable2.subscribe({
              onSuccess: (invitation: Invitation) => {
                success2.wake(invitation);
                log('invitation success2');
              },
              onError: (err: Error) => raise(err)
            });
          },
          onSuccess: (invitation) => {
            success1.wake(invitation);
            log('invitation success1');
          },
          onError: (err) => raise(err)
        });

        await Promise.all([success1.wait(), success2.wait()]);
      }}
    >
      {children}
    </ClientProvider>
  );
};

export type ClientSpaceDecoratorOptions = {
  schema?: EchoSchema;
  count?: number;
};

/**
 * Storybook decorator to setup identity for n peers and join them into a single space.
 * The story is rendered n times, once for each peer and the space is passed to the story as an arg.
 *
 * @param {number} count Number of peers to join.
 * @returns {DecoratorFunction}
 */
export const ClientSpaceDecorator =
  ({ schema, count = 1 }: ClientSpaceDecoratorOptions = {}): DecoratorFunction<ReactRenderer, any> =>
  (Story, context) => {
    // const [clients, setClients] = useState<Client[]>();

    // useEffect(() => {
    //   const timeout = setTimeout(async () => {
    //     const clients = [...Array(count)].map(() => new Client({ services: testBuilder.createClientServicesHost() }));
    //     await Promise.all(clients.map((client) => client.initialize()));
    //     log('initialized');

    //     setClients(clients);
    //   });

    //   return () => {
    //     clearTimeout(timeout);
    //   };
    // }, [count]);

    // if (!clients) {
    //   return <Loading label='Loading…' />;
    // }

    // return (
    //   <div className='flex' style={{ display: 'flex' }}>
    //     {clients.map((client, index) => (
    //       <ClientProvider key={index} client={client} fallback={() => <Loading label='Loading…' />}>
    //         <Story args={{ id: index, ...context.args }} />
    //       </ClientProvider>
    //     ))}
    //   </div>
    // );

    const [space, setSpace] = useState<Space>();

    return (
      <div className='flex' style={{ display: 'flex' }}>
        <ClientProvider
          fallback={() => <Loading label='Loading…' />}
          services={services}
          onInitialized={async (client) => {
            await client.halo.createIdentity({ displayName: faker.name.firstName() });
            schema && client.echo.setSchema(schema);
            const space = await client.echo.createSpace({ name: faker.animal.bird() });
            setSpace(space);
          }}
        >
          <Story args={{ spaceKey: space?.key, id: 0, ...context.args }} />
          {space &&
            [...Array(count - 1)].map((_, index) => (
              <ChildClient key={index} rootSpace={space} schema={schema}>
                <Story args={{ spaceKey: space?.key, id: index + 1, ...context.args }} />
              </ChildClient>
            ))}
        </ClientProvider>
      </div>
    );
  };
