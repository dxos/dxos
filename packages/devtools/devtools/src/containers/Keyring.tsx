//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Typography } from '@mui/material';

import { useClient } from '@dxos/react-client';

import { KeyTable } from '../components';
import { useStream } from '../hooks';

export const Keyring = () => {
  const client = useClient();
  const devtoolsHost = client.services.DevtoolsHost;

  const result = useStream(() => devtoolsHost.SubscribeToKeyringKeys({}));
  if (result === undefined || result.keys === undefined) {
    return (
      <Typography sx={{ padding: 2 }}>
        No keys to display.
      </Typography>
    );
  }

  return (
    <KeyTable keys={result.keys} />
  );
};
