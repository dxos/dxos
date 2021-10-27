//
// Copyright 2020 DXOS.org
//

import { Box, Button, createTheme, Grid, Toolbar } from '@mui/material';
import { makeStyles } from '@mui/styles';
import * as faker from 'faker';
import React from 'react';

import { createKeyPair } from '@dxos/crypto';
import { ClientInitializer, useClient, useParties, useProfile } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-framework';

import { PartyCard } from '../../src';
import { ConfigObject } from '@dxos/config';

faker.seed(0);

export default {
  title: 'Components/ClientInitializer',
  component: ClientInitializer
};

const useStyles = makeStyles(theme => ({
  root: {
    margin: theme.spacing(2)
  }
}), { defaultTheme: createTheme({}) });

const Demo = () => {
  const classes = useStyles();
  const client = useClient();
  const profile = useProfile();
  const parties = useParties();

  const handleCreateProfile = async () => {
    await client.halo.createProfile({
      ...createKeyPair(),
      username: faker.internet.userName()
    });
  };

  const handleCreateParty = async () => {
    const party = await client.echo.createParty();
    await party.setTitle(faker.company.companyName());
  };

  // TODO(burdon): Contains a property called config!
  console.log(client.config);

  return (
    <Box className={classes.root}>
      <Toolbar variant='dense' disableGutters={true}>
        <Button variant='contained' disabled={!!profile} onClick={handleCreateProfile}>Create profile</Button>
        <Button disabled={!profile} onClick={handleCreateParty}>Create party</Button>
      </Toolbar>
      <Box m={2}>
        <JsonTreeView data={client.config} />
      </Box>
      <Box m={2}>
        <JsonTreeView data={{ profile }} />
      </Box>
      <Grid container direction='row' spacing={2}>
        {parties.map((party: any) => (
          <Grid item key={party.key.toString()}>
            <PartyCard party={party} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

/**
 * In-memory HALO.
 */
export const Memory = () => {
  return (
    <ClientInitializer>
      <Demo />
    </ClientInitializer>
  );
};

/**
 * Browser storage HALO.
 */
export const Persistent = () => {
  const config: ConfigObject = {
    system: {
      storage: {
        persistent: true
      },
      enableSnapshots: true,
      snapshotInterval: 10
    }
  };

  return (
    <ClientInitializer config={async () => config}>
      <Demo />
    </ClientInitializer>
  );
};
