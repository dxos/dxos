//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { ClientProvider, useClient, useProfile } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

import { ProfileDialog } from '../src';

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
        <ProfileDialog open={!profile} onCreate={handleCreateProfile} />
        <JsonTreeView data={profile} />
      </>
    );
  };

  return (
    <ClientProvider>
      <App />
    </ClientProvider>
  );
};

export default {
  title: 'tasks-app/Stage 2',
  component: Stage2
};
