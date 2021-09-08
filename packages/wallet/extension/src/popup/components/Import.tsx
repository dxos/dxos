//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';

import { TextField, Container, Button, Grid, Typography, Checkbox, FormControlLabel, makeStyles } from '@material-ui/core';

import { useBackgroundContext } from '../contexts';
import { useUIError } from '../hooks';
import type { Profile } from '../utils/types';
import BackButton from './BackButton';

const useStyles = makeStyles({
  container: {
    marginTop: 50
  }
});

interface ImportProps {
  onProfileCreated: (profile: Profile | undefined) => void
}

const Import = ({ onProfileCreated } : ImportProps) => {
  const classes = useStyles();

  const [seedPhrase, setSeedPhrase] = useState('');
  const [username, setUsername] = useState('');
  const [showSeed, setShowseed] = useState(false);
  const [inProgress, setInProgress] = useState(false);

  const history = useHistory();

  const backgroundService = useBackgroundContext();
  const withUIError = useUIError();

  const onRestore = async () => {
    setInProgress(true);
    const response = await withUIError(
      () => backgroundService?.rpc.RestoreProfile({ username, seedPhrase }),
      {
        onSuccessMessage: 'Succesfully imported profile',
        onErrorMessage: 'Couldn\'t import profile'
      }
    );
    setInProgress(false);
    if (response) {
      const { result } = response;
      if (result && result.publicKey) {
        onProfileCreated(result);
        history.push('/user');
      }
    }
  };

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
        <Grid item xs={6}>
          <BackButton />
        </Grid>
        <Grid item xs={6}>
          <Grid container justify='flex-end'>
            <Button
              variant='contained'
              color='primary'
              onClick={onRestore}
              disabled={inProgress}>
              {inProgress ? 'Importing...' : 'Import'}
            </Button>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Import;
