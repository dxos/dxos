//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Typography, Container, makeStyles, Button, Grid } from '@material-ui/core';

import type { GetPartiesResponse } from '@dxos/wallet-core';

import { useBackgroundContext } from '../contexts';
import BackButton from './BackButton';

const useStyles = makeStyles({
  container: {
    marginTop: 20
  }
});

const Parties = () => {
  const classes = useStyles();

  const [parties, setParties] = useState<GetPartiesResponse | undefined>(undefined);

  const backgroundService = useBackgroundContext();

  useEffect(() => {
    if (backgroundService === undefined) {
      return;
    }

    setImmediate(async () => {
      setParties(await backgroundService.rpc.GetParties({}));
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
        {(parties?.partyKeys ?? ['You have no parties']).map(key => <Grid item xs={12} key={key}> {key} </Grid>)}
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
