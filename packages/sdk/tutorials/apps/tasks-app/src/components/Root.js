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

  if (!profile) {
    const handleRegistration = async ({ username }) => {
      if (username) {
        await client.halo.createProfile({ username });
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
