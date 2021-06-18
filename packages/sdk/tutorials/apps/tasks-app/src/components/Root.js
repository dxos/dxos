//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { createKeyPair } from '@dxos/crypto';
import { useClient, useProfile } from '@dxos/react-client';

import Main from './Main';
import ProfileDialog from './ProfileDialog';

/**
 * Main component.
 */
const Root = () => {
  const client = useClient();
  const profile = useProfile();

  if (!profile) {
    const handleRegistration = async ({ username }) => {
      if (username) {
        const { publicKey, secretKey } = createKeyPair();
        // TODO(burdon): Return profile object.
        // ISSUE(rzadp): https://github.com/dxos/sdk/pull/318
        await client.createProfile({ publicKey, secretKey, username });
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
