//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { initializeAppObservability } from '@braneframe/plugin-telemetry/headless';
import { createClientServices, Remote } from '@dxos/client/services';
import { log } from '@dxos/log';
import { type Observability } from '@dxos/observability';
import { useAsyncEffect } from '@dxos/react-async';
import { Client, type ClientServices, Config, Defaults, DEFAULT_VAULT_ORIGIN } from '@dxos/react-client';

import { Devtools } from './Devtools';
import { namespace } from '../hooks';

export const App = () => {
  const [client, setClient] = useState<Client>();
  const [observability, setObservability] = useState<Observability>();
  useAsyncEffect(async () => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const target = searchParams.get('target') ?? DEFAULT_VAULT_ORIGIN;
      const config = new Config(Remote(target), Defaults());
      const services = await createClientServices(config);
      const client = new Client({ config, services });
      await client.initialize();
      setClient(client);
      const observability = await initializeAppObservability({ namespace, config: new Config(Defaults()) });
      setObservability(observability);
    } catch (err: any) {
      // TODO(burdon): Global error handler (e.g., if socket error).
      log.catch(err);
    }
  }, []);

  if (!client) {
    return null;
  }

  return (
    <Devtools
      client={client}
      services={client.services.services as ClientServices}
      namespace={namespace}
      observability={observability}
    />
  );
};
