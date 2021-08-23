//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { ClientInitializer, useClient, useProfile } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-framework';
import ProfileDialog from '../src/components/ProfileDialog';

/**
 * Create the user's HALO profile.
 */
export const Stage2 = () => {
  const App = () => {
    const client = useClient();
    const profile = useProfile();

    const handleCreateProfile = async ({ username }: { username: string }) => {
      if (username) {
        await client.halo.createProfile({ username });
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
  title: 'Tasks App/Stage 2',
  component: Stage2
};
