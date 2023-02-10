//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import type { StoryFn } from '@storybook/react';
import React, { useEffect, useMemo, useState } from 'react';

import { Trigger } from '@dxos/async';
import { Client, Invitation, PublicKey, TextObject } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { raise } from '@dxos/debug';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider, useQuery, useSpace } from '@dxos/react-client';
import { Loading, mx } from '@dxos/react-components';

import { Document } from '../../testing';
import { Composer, ComposerProps } from './Composer';

// TODO(wittjosiah): @dxos/log.
const log = console.log;

export default {
  component: Composer,
  argTypes: {}
};

export const Default = {
  render: ({ spaceKey, id, ...args }: Omit<ComposerProps, 'item'> & { spaceKey?: PublicKey; id?: number }) => {
    const space = useSpace(spaceKey);
    const [document] = useQuery(space, Document.filter());

    useEffect(() => {
      id === 0 && space?.experimental.db.save(new Document({ content: new TextObject() }));
    }, [space]);

    return (
      <main className='grow pli-7 mbs-7'>
        {document && space ? (
          <Composer
            {...args}
            document={document.content}
            slots={{
              editor: {
                className: mx(
                  'z-0 rounded bg-white text-neutral-900 w-full p-4 dark:bg-neutral-850 dark:text-white min-bs-[12em]',
                  args.slots?.editor?.className
                )
              }
            }}
          />
        ) : (
          <Loading label='Loading document…' />
        )}
      </main>
    );
  },
  decorators: [
    // TODO(wittjosiah): Factor out.
    (Story: StoryFn) => {
      const n = 2;
      const clients = useMemo(() => {
        const testBuilder = new TestBuilder();
        return [...Array(n)].map(() => new Client({ services: testBuilder.createClientServicesHost() }));
      }, []);

      const [spaceKey, setSpaceKey] = useState<PublicKey>();

      useAsyncEffect(async () => {
        await Promise.all(clients.map((client) => client.initialize()));
        log('initialized');

        await Promise.all(clients.map((client) => client.halo.createProfile()));
        log('identity created');

        const space = await clients[0].echo.createSpace();
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

        return () => {
          void Promise.all(clients.map((client) => client.destroy()));
        };
      }, clients);

      if (!spaceKey) {
        return <Loading label='Loading…' />;
      }

      return (
        <div className='flex is-full'>
          {clients.map((client, index) => (
            <ClientProvider key={index} client={client} fallback={() => <Loading label='Loading client…' />}>
              <Story args={{ spaceKey, id: index }} />
            </ClientProvider>
          ))}
        </div>
      );
    }
  ]
};
