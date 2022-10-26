//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { useEffect, useState } from 'react';

import { ClientProvider, useClient } from '@dxos/react-client';
import { Loading, Main } from '@dxos/react-ui';

import { templateForComponent } from '../../testing';
import { Presence, PresenceProps } from './Presence';

export default {
  title: 'react-uikit/Presence',
  component: Presence,
  argTypes: {}
};

const Template = (args: Omit<PresenceProps, 'profile'>) => {
  const client = useClient();
  const [profile, setProfile] = useState(() => client.halo.profile);

  useEffect(
    () => client.halo.subscribeToProfile(() => setProfile(client.halo.profile)),
    [client]
  );

  useEffect(() => {
    if (client && !profile) {
      void client.halo.createProfile();
    }
  }, [client, profile]);

  return (
    <Main className='flex justify-end'>
      {profile ? (
        <Presence {...args} profile={profile} />
      ) : (
        <Loading label='Loading…' />
      )}
    </Main>
  );
};

export const Default = templateForComponent(Template)({});
Default.args = {};
Default.decorators = [
  // TODO(wittjosiah): Factor out.
  (Story) => (
    <ClientProvider>
      <Story />
    </ClientProvider>
  )
];
