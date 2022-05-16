//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { useClient, useProfile } from '@dxos/react-client';
import { JoinHaloDialog, ProfileDialog } from '@dxos/react-toolkit';

import { Main } from './Main';

/**
 * Root component.
 */
export const Root = () => {
  const client = useClient();
  const profile = useProfile();
  const [joiningHalo, setJoiningHalo] = useState(false);
  // TODO(zarco): add a get parameter to trigger the first party so we avoid triggering all the time.
  // const createFirstParty = async () => {
  //   // Default Party Creation
  //   const partyDemoTitle = 'My First Party!';
  //   const party = await client.echo.createParty({ title: partyDemoTitle });
  //   await party.setProperty('name', partyDemoTitle);
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
      <>
        <ProfileDialog
          open={!joiningHalo}
          onJoinHalo={() => setJoiningHalo(true)}
          onCreate={handleRegistration}
        />
        <JoinHaloDialog open={joiningHalo} />
      </>
    );
  }

  return (
    <Main />
  );
};
