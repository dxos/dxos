//
// Copyright 2023 DXOS.org
//

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DEFAULT_CLIENT_CHANNEL, DEFAULT_SHELL_CHANNEL } from '@dxos/client-protocol';
import { AgentHostingProvider, ClientProvider, ClientServicesProxy, Config, ShellDisplay } from '@dxos/react-client';
import { Button, Clipboard, Dialog, ThemeProvider, Tooltip, useTranslation } from '@dxos/react-ui';
import { defaultTx } from '@dxos/ui-theme';
import { createIFramePort } from '@dxos/rpc-tunnel';

import { translations } from '../../translations';

import { Shell } from './Shell';
import { ShellRuntimeImpl } from './shell-runtime';

export const runShell = async (config: Config = new Config()) => {
  // If runtime fails to open then the shell will not be openable.
  const runtime = new ShellRuntimeImpl(createIFramePort({ channel: DEFAULT_SHELL_CHANNEL }));
  await runtime.open();

  try {
    const services = new ClientServicesProxy(createIFramePort({ channel: DEFAULT_CLIENT_CHANNEL }));

    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ThemeProvider tx={defaultTx} resourceExtensions={translations}>
          <ClientProvider config={config} services={services} noBanner>
            <Clipboard.Provider>
              <Tooltip.Provider>
                <AgentHostingProvider>
                  <Shell runtime={runtime} />
                </AgentHostingProvider>
              </Tooltip.Provider>
            </Clipboard.Provider>
          </ClientProvider>
        </ThemeProvider>
      </StrictMode>,
    );
  } catch {
    // If shell's client fails to initialize, ensure that the shell is still closeable.
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ThemeProvider tx={defaultTx} resourceExtensions={translations}>
          <Fallback onClose={() => runtime.setAppContext({ display: ShellDisplay.NONE })} />
        </ThemeProvider>
      </StrictMode>,
    );
  }
};

const Fallback = ({ onClose }: { onClose?: () => void }) => {
  const { t } = useTranslation('os');

  return (
    <Dialog.Root modal open onOpenChange={() => onClose?.()}>
      <Dialog.Overlay>
        <Dialog.Content>
          <Dialog.Title>{t('shell fallback title')}</Dialog.Title>
          <Dialog.Close asChild onClick={() => onClose?.()}>
            <Button variant='primary'>{t('close label')}</Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  );
};
