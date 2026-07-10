//
// Copyright 2023 DXOS.org
//

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DEFAULT_CLIENT_CHANNEL, DEFAULT_SHELL_CHANNEL } from '@dxos/client-protocol';
import { AgentHostingProvider, ClientProvider, ClientServicesProxy, Config, ShellDisplay } from '@dxos/react-client';
import { Button, Clipboard, Dialog, ThemeProvider, Tooltip, useTranslation } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui';
import { createIFramePort } from '@dxos/rpc-tunnel';

import { translationKey, translations } from '../../translations';
import { Shell } from './Shell';
import { ShellRuntimeImpl } from './shell-runtime';

export const runShell = async (config: Config = new Config()) => {
  // If runtime fails to open then the shell will not be openable.
  const runtime = new ShellRuntimeImpl(createIFramePort({ channel: DEFAULT_SHELL_CHANNEL }));
  await runtime.open();

  try {
    // `ClientServicesProxy` speaks the effect-rpc native Worker protocol over a `MessagePort`, while
    // the shell reaches the host over its iframe `window.parent`. Relay one end of a `MessageChannel`
    // over `window.parent.postMessage` (which preserves structured-clone payloads) tagged with the
    // client channel so protocol frames cross unencoded.
    // TODO(dxos): The host-side Worker-protocol bridge is a follow-up; until it lands this connection
    //   carries no live traffic (see plans/worker-package/rpc-effect.md, Phase C).
    const clientChannel = new MessageChannel();
    clientChannel.port2.onmessage = (event) => {
      window.parent.postMessage({ channel: DEFAULT_CLIENT_CHANNEL, message: event.data }, '*');
    };
    window.addEventListener('message', (event) => {
      if (typeof event.data !== 'object' || event.data === null || event.data.channel !== DEFAULT_CLIENT_CHANNEL) {
        return;
      }
      clientChannel.port2.postMessage(event.data.message);
    });
    clientChannel.port2.start();
    const services = new ClientServicesProxy(clientChannel.port1);

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
  const { t } = useTranslation(translationKey);

  return (
    <Dialog.Root modal open onOpenChange={() => onClose?.()}>
      <Dialog.Overlay>
        <Dialog.Content>
          <Dialog.Title>{t('shell-fallback.title')}</Dialog.Title>
          <Dialog.Close asChild onClick={() => onClose?.()}>
            <Button variant='primary'>{t('close.label')}</Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  );
};
