//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useClient } from '@dxos/react-client';

import { KeyTable } from '../components';
import { useStream } from '../hooks';

export const KeyringPanel = () => {
  const client = useClient();
  const devtoolsHost = client.services.DevtoolsHost;

  const result = useStream(() => devtoolsHost.SubscribeToKeyringKeys({}));
  if (result === undefined || result.keys === undefined) {
    return null;
  }

  return (
    <KeyTable keys={result.keys} />
  );
};
