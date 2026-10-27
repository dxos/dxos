//
// Copyright 2023 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DEFAULT_CLIENT_CHANNEL, DEFAULT_SHELL_CHANNEL } from '@dxos/client-protocol';
import { AppContextRequestSchema } from '@dxos/protocols/buf/dxos/iframe_pb';
import { AgentHostingProvider, ClientProvider, ClientServicesProxy, Config, ShellDisplay } from '@dxos/react-client';
import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Theme from '@dxos/react-ui/Theme';
import { createIFramePort } from '@dxos/rpc-tunnel';

import { translationKey, translations } from '../../translations.ts';
import { ShellRuntimeImpl } from './shell-runtime.ts';
import { Shell } from './Shell.tsx';

export const runShell = async (config: Config = new Config()) => {
  // If runtime fails to open then the shell will not be openable.
  const runtime = new ShellRuntimeImpl(createIFramePort({ channel: DEFAULT_SHELL_CHANNEL }));
  await runtime.open();

  try {
    // Provide the parent origin upfront so the effect-rpc client can send its first frame without
    // waiting for an inbound message. The shell is served same-origin with its host, and unlike the
    // former protobuf peer the effect-rpc server is passive (never sends until it receives), so the
    // port would otherwise deadlock with no origin to post to.
    const services = new ClientServicesProxy(
      createIFramePort({ channel: DEFAULT_CLIENT_CHANNEL, origin: window.location.origin }),
    );

    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <Theme.Provider tx={Theme.defaultTx} resourceExtensions={translations}>
          <ClientProvider config={config} services={services} noBanner>
            <AgentHostingProvider>
              <Shell runtime={runtime} />
            </AgentHostingProvider>
          </ClientProvider>
        </Theme.Provider>
      </StrictMode>,
    );
  } catch {
    // If shell's client fails to initialize, ensure that the shell is still closeable.
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <Theme.Provider tx={Theme.defaultTx} resourceExtensions={translations}>
          <Fallback
            onClose={() => runtime.setAppContext(create(AppContextRequestSchema, { display: ShellDisplay.NONE }))}
          />
        </Theme.Provider>
      </StrictMode>,
    );
  }
};

const Fallback = ({ onClose }: { onClose?: () => void }) => {
  const { t } = Hooks.useTranslation(translationKey);

  return (
    <Dialog.Root modal open onOpenChange={() => onClose?.()}>
      <Dialog.Content>
        <Dialog.Title>{t('shell-fallback.title')}</Dialog.Title>
        <Dialog.Footer>
          <Dialog.CloseTrigger asChild onClick={() => onClose?.()}>
            <Button.Root variant='primary' classNames='w-full'>
              {t('close.label')}
            </Button.Root>
          </Dialog.CloseTrigger>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
};
