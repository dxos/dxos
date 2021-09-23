//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { makeStyles } from '@material-ui/core/styles';

import KeyTable from '../components/KeyTable';
import { useDevtoolsHost } from '../contexts';
import { PublicKey } from '@dxos/crypto';

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
}));

const Keys = () => {
  const classes = useStyles();
  const devtoolsHost = useDevtoolsHost();
  const [keys, setKeys] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const keyring = await devtoolsHost.GetKeyringKeys({});
      if (keyring?.keys) {
        keyring.keys
        setKeys(keyring.keys.map(key => ({ ...key, publicKey: PublicKey.from(key.publicKey!).toHex() })));
      }
    })();
  }, []);

  return (
    <div className={classes.root}>
      <div className={classes.keys}>
        <KeyTable keys={keys} />
      </div>
    </div>
  );
};

export default Keys;
