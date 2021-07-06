//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import { TextField, Container, Button, Grid, Typography } from '@material-ui/core';

import { useBackgroundContext } from '../contexts';

const Import = () => {
  const [seedPhrase, setSeedPhrase] = useState('');
  const [redirected, setRedirected] = useState(false);
  const backgroundService = useBackgroundContext();

  const onRestore = async () => {
    const response = await backgroundService?.rpc.RestoreProfile({ username: 'DXOS user', seedPhrase });
    if (response) {
      setRedirected(true);
    }
  };

  if (redirected) {
    return <Redirect to='/user'/>;
  }

  return (
    <Container>
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Typography variant='h4' align='center'> Restore your identity using seedphrase </Typography>
        </Grid>
        <Grid item xs={12}>
          <TextField
            autoFocus
            fullWidth
            label='Wallet Secret Recovery Phrase'
            placeholder='Paste your seedphrase'
            spellCheck={false}
            value={seedPhrase}
            onChange={e => setSeedPhrase(e.target.value)}
            variant='outlined'/>
        </Grid>
        <Grid item xs={12}>
          <Grid container justify='flex-end'>
            <Button variant='contained' color='primary' onClick={onRestore}> Restore </Button>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Import;
