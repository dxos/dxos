//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useGenerator } from '../../../src';
import Home from './Home';
import Main from './Main';

export const Primary = () => {
  const { party, generator, createParty, joinParty } = useGenerator();

  const handleCreate = async () => {
    await createParty({
      numOrgs: 4,
      numPeople: 16,
      numProjects: 6
    });
  };

  const handleJoin = async (invitationCode: string) => {
    await joinParty(invitationCode);
  };

  // TODO(burdon): Implement router.
  if (party && generator) {
    return (
      <Main party={party} generator={generator} />
    );
  }

  return (
    <Home onCreate={handleCreate} onJoin={handleJoin} />
  );
};

export default {
  title: 'Demos/Search',
  component: Primary
};
