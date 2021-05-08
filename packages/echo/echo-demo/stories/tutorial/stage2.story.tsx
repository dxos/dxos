//
// Copyright 2021 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { Button, List, ListItem, Toolbar } from '@material-ui/core';

import { createKeyPair } from '@dxos/crypto';
import { Party } from '@dxos/echo-db';
import { ClientInitializer, useClient, useParties, useProfile } from '@dxos/react-client';

export default {
  title: 'Tutorials/Stage 2'
};

/**
 * Create the user's HALO profile, then create parties.
 */
export const Stage2 = () => {
  const App = () => {
    const client = useClient();
    const profile = useProfile();
    const parties = useParties();

    const handleCreateProfile = async () => {
      await client.createProfile({ ...createKeyPair(), username: faker.name.firstName() });
    };

    // TODO(burdon): party.title isn't visible until the next party is created.
    const handleCreateParty = async () => {
      const party = await client.echo.createParty();
      await party.setTitle(faker.company.companyName());
    };

    // TODO(burdon): Filter out first item (party meta).
    return (
      <>
        <Toolbar>
          <Button variant='contained' disabled={!!profile} onClick={handleCreateProfile}>Create HALO</Button>
          <Button disabled={!profile} onClick={handleCreateParty}>Create Party</Button>
        </Toolbar>
        <List>
          {parties.map((party: Party) => (
            <ListItem key={party.key.toString()}>{party.title}</ListItem>
          ))}
        </List>
      </>
    );
  };

  return (
    <ClientInitializer>
      <App />
    </ClientInitializer>
  );
};
