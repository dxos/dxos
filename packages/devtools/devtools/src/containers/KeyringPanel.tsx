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

  const { keys } = useStream(() => devtoolsHost.SubscribeToKeyringKeys({})) ?? {};
  if (keys === undefined) {
    return null;
  }

  return (
    <KeyTable keys={keys} />
  );
};
