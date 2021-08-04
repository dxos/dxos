//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useClient, useProfile } from '@dxos/react-client';

import Main from './Main';
import ProfileDialog from './ProfileDialog';

/**
 * Root component.
 */
const Root = () => {
  const client = useClient();
  const profile = useProfile();
  
  const createFirstParty = async () => {
    // Default Party Creation
    const partyDemoTitle = 'My First Party!';
    const party = await client.echo.createParty({ title: partyDemoTitle });
    await party.setProperty('title', partyDemoTitle);
  };

  if (!profile) {
    const handleRegistration = async ({ username }) => {
      if (username) {
        await client.halo.createProfile({ username });
        // TODO(zarco): add a get parameter to trigger the first party so we avoid triggering all the time.
        // createFirstParty();
      }
    };

    return (
      <ProfileDialog open={!profile} onClose={handleRegistration} />
    );
  }

  return (
    <Main />
  );
};

export default Root;
