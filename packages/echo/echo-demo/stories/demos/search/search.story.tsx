//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { InvitationDescriptor, Party } from '@dxos/echo-db';
import { Generator } from '@dxos/echo-testing';

import { createOnlineInstance } from '../../../src';
import Home from './Home';
import Main from './Main';

export const Primary = () => {
  const [party, setParty] = useState<Party>();

  const handleCreateParty = async () => {
    const echo = await createOnlineInstance(); // TODO(burdon): Clean-up API.
    const party = await echo.createParty();

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
    const echo = await createOnlineInstance();
    const party = await echo.joinParty(
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

export default {
  title: 'Demos/Search',
  component: Primary
};
