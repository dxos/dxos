//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';

import { Button, Container, Grid, makeStyles, TextField, Typography } from '@material-ui/core';

import { useBackgroundContext } from '../contexts';
import type { Profile } from '../utils/types';

const useStyles = makeStyles({
  container: {
    marginTop: 50
  }
});

interface CreateProfileProps {
  onProfileCreated: (profile: Profile | undefined) => void
}

const CreateProfile = ({ onProfileCreated } : CreateProfileProps) => {
  const classes = useStyles();

  const [username, setUsername] = useState('');
  const [inProgress, setInProgress] = useState(false);

  const history = useHistory();

  const backgroundService = useBackgroundContext();

  const onCreate = async () => {
    setInProgress(true);
    const response = await backgroundService?.rpc.CreateProfile({ username });
    setInProgress(false);
    if (response && response.publicKey) {
      onProfileCreated(response);
      history.push('/user');
    }
  };

  return (
    <Container className={classes.container}>
      <Grid container spacing={4}>
        <Grid item xs={12}>
          <Typography variant='h6' align='center'> Create new profile </Typography>
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
            helperText={<div> This will be your username visible for everyone. </div>}/>
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
      </Grid>
    </Container>
  );
};

export default CreateProfile;
