//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Card, CardContent, Typography, CardActions, Button, makeStyles } from '@material-ui/core';

import { useExtensionBackgroundService } from '../hooks';
import type { Profile } from '../utils/types';

const useStyles = makeStyles({
  card: {
    margin: 15
  }
});

const Main = () => {
  const classes = useStyles();

  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  const {error, rpcClient: backgroundService} = useExtensionBackgroundService();

  const onResetIdentity = async () => {
    if (!backgroundService) {
      return;
    }
    const response = await backgroundService.rpc.CreateProfile({ username: 'DXOS user' });
    setProfile(response);
  }

  useEffect(() => {
    if (backgroundService === undefined) {
      return;
    }

    setImmediate(async () => {
      const response = await backgroundService.rpc.GetProfile({});
      setProfile(response);
    });
  }, [backgroundService]);

  if (error) {
    console.error(error);
    return <p>Connection failed.</p>
  }

  if (!backgroundService) {
    return <p>Connecting to background...</p>;
  }

  if (!profile) {
    return <div> No loaded profile </div>;
  }

  return (
    <Card className={classes.card} raised={true}>
      <CardContent> 
        <Typography gutterBottom variant="h5" component="h2">
          {profile.username}
        </Typography>
        <Typography variant="body2" color="textSecondary" component="p">
          {profile.publicKey}
        </Typography>
      </CardContent>
      <CardActions>
        <Button variant='outlined' onClick={onResetIdentity}> Reset identity </Button>
        <Button variant='outlined'> Import using seedphrase </Button>
      </CardActions>
    </Card>
  );
}

export default Main;
