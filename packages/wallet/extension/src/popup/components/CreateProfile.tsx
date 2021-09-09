//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';
import { useHistory, Redirect } from 'react-router-dom';
import { browser } from 'webextension-polyfill-ts';

import { Button, Container, Grid, makeStyles, TextField, Typography, Link } from '@material-ui/core';

import { useBackgroundContext } from '../contexts';
import { useUIError } from '../hooks';
import { inFullScreenMode } from '../utils';
import type { Profile } from '../utils/types';

const useStyles = makeStyles({
  container: {
    marginTop: 50
  }
});

interface CreateProfileProps {
  profile?: Profile,
  onProfileCreated: (profile: Profile | undefined) => void
}

const CreateProfile = ({ onProfileCreated, profile } : CreateProfileProps) => {
  const classes = useStyles();

  const [username, setUsername] = useState('');
  const [inProgress, setInProgress] = useState(false);

  const history = useHistory();

  const backgroundService = useBackgroundContext();
  const withUIError = useUIError();

  const onImport = async () => {
    if (inFullScreenMode()) {
      history.push('/import');
      return;
    }
    const fullScreenUrl = location.href.replace('popup/popup.html', 'popup/fullscreen.html').replace('create', 'import');
    await browser.tabs.create({ active: true, url: fullScreenUrl });
  };

  const onCreate = async () => {
    setInProgress(true);
    const response = await withUIError(
      () => backgroundService?.rpc.CreateProfile({ username }),
      {
        onSuccessMessage: 'Succesfully created profile',
        onErrorMessage: 'Couldn\'t create profile'
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

  if (profile && profile.username && profile.publicKey) {
    return <Redirect to='/user'/>;
  }

  return (
    <Container className={classes.container} maxWidth='md'>
      <Grid container spacing={4}>
        <Grid item xs={12}>
          <Typography variant='h6' align='center'> Create new profile </Typography>
        </Grid>
        <Grid item xs={12}>
          <Grid container justify='center'>
            <TextField
              label='Your new username'
              placeholder='Type in username'
              spellCheck={false}
              value={username}
              onChange={e => setUsername(e.target.value)}
              variant='outlined'
              required
              helperText={<div> This will be your username visible to everyone. </div>}/>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Grid container justify='flex-end'>
            <Button
              variant='contained'
              color='primary'
              onClick={onCreate}
              disabled={inProgress}>
              {inProgress ? 'Creating...' : 'Create'}
            </Button>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Grid container justify='center' onClick={onImport}>
            or &nbsp; <Link component='button'> Import using seedphrase</Link>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CreateProfile;
