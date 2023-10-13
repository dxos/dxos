//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { initializeAppTelemetry } from '@braneframe/plugin-telemetry/headless';
import { createClientServices, Remote } from '@dxos/client/services';
import { log } from '@dxos/log';
import { useAsyncEffect } from '@dxos/react-async';
import { Client, type ClientServices, Config, Defaults, DEFAULT_VAULT_ORIGIN } from '@dxos/react-client';

import { Devtools } from './Devtools';
import { namespace } from '../hooks';

void initializeAppTelemetry({ namespace, config: new Config(Defaults()) });

export const App = () => {
  const [client, setClient] = useState<Client>();
  useAsyncEffect(async () => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const target = searchParams.get('target') ?? DEFAULT_VAULT_ORIGIN;
      const config = new Config(Remote(target), Defaults());
      const services = await createClientServices(config);
      const client = new Client({ config, services });
      await client.initialize();
      setClient(client);
    } catch (err: any) {
      // TODO(burdon): Global error handler (e.g., if socket error).
      log.catch(err);
    }
  }, []);

  if (!client) {
    return null;
  }

  return <Devtools client={client} services={client.services.services as ClientServices} namespace={namespace} />;
};
