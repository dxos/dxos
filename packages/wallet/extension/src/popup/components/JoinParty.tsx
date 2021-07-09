//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';

import { Button, Container, Grid, makeStyles, TextField, Typography } from '@material-ui/core';

import { useBackgroundContext } from '../contexts';

const useStyles = makeStyles({
  container: {
    marginTop: 20
  }
});

const JoinParty = () => {
  const classes = useStyles();

  const [invitation, setInvitation] = useState('');
  const [passcode, setPasscode] = useState('');

  const backgroundService = useBackgroundContext();
  const [inProgress, setInProgress] = useState(false);

  const history = useHistory();

  const onJoin = async () => {
    if (!backgroundService) {
      return;
    }

    try {
      setInProgress(true);
      await backgroundService.rpc.JoinParty({
        invitation,
        passcode
      });
      history.push('/parties');
    } catch (e) {
      console.error(e);
    } finally {
      setInvitation('');
      setPasscode('');
      setInProgress(false);
    }
  };

  return (
    <Container className={classes.container}>
      <Grid container spacing={4}>
        <Grid item xs={12}>
          <Typography variant='h4' align='center'> Join party </Typography>
        </Grid>
        <Grid item xs={12}>
          <TextField
            autoFocus
            fullWidth
            multiline
            label='Invitation code'
            placeholder='Paste code'
            spellCheck={false}
            value={invitation}
            onChange={e => setInvitation(e.target.value)}
            variant='outlined'
            required
            helperText={<div> The shared invitation code. </div>}/>
        </Grid>
        <Grid item xs={12}>
          <TextField
            label='Passcode'
            placeholder='Paste passcode'
            spellCheck={false}
            value={passcode}
            onChange={e => setPasscode(e.target.value)}
            variant='outlined'
            required
            helperText={<div> The passcode you get from the party owner.  </div>}/>
        </Grid>
        <Grid item xs={12}>
          <Grid container justify='flex-end'>
            <Button
              variant='contained'
              color='primary'
              onClick={onJoin}
              disabled={inProgress}>
              {inProgress ? 'Joining...' : 'Join'}
            </Button>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default JoinParty;
