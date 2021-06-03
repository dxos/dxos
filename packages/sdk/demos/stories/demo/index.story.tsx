//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { InvitationDescriptor, Party } from '@dxos/echo-db';
import { Generator } from '@dxos/echo-testing';
import { useClient, ClientInitializer, ProfileInitializer } from '@dxos/react-client';

import { ONLINE_CONFIG } from '../../src';
import Main from './Main';
import StartDialog from './StartDialog';

const code = '0000';

const Root = () => {
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
      InvitationDescriptor.fromQueryParameters(JSON.parse(invitationCode)), async () => Buffer.from(code)
    );

    await party.open();
    setParty(party);
  };

  if (party) {
    return (
      <Main party={party} code={code} />
    );
  }

  return (
    <StartDialog onCreate={handleCreateParty} onJoin={handleJoinParty} />
  );
};

export const Primary = () => (
  <ClientInitializer config={ONLINE_CONFIG}>
    <ProfileInitializer>
      <Root />
    </ProfileInitializer>
  </ClientInitializer>
);

export default {
  title: 'Demo',
  component: Primary
};
