//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { InvitationDescriptor, Party } from '@dxos/echo-db';
import { Generator } from '@dxos/echo-testing';
import { useClient, ClientInitializer, ProfileInitializer } from '@dxos/react-client';

import { ONLINE_CONFIG } from '../../../src';
import Home from './Home';
import Main from './Main';

const Story = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();

  const handleCreateParty = async () => {
    const party = await client.echo.createParty();

    // Generate test data.
    const generator = new Generator(party.database, { seed: 1 });
    await generator.generate({
      numOrgs: 4,
      numPeople: 16,
      numProjects: 6
    });

    setParty(party);
  };

  const handleJoinParty = async (invitationCode: string) => {
    const party = await client.echo.joinParty(
      InvitationDescriptor.fromQueryParameters(JSON.parse(invitationCode)), async () => Buffer.from('0000')
    );
    await party.open();
    setParty(party);
  };

  // TODO(burdon): Implement storybook router.
  if (party) {
    return (
      <Main party={party} />
    );
  }

  return (
    <Home onCreate={handleCreateParty} onJoin={handleJoinParty} />
  );
};

export const Primary = () => (
  <ClientInitializer config={ONLINE_CONFIG}>
    <ProfileInitializer>
      <Story />
    </ProfileInitializer>
  </ClientInitializer>
);

export default {
  title: 'Demos/Search',
  component: Primary
};
