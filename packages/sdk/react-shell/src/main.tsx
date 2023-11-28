//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DEFAULT_SHELL_CHANNEL } from '@dxos/client-protocol';
import { ShellRuntimeImpl } from '@dxos/client-services';
import { ClientProvider, Config, Defaults, Envs, Local, fromWorker } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';
import { createIFramePort } from '@dxos/rpc-tunnel';

import { Shell } from './composites';
import { osTranslations } from './translations';

// TODO(wittjosiah): Export to allow for configuration.
//   This package should be renamed to @dxos/shell and this should be the main export.
//   The components used to build the shell can be exported from @dxos/shell/react if needed.
// TODO(wittjosiah): This should be bundled with styles so consumers don't need to use ThemePlugin.
const main = async () => {
  const config = new Config(await Envs(), Local(), Defaults());
  const runtime = new ShellRuntimeImpl(createIFramePort({ channel: DEFAULT_SHELL_CHANNEL }));
  await runtime.open();

  // TODO(wittjosiah): Handle forwarding client rpc over iframe in monolithic mode.
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider tx={defaultTx} resourceExtensions={[osTranslations]}>
        <ClientProvider services={fromWorker} config={config}>
          <Shell runtime={runtime} origin={location.origin} />
        </ClientProvider>
      </ThemeProvider>
    </StrictMode>,
  );
};

void main();
