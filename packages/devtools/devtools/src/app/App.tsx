//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Config, Defaults } from '@dxos/config';
import { initializeAppTelemetry } from '@dxos/react-appkit/telemetry';

import { namespace, useRemoteClient } from '../hooks';
import { Devtools } from './Devtools';

void initializeAppTelemetry(namespace, new Config(Defaults()));

export const App = () => {
  const client = useRemoteClient();

  return <Devtools context={client} namespace={namespace} />;
};
