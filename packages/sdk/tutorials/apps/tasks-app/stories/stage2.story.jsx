//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Button, Toolbar } from '@material-ui/core';
import { createKeyPair } from '@dxos/crypto';
import { ClientInitializer, useClient, useParties, useProfile } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-ux';
import PartySettings from '../src/components/PartySettings';
import ProfileDialog from '../src/components/ProfileDialog';

/**
 * Create the user's HALO profile, then create parties.
 */
export const Stage2 = () => {
  const App = () => {
    const client = useClient();
    const profile = useProfile();
    const parties = useParties();
    const [settingsDialog, setSettingsDialog] = useState(false);

    const handleCreateProfile = async ({ username }) => {
      if (username) {
        const { publicKey, secretKey } = createKeyPair();
        await client.createProfile({ publicKey, secretKey, username });
      }
    };

    if (!profile) {
      return (
        <ProfileDialog open={!profile} onClose={handleCreateProfile} />
      )
    }

    // TODO(burdon): party.title isn't visible until the next party is created.
    if (settingsDialog) {
      return (
        <PartySettings partyKey={undefined} onClose={() => setSettingsDialog(false)} />
      )
    }

    return (
      <>
        <Toolbar>
          <Button disabled={!profile} onClick={() => setSettingsDialog(true)}>
            Create Party
          </Button>
        </Toolbar>
        <JsonTreeView
          data={parties.map((party) => ({key: party.key.toString(), title: party.title}))}
        />
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
