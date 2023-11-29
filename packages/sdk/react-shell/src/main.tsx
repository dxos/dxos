//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DEFAULT_CLIENT_CHANNEL, DEFAULT_SHELL_CHANNEL } from '@dxos/client-protocol';
import { ShellRuntimeImpl } from '@dxos/client-services';
import { Client, ClientContext, ClientServicesProxy, Config, SystemStatus } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';
import { createIFramePort } from '@dxos/rpc-tunnel';

import { Shell } from './composites';
import { osTranslations } from './translations';

// TODO(wittjosiah): Export to allow for configuration.
//   This package should be renamed to @dxos/shell and this should be the main export.
//   The components used to build the shell can be exported from @dxos/shell/react if needed.
// TODO(wittjosiah): This should be bundled with styles so consumers don't need to use ThemePlugin.
const main = async (config: Config = new Config()) => {
  const runtime = new ShellRuntimeImpl(createIFramePort({ channel: DEFAULT_SHELL_CHANNEL }));
  const services = new ClientServicesProxy(createIFramePort({ channel: DEFAULT_CLIENT_CHANNEL }));
  const client = new Client({ config, services });
  await Promise.all([runtime.open(), client.initialize()]);

  // TODO(wittjosiah): Handle forwarding client rpc over iframe in monolithic mode.
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider tx={defaultTx} resourceExtensions={[osTranslations]}>
        <ClientContext.Provider value={{ client, status: SystemStatus.ACTIVE }}>
          <Shell runtime={runtime} origin={location.origin} />
        </ClientContext.Provider>
      </ThemeProvider>
    </StrictMode>,
  );
};

void main();
