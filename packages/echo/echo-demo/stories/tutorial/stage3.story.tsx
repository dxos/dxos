//
// Copyright 2021 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { Box, Button, Grid, Toolbar } from '@material-ui/core';

import { createKeyPair } from '@dxos/crypto';
import { ClientInitializer, useClient, useParties, useProfile } from '@dxos/react-client';

import { PartyCard } from '../../src';

export default {
  title: 'Tutorials/Stage 3'
};

/**
 * Create the user's HALO profile, then create parties with items.
 */
export const Stage3 = () => {
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

    return (
      <>
        <Toolbar>
          <Button variant='contained' disabled={!!profile} onClick={handleCreateProfile}>Create HALO</Button>
          <Button disabled={!profile} onClick={handleCreateParty}>Create Party</Button>
        </Toolbar>
        <Box m={2}>
          <Grid container direction='row' spacing={2}>
            {parties.map((party: any) => (
              <Grid item key={party.key.toString()}>
                <PartyCard party={party} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </>
    );
  };

  return (
    <ClientInitializer>
      <App />
    </ClientInitializer>
  );
};
