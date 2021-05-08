//
// Copyright 2021 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { Button, Toolbar } from '@material-ui/core';

import { createKeyPair } from '@dxos/crypto';
import { ClientInitializer, useClient, useProfile } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-ux';

/**
 * Create the user's HALO profile.
 */
export const Stage1 = () => {
  const App = () => {
    const client = useClient();
    const profile = useProfile();

    const handleCreateProfile = async () => {
      // TODO(burdon): Default keyPair?
      await client.createProfile({ ...createKeyPair(), username: faker.name.firstName() });
    };

    return (
      <>
        <Toolbar>
          <Button variant='contained' disabled={!!profile} onClick={handleCreateProfile}>Create HALO</Button>
        </Toolbar>
        <JsonTreeView data={profile} />
      </>
    );
  };

  // TODO(burdon): Must not hide ClientInitializer in tutorial (magic).
  return (
    <ClientInitializer>
      <App />
    </ClientInitializer>
  );
};

export default {
  title: 'Tutorials/Stage 1',
  component: Stage1
};
