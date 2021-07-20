//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Button, Toolbar } from '@material-ui/core';
import { createKeyPair } from '@dxos/crypto';
import { Party } from '@dxos/echo-db';
import { ClientInitializer, useClient, useParties, useProfile } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-ux';
import PartySettings from '../src/components/PartySettings';
import ProfileDialog from '../src/components/ProfileDialog';
import { getPartyTitle } from '../src/utils/hacks.utils';

/**
 * Create the user's HALO profile, then create parties.
 */
export const Stage3 = () => {
  const App = () => {
    const client = useClient();
    const profile = useProfile();
    const parties = useParties();
    const [settingsDialog, setSettingsDialog] = useState(false);

    const handleCreateProfile = async ({ username }: { username: string }) => {
      if (username) {
        const { publicKey, secretKey } = createKeyPair();
        await client.halo.createProfile({ publicKey, secretKey, username });
      }
    };

    if (!profile) {
      return (
        <ProfileDialog open={!profile} onClose={handleCreateProfile} />
      );
    }

    const partyData = parties.map((party: Party) => ({
      key: party.key.toString(),
      title: getPartyTitle(party)
    }));

    return (
      <>
        <Toolbar>
          <Button disabled={!profile} onClick={() => setSettingsDialog(true)}>
            Create Party
          </Button>
        </Toolbar>
        <JsonTreeView data={partyData} />
        {settingsDialog && <PartySettings onClose={() => setSettingsDialog(false)} />}
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
  title: 'Tasks App/Stage 3',
  component: Stage3
};
