//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { Devtools } from '@dxos/devtools';
import { log } from '@dxos/log';
import { initializeAppObservability } from '@dxos/observability';
import { type ClientServices, createClientServices, Client, Remote, Config, Defaults } from '@dxos/react-client';

const namespace = 'devtools';

void initializeAppObservability({ namespace, config: new Config(Defaults()) });

const App = () => {
  const [client, setClient] = useState<Client>();

  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const target = searchParams.get('target');
        const config = new Config(target ? Remote(target) : {}, Defaults());
        const services = await createClientServices(config);
        const client = new Client({ config, services });
        await client.initialize();
        setClient(client);
      } catch (err: any) {
        // TODO(burdon): Global error handler (e.g., if socket error).
        log.catch(err);
      }
    });

    return () => clearTimeout(timeout);
  }, []);

  if (!client) {
    return null;
  }

  return <Devtools client={client} services={client.services.services as ClientServices} namespace={namespace} />;
};

const main = () => {
  const enter =
    localStorage.getItem('dxos.org/plugin/debug/devtools') === 'true' ||
    window.confirm('Continue to DXOS developer tools?');
  if (!enter) {
    window.location.pathname = '/';
    return;
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

main();
