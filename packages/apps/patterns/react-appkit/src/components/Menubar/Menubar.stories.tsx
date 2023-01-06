//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import type { StoryFn } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { InvitationEncoder, Space } from '@dxos/client';
import { ClientProvider, useClient, useIdentity } from '@dxos/react-client';
import { Group, Loading } from '@dxos/react-ui';
import { humanize } from '@dxos/util';

import { SingleInputStep } from '../SingleInputStep';
import { Menubar, MenubarProps } from './Menubar';

export default {
  component: Menubar,
  argTypes: {}
};

export const Default = {
  render: (args: Omit<MenubarProps, 'profile'>) => {
    const client = useClient();
    const profile = useIdentity();

    useEffect(() => {
      if (client && !profile) {
        void client.halo.createProfile();
      }
    }, [client, profile]);

    return (
      <main className='flex justify-end'>
        {profile ? <Menubar {...args} profile={profile} /> : <Loading label='Loading…' />}
      </main>
    );
  },
  decorators: [
    // TODO(wittjosiah): Factor out.
    (Story: StoryFn) => (
      <ClientProvider>
        <Story />
      </ClientProvider>
    )
  ]
};

// TODO(wittjosiah): Factor out.
const JoinPanel = () => {
  const client = useClient();
  const profile = useIdentity();
  const [invitationCode, setInvitationCode] = useState('');
  const [_pinCode, setPinCode] = useState('');
  const [showPin, setShowPin] = useState(false);

  const handleInvite = async () => {
    setShowPin(true);
    // TODO(burdon): Authenticate.
    client.halo.acceptInvitation(InvitationEncoder.decode(invitationCode));
    // const secret = await secretProvider();
    // await acceptedInvitation.authenticate(secret);
  };

  const handlePin = () => {};

  if (profile) {
    return <>{humanize(profile.identityKey)}</>;
  }

  if (showPin) {
    return (
      <SingleInputStep inputLabel='Pin' onChange={setPinCode} onNext={handlePin} onBack={() => setShowPin(false)} />
    );
  }

  return <SingleInputStep inputLabel='Invitation' onChange={setInvitationCode} onNext={handleInvite} />;
};

export const Sharing = {
  render: () => {
    return (
      <>
        <ClientProvider>
          <Default.render />
        </ClientProvider>
        <ClientProvider>
          <Group label={{ children: 'Joiner' }} className='w-1/2'>
            <JoinPanel />
          </Group>
        </ClientProvider>
      </>
    );
  }
};

export const WithinSpace = {
  render: () => {
    const client = useClient();
    const [space, setSpace] = useState<Space>();

    useEffect(() => {
      console.log('[client change]', space);
      if (client && !space) {
        console.log('[creating space]', space);
        void client.echo
          .createSpace()
          .then((space: Space) => {
            console.log('[setting space]', space);
            setSpace(space);
          })
          .catch((err) => console.log('[error creating space]', err))
          .finally(() => console.log('[done creating space]'));
      }
    }, [client]);

    return space ? <Default.render space={space} /> : <Loading label='Creating space…' />;
  },
  decorators: [
    // TODO(wittjosiah): Factor out.
    // TODO(willshown): This story doesn’t work with the test config. Why?
    (Story: StoryFn) => (
      <ClientProvider>
        <Story />
      </ClientProvider>
    )
  ]
};
