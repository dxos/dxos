//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { useEffect, useState } from 'react';

import { defaultConfig, invitationObserver, InvitationEncoder, Party } from '@dxos/client';
import { ClientProvider, useClient, useProfile, useSecretProvider } from '@dxos/react-client';
import { Group, Loading } from '@dxos/react-ui';
import { humanize } from '@dxos/util';

import { templateForComponent } from '../../testing';
import { SingleInputStep } from '../SingleInputStep';
import { Presence, PresenceProps } from './Presence';

const textEncoder = new TextEncoder();

export default {
  title: 'react-uikit/Presence',
  component: Presence,
  argTypes: {}
};

const Template = (args: Omit<PresenceProps, 'profile'>) => {
  const client = useClient();
  const [profile, setProfile] = useState(() => client.halo.profile);

  useEffect(() => client.halo.subscribeToProfile(() => setProfile(client.halo.profile)), [client]);
  useEffect(() => {
    if (client && !profile) {
      void client.halo.createProfile();
    }
  }, [client, profile]);

  return (
    <main className='flex justify-end'>
      {profile ? <Presence {...args} profile={profile} /> : <Loading label='Loading…' />}
    </main>
  );
};

export const Default = templateForComponent(Template)({});
Default.args = {};
Default.decorators = [
  // TODO(wittjosiah): Factor out.
  (Story) => (
    <ClientProvider config={defaultConfig}>
      <Story />
    </ClientProvider>
  )
];

const SharingTemplate = () => {
  return (
    <>
      <ClientProvider config={defaultConfig}>
        <Template />
      </ClientProvider>
      <ClientProvider config={defaultConfig}>
        <Group label={{ children: 'Joiner' }} className='w-1/2'>
          <JoinPanel />
        </Group>
      </ClientProvider>
    </>
  );
};

// TODO(wittjosiah): Factor out.
const JoinPanel = () => {
  const client = useClient();
  const profile = useProfile();
  const [_secretProvider, secretResolver, _resetSecret] = useSecretProvider<Uint8Array>();
  const [invitationCode, setInvitationCode] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [showPin, setShowPin] = useState(false);

  const handleInvite = async () => {
    setShowPin(true);
    // TODO(burdon): Authenticate.
    const observable = client.halo.acceptInvitation(InvitationEncoder.decode(invitationCode));
    await invitationObserver(observable);
    // const secret = await secretProvider();
    // await acceptedInvitation.authenticate(secret);
  };

  const handlePin = () => {
    secretResolver(textEncoder.encode(pinCode));
  };

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

export const Sharing = templateForComponent(SharingTemplate)({});
Sharing.args = {};

const WithinSpaceTemplate = () => {
  const client = useClient();
  const [space, setSpace] = useState<Party>();

  useEffect(() => {
    console.log('[client change]', space);
    if (client && !space) {
      console.log('[creating space]', space);
      void client.echo
        .createParty()
        .then((space: Party) => {
          console.log('[setting space]', space);
          setSpace(space);
        })
        .catch((err) => console.log('[error creating space]', err))
        .finally(() => console.log('[done creating space]'));
    }
  }, [client]);

  return space ? <Template space={space} /> : <Loading label='Creating space…' />;
};

export const WithinSpace = templateForComponent(WithinSpaceTemplate)({});
WithinSpace.args = {};
WithinSpace.decorators = [
  // TODO(wittjosiah): Factor out.
  // TODO(willshown): This story doesn’t work with the test config. Why?
  (Story) => (
    <ClientProvider>
      <Story />
    </ClientProvider>
  )
];
