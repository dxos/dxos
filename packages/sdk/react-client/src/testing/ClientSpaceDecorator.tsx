//
// Copyright 2022 DXOS.org
//

import { faker } from '@faker-js/faker';
import { DecoratorFunction } from '@storybook/csf';
import { ReactRenderer } from '@storybook/react';
import React, { useMemo, useState } from 'react';

import { Trigger } from '@dxos/async';
import { Client, EchoSchema, Invitation, PublicKey } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { raise } from '@dxos/debug';
import { log } from '@dxos/log';
import { useAsyncEffect } from '@dxos/react-async';
import { Loading } from '@dxos/react-components';

import { ClientProvider } from '../client';

export type ClientSpaceDecoratorOptions = {
  schema?: EchoSchema;
  count?: number;
};

let init = false;

/**
 * Storybook decorator to setup identity for n peers and join them into a single space.
 * The story is rendered n times, once for each peer and the space is passed to the story as an arg.
 *
 * @param {number} count Number of peers to join.
 * @returns {DecoratorFunction}
 */
// TODO(wittjosiah): Factor out setup to hook.
export const ClientSpaceDecorator =
  ({ schema, count = 1 }: ClientSpaceDecoratorOptions = {}): DecoratorFunction<ReactRenderer, any> =>
  (Story, context) => {
    const clients = useMemo(() => {
      const testBuilder = new TestBuilder();
      return [...Array(count)].map(() => new Client({ services: testBuilder.createClientServicesHost() }));
    }, [count]);

    const [spaceKey, setSpaceKey] = useState<PublicKey>();

    // TODO(wittjosiah): Remove useEffect?
    useAsyncEffect(async () => {
      if (init) {
        return;
      }
      init = true;
      await Promise.all(clients.map((client) => client.initialize()));
      log('initialized');

      if (schema) {
        clients.forEach((client) => client.echo.addSchema(schema));
        log('echo schema set');
      }

      await Promise.all(
        clients.map(
          (client) => client.halo.identity ?? client.halo.createIdentity({ displayName: faker.name.firstName() })
        )
      );
      log('identity created');

      const space = await clients[0].echo.createSpace({ name: faker.animal.bird() });
      log('space created', { space: space.key });

      await Promise.all(
        clients.slice(1).map(async (client) => {
          const success1 = new Trigger<Invitation>();
          const success2 = new Trigger<Invitation>();

          const observable1 = space.createInvitation({ type: Invitation.Type.INTERACTIVE_TESTING });
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
        })
      );

      setSpaceKey(space.key);
    }, [clients, schema]);

    if (!spaceKey) {
      return <Loading label='Loading…' />;
    }

    return (
      <div className='flex' style={{ display: 'flex' }}>
        {clients.map((client, index) => (
          <ClientProvider key={index} client={client} fallback={() => <Loading label='Loading…' />}>
            <Story args={{ spaceKey, id: index, ...context.args }} />
          </ClientProvider>
        ))}
      </div>
    );
  };
