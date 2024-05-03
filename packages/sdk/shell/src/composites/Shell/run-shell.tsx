//
// Copyright 2023 DXOS.org
//

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DEFAULT_CLIENT_CHANNEL, DEFAULT_SHELL_CHANNEL } from '@dxos/client-protocol';
import { ShellRuntimeImpl } from '@dxos/client-services';
import {
  AgentHostingProvider,
  Client,
  ClientContext,
  ClientServicesProxy,
  Config,
  SystemStatus,
} from '@dxos/react-client';
import { ThemeProvider, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';
import { createIFramePort } from '@dxos/rpc-tunnel';

import { Shell } from './Shell';
import { ClipboardProvider } from '../../components';
import { osTranslations } from '../../translations';

export const runShell = async (config: Config = new Config()) => {
  const services = new ClientServicesProxy(createIFramePort({ channel: DEFAULT_CLIENT_CHANNEL }));
  const client = new Client({ config, services });
  const runtime = new ShellRuntimeImpl(createIFramePort({ channel: DEFAULT_SHELL_CHANNEL }));
  await Promise.all([runtime.open(), client.initialize()]);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider tx={defaultTx} resourceExtensions={[osTranslations]}>
        <ClientContext.Provider value={{ client, status: SystemStatus.ACTIVE }}>
          <ClipboardProvider>
            <Tooltip.Provider>
              <AgentHostingProvider>
                <Shell runtime={runtime} origin={location.origin} />
              </AgentHostingProvider>
            </Tooltip.Provider>
          </ClipboardProvider>
        </ClientContext.Provider>
      </ThemeProvider>
    </StrictMode>,
  );
};
