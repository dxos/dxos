//
// Copyright 2020 DXOS.org
//

import clsx from 'clsx';
import * as faker from 'faker';
import React, { useState, useEffect } from 'react';

import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CircularProgress, Grid, Toolbar, Typography
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import { Client } from '@dxos/client';
import { createKeyPair } from '@dxos/crypto';
import { Party } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { ClientProvider, useClient, useItems, useParties, useProfile } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-ux';

export default {
  title: 'Demos/ClientProvider'
};

const useStyles = makeStyles(theme => ({
  root: {
    margin: theme.spacing(2)
  },
  party: {
    width: 300,
    backgroundColor: theme.palette.grey[100]
  },
  ellipsis: {
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  key: {
    fontFamily: 'monospace',
    fontSize: 'small'
  }
}));

const PartyView = ({ party }: { party: Party }) => {
  const classes = useStyles();
  const items = useItems({ partyKey: party.key }) as any;

  // TODO(burdon): Set title.
  const handleCreateItem = () => {
    party.database.createItem({ model: ObjectModel });
  };

  return (
    <Card className={classes.party}>
      <CardHeader
        classes={{ content: classes.ellipsis, title: classes.ellipsis }}
        title={party.key.toString()}
      />
      <CardContent>
        {items.map((item: any) => (
          <Typography className={clsx(classes.ellipsis, classes.key)} key={item.id}>{item.id}</Typography>
        ))}
      </CardContent>
      <CardActions>
        <Button onClick={handleCreateItem}>Create item</Button>
      </CardActions>
    </Card>
  );
};

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
        <JsonTreeView data={{ profile }} />
      </Box>
      <Grid
        container
        direction='row'
        spacing={2}
      >
        {parties.map((party: any) => (
          <Grid item>
            <PartyView key={party.key.toString()} party={party} />
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

  // TODO(burdon): Move into card.
  if (!client) {
    return <CircularProgress />;
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
