//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { Devtools } from '@dxos/devtools';
import { initializeAppObservability } from '@dxos/observability';
import { type Client, type ClientServices } from '@dxos/react-client';
import { type Provider } from '@dxos/util';

const namespace = 'devtools';

const App = ({ clientProvider }: { clientProvider: Provider<Promise<Client>> }) => {
  const [client, setClient] = useState<Client>();

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const client = await clientProvider();
      setClient(client);
    });

    return () => clearTimeout(timeout);
  }, []);

  if (!client) {
    return null;
  }

  return <Devtools client={client} services={client.services.services as ClientServices} namespace={namespace} />;
};

const main = async () => {
  const enter =
    localStorage.getItem('dxos.org/plugin/debug/devtools') === 'true' ||
    window.confirm('Continue to DXOS developer tools?');
  if (!enter) {
    window.location.pathname = '/';
    return;
  }

  const { createClientServices, Client, Remote, Config, Defaults } = await import('@dxos/react-client');

  void initializeAppObservability({ namespace, config: new Config(Defaults()) });

  const clientProvider = async () => {
    const searchParams = new URLSearchParams(window.location.search);
    const target = searchParams.get('target');
    const config = new Config(target ? Remote(target) : {}, Defaults());
    const services = await createClientServices(config);
    const client = new Client({ config, services });
    await client.initialize();
    return client;
  };

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App clientProvider={clientProvider} />
    </StrictMode>,
  );
};

void main();
