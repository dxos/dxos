//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import '@dxosTheme';
import { fromHost, fromIFrame } from '@dxos/client';
import { Config, Defaults, Dynamics, Envs } from '@dxos/config';
import { schema } from '@dxos/protocols';
import { initializeAppTelemetry } from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { createProtoRpcPeer } from '@dxos/rpc';
import { createIFramePort } from '@dxos/rpc-tunnel';

import { Embed } from './Embed';

void initializeAppTelemetry('halo-embed', new Config(Defaults()));

const configProvider = async () => new Config(await Dynamics(), await Envs(), Defaults());
const serviceProvider = (config?: Config) =>
  config?.get('runtime.app.env.DX_VAULT') === 'false' ? fromHost(config) : fromIFrame(config);

const root = createRoot(document.getElementById('root')!);

const main = async () => {
  const port = await createIFramePort({ channel: 'dxos:embed' });
  const rpc = createProtoRpcPeer({
    requested: {
      OsEmbedService: schema.getService('dxos.iframe.OsEmbedService')
    },
    port
  });
  await rpc.open();

  root.render(
    // <StrictMode>
    <ClientProvider config={configProvider} services={serviceProvider}>
      <Embed rpc={rpc} />
    </ClientProvider>
    // </StrictMode>
  );
};

void main();
