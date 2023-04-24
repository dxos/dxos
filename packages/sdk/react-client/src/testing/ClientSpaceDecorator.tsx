//
// Copyright 2022 DXOS.org
//

import { faker } from '@faker-js/faker';
import { DecoratorFunction } from '@storybook/csf';
import { ReactRenderer } from '@storybook/react';
import React, { PropsWithChildren, ReactNode, useState } from 'react';

import { Trigger } from '@dxos/async';
import { EchoSchema, Invitation, PublicKey, Space } from '@dxos/client';
import { TestBuilder } from '@dxos/client-services/testing';
import { raise } from '@dxos/debug';
import { log } from '@dxos/log';
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

        const hostDone = new Trigger<Invitation>();
        const guestDone = new Trigger<Invitation>();

        const hostObservable = rootSpace.createInvitation({ authMethod: Invitation.AuthMethod.NONE });
        log('invitation created');
        hostObservable.subscribe(
          (hostInvitation) => {
            switch (hostInvitation.state) {
              case Invitation.State.CONNECTING: {
                const guestObservable = client.acceptInvitation(hostInvitation);
                log('invitation accepted');

                guestObservable.subscribe(
                  (guestInvitation) => {
                    switch (guestInvitation.state) {
                      case Invitation.State.SUCCESS: {
                        guestDone.wake(guestInvitation);
                        log('invitation guestDone');
                        break;
                      }
                    }
                  },
                  (err) => raise(err)
                );
                break;
              }

              case Invitation.State.SUCCESS: {
                hostDone.wake(hostInvitation);
                log('invitation hostDone');
              }
            }
          },
          (err) => raise(err)
        );

        await Promise.all([hostDone.wait(), guestDone.wait()]);
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
