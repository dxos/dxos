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

import { Shell } from './Shell';

void initializeAppTelemetry('halo-shell', new Config(Defaults()));

const configProvider = async () => new Config(await Dynamics(), await Envs(), Defaults());
const serviceProvider = (config?: Config) =>
  config?.get('runtime.app.env.DX_VAULT') === 'false' ? fromHost(config) : fromIFrame(config);

const root = createRoot(document.getElementById('root')!);

const main = async () => {
  const port = await createIFramePort({ channel: 'dxos:shell' });
  const rpc = createProtoRpcPeer({
    requested: {
      OsAppService: schema.getService('dxos.iframe.OsAppService')
    },
    exposed: {
      OsShellService: schema.getService('dxos.iframe.OsShellService')
    },
    handlers: {
      OsShellService: {
        setLayout: async (layout) => {}
      }
    },
    port
  });
  await rpc.open();

  root.render(
    // <StrictMode>
    <ClientProvider config={configProvider} services={serviceProvider}>
      <Shell rpc={rpc} />
    </ClientProvider>
    // </StrictMode>
  );
};

void main();
