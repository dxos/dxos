//
// Copyright 2021 DXOS.org
//

import { Button, Container, Grid, makeStyles, TextField, Typography } from '@material-ui/core';
import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';
import { useBackgroundContext } from '../contexts';

const useStyles = makeStyles({
  container: {
    marginTop: 50
  }
});

const CreateProfile = () => {
  const classes = useStyles();

  const [username, setUsername] = useState('');
  const [redirected, setRedirected] = useState(false);

  const backgroundService = useBackgroundContext();

  const onCreate = async () => {
    const response = await backgroundService?.rpc.CreateProfile({ username });
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
            <Button variant='contained' color='primary' onClick={onCreate}> Create </Button>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
}

export default CreateProfile;
