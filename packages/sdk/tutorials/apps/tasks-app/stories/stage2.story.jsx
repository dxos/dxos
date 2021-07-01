//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { createKeyPair } from '@dxos/crypto';
import { ClientInitializer, useClient, useProfile } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-ux';
import ProfileDialog from '../src/components/ProfileDialog';

/**
 * Create the user's HALO profile.
 */
export const Stage2 = () => {
  const App = () => {
    const client = useClient();
    const profile = useProfile();

    const handleCreateProfile = async ({ username }) => {
      if (username) {
        // TODO(burdon): Default keyPair?
        const { publicKey, secretKey } = createKeyPair();
        await client.createProfile({ publicKey, secretKey, username });
      }
    };

    return (
      <>
        <ProfileDialog open={!profile} onClose={handleCreateProfile} />
        <JsonTreeView data={profile} />
      </>
    );
  };

  return (
    <ClientInitializer>
      <App />
    </ClientInitializer>
  );
};

export default {
  title: 'Tutorials/Stage 2',
  component: Stage2
};
