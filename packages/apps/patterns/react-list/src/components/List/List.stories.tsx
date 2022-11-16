//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { useMemo, useState } from 'react';

import { Trigger } from '@dxos/async';
import { Client, Invitation, PublicKey, TestClientBuilder } from '@dxos/client';
import { raise } from '@dxos/debug';
import { ObjectModel } from '@dxos/object-model';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider, useSelection, useSpace } from '@dxos/react-client';
import { Loading } from '@dxos/react-uikit';

import { LIST_TYPE } from '../../model';
import { templateForComponent } from '../../testing';
import { List, ListProps } from './List';

// TODO(wittjosiah): @dxos/log.
const log = console.log;

export default {
  title: 'react-list/List',
  component: List,
  argTypes: {}
};

const Template = (args: Omit<ListProps, 'item'> & { spaceKey?: PublicKey; id?: number }) => {
  const space = useSpace(args.spaceKey);
  const [item] = useSelection(space?.database.select({ type: LIST_TYPE })) ?? [];

  useAsyncEffect(async () => {
    if (args.id === 0) {
      await space?.database.createItem({
        model: ObjectModel,
        type: LIST_TYPE
      });
    }
  }, [space]);

  return <main>{item ? <List {...args} item={item} /> : <Loading label='Loading…' />}</main>;
};

export const Default = templateForComponent(Template)({});
Default.args = {};
Default.decorators = [
  // TODO(wittjosiah): Factor out.
  // TODO(wittjosiah): N clients.
  (Story) => {
    const [client1, client2] = useMemo(() => {
      const testBuilder = new TestClientBuilder();
      return [
        new Client({ services: testBuilder.createClientServicesHost() }),
        new Client({ services: testBuilder.createClientServicesHost() })
      ];
    }, []);
    const [spaceKey, setSpaceKey] = useState<PublicKey>();

    useAsyncEffect(async () => {
      await client1.initialize();
      await client2.initialize();
      log('initialized');

      await client1.halo.createProfile();
      await client2.halo.createProfile();
      log('identity created');

      const success1 = new Trigger<Invitation>();
      const success2 = new Trigger<Invitation>();

      const space = await client1.echo.createSpace();
      log('space created');
      const observable1 = await space.createInvitation({ type: Invitation.Type.INTERACTIVE_TESTING });
      log('invitation created');
      const observable2 = await client2.echo.acceptInvitation(observable1.invitation!);
      log('invitation accepted');

      observable1.subscribe({
        onSuccess: (invitation) => {
          success1.wake(invitation);
          log('invitation success1');
        },
        onError: (err) => raise(err)
      });

      observable2.subscribe({
        onSuccess: (invitation: Invitation) => {
          success2.wake(invitation);
          log('invitation success2');
        },
        onError: (err: Error) => raise(err)
      });

      await Promise.all([success1.wait(), success2.wait()]);
      setSpaceKey(space.key);

      return () => {
        void client1.destroy();
        void client2.destroy();
      };
    }, [client1, client2]);

    if (!spaceKey) {
      return <Loading label='Loading…' />;
    }

    return (
      <div className='flex'>
        <ClientProvider client={client1} fallback={<Loading label='Loading…' />}>
          <Story args={{ spaceKey, id: 0 }} />
        </ClientProvider>
        <ClientProvider client={client2} fallback={<Loading label='Loading…' />}>
          <Story args={{ spaceKey, id: 1 }} />
        </ClientProvider>
      </div>
    );
  }
];
