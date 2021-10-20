//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useClient, useProfile } from '@dxos/react-client';
import { ProfileDialog } from '@dxos/react-framework';

import Main from './Main';

/**
 * Root component.
 */
const Root = () => {
  const client = useClient();
  const profile = useProfile();
  // TODO(zarco): add a get parameter to trigger the first party so we avoid triggering all the time.
  // const createFirstParty = async () => {
  //   // Default Party Creation
  //   const partyDemoTitle = 'My First Party!';
  //   const party = await client.echo.createParty({ title: partyDemoTitle });
  //   await party.setProperty('title', partyDemoTitle);
  // };

  if (!profile) {
    const handleRegistration = async ({ username }) => {
      if (username) {
        await client.halo.createProfile({ username });
        // TODO(zarco): add a get parameter to trigger the first party so we avoid triggering all the time.
        // createFirstParty();
      }
    };

    return (
      <ProfileDialog open={!profile} onCreate={handleRegistration} />
    );
  }

  return (
    <Main />
  );
};

export default Root;
