//
// Copyright 2020 DXOS.org
//

import * as faker from 'faker';
import React from 'react';

import { Box, Button, Grid, Toolbar } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import { createKeyPair } from '@dxos/crypto';
import { ClientInitializer, useClient, useParties, useProfile } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-ux';

import { PartyCard } from '../../src';

faker.seed(0);

export default {
  title: 'Components/ClientInitializer',
  component: ClientInitializer
};

const useStyles = makeStyles(theme => ({
  root: {
    margin: theme.spacing(2)
  }
}));

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
    const party = await client.createParty();
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
  const config = {
    storage: {
      persistent: true
    },
    snapshots: true,
    snapshotInterval: 10
  };

  return (
    <ClientInitializer config={async () => config}>
      <Demo />
    </ClientInitializer>
  );
};
