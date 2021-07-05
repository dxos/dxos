//
// Copyright 2021 DXOS.org
//

//
// Copyright 2021 DXOS.org
//

import React, { useEffect } from 'react';
import { Redirect } from 'react-router-dom';
import { browser } from 'webextension-polyfill-ts';

import { Card, Button, makeStyles, CardActions } from '@material-ui/core';

import { useBackgroundContext} from '../contexts';
import type { Profile } from '../utils/types';

const useStyles = makeStyles({
  card: {
    margin: 15
  }
});

interface LoginProps {
  profile?: Profile,
  setProfile: (profile: Profile | undefined) => void
}

const Login = ({ profile, setProfile } : LoginProps) => {
  const classes = useStyles();

  const backgroundService = useBackgroundContext();

  const onCreateIdentity = async () => {
    if (!backgroundService) {
      return;
    }
    const response = await backgroundService.rpc.CreateProfile({ username: 'DXOS user' });
    setProfile(response);
  }

  const onImport = async () => {
    await browser.tabs.create({ active: true, url: location.toString().replace('login', 'import') });
  };

  useEffect(() => {
    if (backgroundService === undefined) {
      return;
    }

    setImmediate(async () => {
      const response = await backgroundService.rpc.GetProfile({});
      setProfile(response);
    });
  }, [backgroundService]);

  if (!backgroundService) {
    return <p>Connecting to background...</p>;
  }

  if (profile && profile.username && profile.publicKey) {
    return <Redirect to='/user'/>
  }

  return (
    <>
      <Card className={classes.card} raised={true}>
        <CardActions>
          <Button variant='outlined' onClick={onCreateIdentity}> Create identity </Button>
          <Button variant='outlined' onClick={onImport}> Import using seedphrase </Button>
        </CardActions>
      </Card>
    </>
  );
}

export default Login;
