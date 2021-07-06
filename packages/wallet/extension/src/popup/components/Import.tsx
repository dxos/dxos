//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import { TextField, Container, Button, Grid, Typography, Checkbox, FormControlLabel, makeStyles } from '@material-ui/core';

import { useBackgroundContext } from '../contexts';

const useStyles = makeStyles({
  container: {
    marginTop: 50
  }
});

const Import = () => {
  const classes = useStyles();

  const [seedPhrase, setSeedPhrase] = useState('');
  const [username, setUsername] = useState('');
  const [showSeed, setShowseed] = useState(false);
  const [redirected, setRedirected] = useState(false);

  const backgroundService = useBackgroundContext();

  const onRestore = async () => {
    const response = await backgroundService?.rpc.RestoreProfile({ username, seedPhrase });
    if (response && response.publicKey) {
      setRedirected(true);
    }
  };

  if (redirected) {
    return <Redirect to='/user'/>;
  }

  return (
    <Container className={classes.container}>
      <Grid container spacing={4}>
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
            variant='outlined'
            required
            helperText={<div> Your public and private keys will be recreated using this seedphrase. You will have all the accesses you had before.</div>}
            type={showSeed ? 'string' : 'password'}/>
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={<Checkbox checked={showSeed} onChange={(e) => {
              setShowseed(e.target.checked);
            }} name="showSeed" color='primary' />}
            label='Show Secret Recovery Phrase'
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label='Your new username'
            placeholder='Type in username'
            spellCheck={false}
            value={username}
            onChange={e => setUsername(e.target.value)}
            variant='outlined'
            required
            helperText={<div> We cannot restore your username using your seedphrase, so you need to create a new one. </div>}/>
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
