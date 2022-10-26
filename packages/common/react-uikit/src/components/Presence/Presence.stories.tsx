//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { useEffect, useState } from 'react';

import {
  defaultTestingConfig,
  InvitationDescriptor,
  Party
} from '@dxos/client';
import {
  ClientProvider,
  useClient,
  useProfile,
  useSecretProvider
} from '@dxos/react-client';
import { Group, Loading, Main } from '@dxos/react-ui';
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
    <ClientProvider config={defaultTestingConfig}>
      <Story />
    </ClientProvider>
  )
];

const SharingTemplate = () => {
  return (
    <>
      <ClientProvider config={defaultTestingConfig}>
        <Template />
      </ClientProvider>
      <ClientProvider config={defaultTestingConfig}>
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
  const [secretProvider, secretResolver, _resetSecret] =
    useSecretProvider<Uint8Array>();
  const [invitationCode, setInvitationCode] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [showPin, setShowPin] = useState(false);

  const handleInvite = async () => {
    const invitation = InvitationDescriptor.decode(invitationCode);
    setShowPin(true);
    console.log({ invitation });
    const acceptedInvitation = await client.halo.acceptInvitation(invitation);
    console.log({ acceptedInvitation });
    const secret = await secretProvider();
    console.log({ secret });
    await acceptedInvitation.authenticate(secret);
    console.log('accepted');
  };

  const handlePin = () => {
    secretResolver(textEncoder.encode(pinCode));
  };

  if (profile) {
    return <>{humanize(profile.publicKey)}</>;
  }

  if (showPin) {
    return (
      <SingleInputStep
        inputLabel='Pin'
        onChange={setPinCode}
        onNext={handlePin}
        onBack={() => setShowPin(false)}
      />
    );
  }

  return (
    <SingleInputStep
      inputLabel='Invitation'
      onChange={setInvitationCode}
      onNext={handleInvite}
    />
  );
};

export const Sharing = templateForComponent(SharingTemplate)({});
Sharing.args = {};

const WithinSpaceTemplate = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();

  useEffect(() => {
    console.log('[client change]', party);
    if (client && !party) {
      console.log('[creating party]', party);
      void client.echo
        .createParty()
        .then((party: Party) => {
          console.log('[setting party]', party);
          setParty(party);
        })
        .catch((err) => console.log('[error creating party]', err))
        .finally(() => console.log('[done creating party]'));
    }
  }, [client]);

  return party ? (
    <Template party={party} />
  ) : (
    <Loading label='Creating space…' />
  );
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
