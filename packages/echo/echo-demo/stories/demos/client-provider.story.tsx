//
// Copyright 2020 DXOS.org
//

import * as faker from 'faker';
import React, { useState, useEffect } from 'react';

import { Box, Button, Grid, LinearProgress, Toolbar } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import { Client } from '@dxos/client';
import { createKeyPair } from '@dxos/crypto';
import { ClientProvider, useClient, useParties, useProfile } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-ux';

import { PartyCard } from '../../src';

export default {
  title: 'Demos/ClientProvider'
};

const useStyles = makeStyles(theme => ({
  root: {
    margin: theme.spacing(2)
  }
}));

const ClientConsumer = () => {
  const classes = useStyles();
  const client = useClient();
  const profile = useProfile();
  const parties = useParties();

  const handleCreateProfile = () => {
    client.createProfile({
      ...createKeyPair(),
      username: faker.internet.userName()
    });
  };

  const handleCreateParty = () => {
    client.createParty();
  };

  // TODO(burdon): Contains a property called config!
  console.log(client.config);

  return (
    <Box className={classes.root}>
      <Toolbar variant='dense' disableGutters={true}>
        {!profile && (
          <Button onClick={handleCreateProfile}>Create profile</Button>
        )}
        {profile && (
          <Button onClick={handleCreateParty}>Create party</Button>
        )}
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

const Provider = (config: any | undefined) => {
  const [client, setClient] = useState<Client | undefined>();

  useEffect(() => {
    setImmediate(async () => {
      const client = new Client(config);
      await client.initialize();
      setClient(client);
    });
  }, []);

  if (!client) {
    return <LinearProgress />;
  }

  return (
    <ClientProvider client={client}>
      <ClientConsumer />
    </ClientProvider>
  );
};

export const Memory = () => {
  return <Provider />;
};

export const Persistent = () => {
  const config = {
    storage: {
      persistent: true
    },
    snapshots: true,
    snapshotInterval: 10
  };

  return <Provider config={config}/>;
};
