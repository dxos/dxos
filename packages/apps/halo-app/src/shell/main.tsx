//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import '@dxosTheme';
import { fromHost, fromIFrame } from '@dxos/client';
import { Config, Defaults, Dynamics, Envs } from '@dxos/config';
import { initializeAppTelemetry } from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';
import { osTranslations } from '@dxos/react-ui';

import { Shell } from './Shell';

void initializeAppTelemetry('halo-shell', new Config(Defaults()));

const configProvider = async () => new Config(await Dynamics(), await Envs(), Defaults());
const serviceProvider = (config?: Config) =>
  config?.get('runtime.app.env.DX_VAULT') === 'false' ? fromHost(config) : fromIFrame(config);

const root = createRoot(document.getElementById('root')!);

root.render(
  // <StrictMode>
  <ThemeProvider themeVariant='os' resourceExtensions={[osTranslations]}>
    <ClientProvider config={configProvider} services={serviceProvider} spaceProvider={false} shellProvider={false}>
      <Shell />
    </ClientProvider>
  </ThemeProvider>
  // </StrictMode>
);
