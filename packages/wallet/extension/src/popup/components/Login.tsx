//
// Copyright 2021 DXOS.org
//

import React from 'react';
import { Redirect, useHistory } from 'react-router-dom';
import { browser } from 'webextension-polyfill-ts';

import { Card, Button, makeStyles, CardActions } from '@material-ui/core';

import type { Profile } from '../utils/types';

const useStyles = makeStyles({
  card: {
    margin: 15
  }
});

interface LoginProps {
  profile?: Profile
}

const Login = ({ profile } : LoginProps) => {
  const classes = useStyles();

  const history = useHistory();

  const onCreateIdentity = async () => {
    history.push('/create');
  };

  const onImport = async () => {
    await browser.tabs.create({ active: true, url: location.toString().replace('login', 'import') });
  };

  if (profile && profile.username && profile.publicKey) {
    return <Redirect to='/user'/>;
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
};

export default Login;
