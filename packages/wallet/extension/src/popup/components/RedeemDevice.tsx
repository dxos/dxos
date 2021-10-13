//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import { Button, Container, Grid, makeStyles, TextField, Typography } from '@material-ui/core';

import { useBackgroundContext } from '../contexts';
import { useUIError } from '../hooks';
import type { Profile } from '../utils';
import BackButton from './BackButton';

const useStyles = makeStyles({
  container: {
    marginTop: 50
  }
});

interface RedeemDeviceProps {
  profile?: Profile,
  onProfileCreated: (profile: Profile | undefined) => void
}

const RedeemDevice = ({ profile, onProfileCreated } : RedeemDeviceProps) => {
  const classes = useStyles();

  const [invitation, setInvitation] = useState('');
  const [passcode, setPasscode] = useState('');

  const backgroundService = useBackgroundContext();
  const withUIError = useUIError();
  const [inProgress, setInProgress] = useState(false);

  if (profile && profile.username && profile.publicKey) {
    return <Redirect to="/user"/>;
  }

  const onJoin = async () => {
    if (!backgroundService) {
      return;
    }
    setInProgress(true);
    const result = await withUIError(() => {
      return backgroundService.rpc.RedeemDevice({
        invitation,
        passcode
      });
    }, { onSuccessMessage: 'Successfully redeemed', onErrorMessage: 'Couldn\'t join the party' });

    if (result) {
      const profile = await backgroundService.rpc.GetProfile({});
      onProfileCreated(profile);
    }

    setInvitation('');
    setPasscode('');
    setInProgress(false);
  };

  return (
    <Container className={classes.container}>
      <Grid container spacing={4}>
        <Grid item xs={12}>
          <Typography variant='h4' align='center'> Redeem device invitation </Typography>
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
            helperText={<div> The passcode you get from the inviter.  </div>}/>
        </Grid>
        <Grid item xs={6}>
          <BackButton />
        </Grid>
        <Grid item xs={6}>
          <Grid container justify='flex-end'>
            <Button
              variant='contained'
              color='primary'
              onClick={onJoin}
              disabled={inProgress}>
              {inProgress ? 'Redeeming...' : 'Redeem'}
            </Button>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default RedeemDevice;
