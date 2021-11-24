//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { createTheme } from '@mui/material';
import { makeStyles } from '@mui/styles';

import { useClient } from '@dxos/react-client';

import { KeyTable } from '../components';
import { KeyRecord } from '../proto/gen/dxos/halo/keys';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden'
  },

  filter: {
    display: 'flex',
    flexShrink: 0,
    padding: theme.spacing(1),
    paddingTop: theme.spacing(2)
  },

  keys: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden'
  }
}), { defaultTheme: createTheme({}) });

export const Keyring = () => {
  const classes = useStyles();
  const client = useClient();
  const devtoolsHost = client.services.DevtoolsHost;
  const [keys, setKeys] = useState<KeyRecord[]>([]);

  useEffect(() => {
    setImmediate(async () => {
      const keyring = await devtoolsHost.GetKeyringKeys({});
      if (keyring?.keys) {
        setKeys(keyring.keys);
      }
    });
  }, []);

  if (keys.length === 0) {
    return (
      <div className={classes.root}>
        No keys to display.
      </div>
    );
  }

  return (
    <KeyTable keys={keys} />
  );
};
