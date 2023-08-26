//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { initializeAppTelemetry } from '@dxos/react-appkit/telemetry';
import { Config, Defaults } from '@dxos/react-client';

import { namespace, useRemoteClient } from '../hooks';
import { Devtools } from './Devtools';

void initializeAppTelemetry({ namespace, config: new Config(Defaults()) });

export const App = () => {
  // TODO(burdon): Global error handler (e.g., if socket error).
  const client = useRemoteClient();
  if (!client) {
    return null;
  }

  return <Devtools client={client} namespace={namespace} />;
};
