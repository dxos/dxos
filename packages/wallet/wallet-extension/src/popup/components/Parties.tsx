//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Typography, Container, makeStyles, Button, Grid, List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction } from '@material-ui/core';
import FolderIcon from '@material-ui/icons/FolderOpen';

import type { GetPartiesResponse } from '@dxos/wallet-core';

import { useBackgroundContext } from '../contexts';
import { useUIError } from '../hooks';
import BackButton from './BackButton';
import CopyButton from './CopyButton';

const useStyles = makeStyles({
  container: {
    marginTop: 20
  },
  ellipsis: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }
});

const Parties = () => {
  const classes = useStyles();

  const [parties, setParties] = useState<GetPartiesResponse | undefined>(undefined);

  const backgroundService = useBackgroundContext();
  const withUIError = useUIError();

  useEffect(() => {
    if (backgroundService === undefined) {
      return;
    }

    setImmediate(async () => {
      const response = await withUIError(
        () => backgroundService.rpc.GetParties({}),
        { onErrorMessage: 'Couldn\'t load parties' }
      );
      if (response) {
        const { result } = response;
        setParties(result);
      }
    });
  }, [backgroundService]);

  if (!backgroundService) {
    return <p>Connecting to background...</p>;
  }

  return (
    <Container className={classes.container}>
      <Grid container spacing={4}>
        <Grid item xs={12}>
          <Typography variant='h4' align='center'> Your parties </Typography>
        </Grid>
        <Grid item xs={12}>
          <List>
            {!parties?.partyKeys?.length
              ? <ListItem>
              You have no parties
              </ListItem>
              : null}
            {parties?.partyKeys?.map(key =>
              <ListItem key={key}>
                <ListItemIcon>
                  <FolderIcon />
                </ListItemIcon>
                <ListItemText
                  classes={{
                    secondary: classes.ellipsis
                  }}
                  secondary={key}
                />
                <ListItemSecondaryAction>
                  <CopyButton text={key} />
                </ListItemSecondaryAction>
              </ListItem>
            )}
          </List>
        </Grid>
        <Grid item xs={6}>
          <BackButton />
        </Grid>
        <Grid item xs={6}>
          <Grid container justify='flex-end'>
            <Button
              variant='contained'
              color='primary'
              component={Link}
              to='/joinparty'>
              Join new party
            </Button>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Parties;
