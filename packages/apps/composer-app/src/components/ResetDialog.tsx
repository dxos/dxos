//
// Copyright 2022 DXOS.org
//

import { CaretDown, CaretRight, Clipboard } from '@phosphor-icons/react';
import React, { useCallback, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Config, Defaults, Envs, Local, Storage } from '@dxos/react-client';
import {
  AlertDialog,
  type AlertDialogRootProps,
  Button,
  DropdownMenu,
  Message,
  Tooltip,
  useTranslation,
} from '@dxos/react-ui';
import { type Provider } from '@dxos/util';

// TODO(burdon): Factor out.
const parseError = (t: (name: string, context?: object) => string, error: Error) => {
  const context = 'context' in error && error.context && typeof error.context === 'object' ? error.context : {};

  const translatedTitle = t(`${error.name} title`, context);
  const title = translatedTitle === `${error.name} title` ? t('fatal error title') : translatedTitle;

  const translatedMessage = t(`${error.name} message`, context);
  const message = translatedMessage === `${error.name} message` ? t('fatal error message') : translatedMessage;

  // Removes indents.
  const stack = String(error?.stack)
    .split('\n')
    .map((text) => text.trim())
    .join('\n');

  return { title, message, stack, context };
};

export type FatalErrorProps = Pick<AlertDialogRootProps, 'defaultOpen' | 'open' | 'onOpenChange'> & {
  error?: Error;
  config?: Config | Provider<Promise<Config>>;
  isDev?: boolean;
};

export const ResetDialog = ({
  error: propsError,
  config: configProvider,
  defaultOpen,
  open,
  onOpenChange,
}: FatalErrorProps) => {
  const { t } = useTranslation('composer');
  const error = propsError && parseError(t, propsError);
  const {
    needRefresh: [needRefresh, _setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const [showStack, setShowStack] = useState(false);

  const handleCopyError = useCallback(() => {
    void navigator.clipboard.writeText(JSON.stringify(error));
  }, [error]);

  const handleReset = async () => {
    const config = new Config(await Storage(), Envs(), Local(), Defaults());

    const { ClientServicesHost } = await import('@dxos/client-services');
    const services = new ClientServicesHost({ config });
    await services.reset();
    window.location.reload();
  };

  const Caret = showStack ? CaretDown : CaretRight;

  // TODO(burdon): Make responsive (full page mobile).
  return (
    <AlertDialog.Root
      {...(typeof defaultOpen === 'undefined' && typeof open === 'undefined' && typeof onOpenChange === 'undefined'
        ? { defaultOpen: true }
        : { defaultOpen, open, onOpenChange })}
    >
      <AlertDialog.Overlay>
        <AlertDialog.Content classNames='w-[30rem]' data-testid='resetDialog'>
          <AlertDialog.Title>{t(error ? error.title : 'reset dialog label')}</AlertDialog.Title>
          <AlertDialog.Description>{t(error ? error.message : 'reset dialog message')}</AlertDialog.Description>
          {error && (
            <>
              <button
                className='flex items-center'
                onClick={() => setShowStack((showStack) => !showStack)}
                data-testid='resetDialog.showStackTrace'
              >
                <Caret />
                <span className='mis-2'>{t('show stack label')}</span>
              </button>
              {showStack && (
                <Message.Root
                  key={error.message}
                  valence='error'
                  className='mlb-4 overflow-auto max-bs-72'
                  data-testid='resetDialog.stackTrace'
                >
                  <pre className='text-xs'>{error.stack}</pre>
                </Message.Root>
              )}
            </>
          )}
          <div role='none' className='flex gap-2 mbs-4'>
            {showStack && (
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <Button onClick={handleCopyError}>
                    <Clipboard weight='duotone' size='1em' />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content classNames='z-[51]'>{t('copy error label')}</Tooltip.Content>
              </Tooltip.Root>
            )}
            <div role='none' className='flex-grow' />
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button variant='ghost'>{t('reset client label')}</Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content side='top' classNames='z-[51]'>
                  <DropdownMenu.Viewport>
                    <DropdownMenu.Item onClick={handleReset}>{t('reset client confirm label')}</DropdownMenu.Item>
                  </DropdownMenu.Viewport>
                  <DropdownMenu.Arrow />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            {needRefresh ? (
              <Button variant='primary' onClick={() => updateServiceWorker(true)}>
                {t('update and reload page label')}
              </Button>
            ) : (
              <Button variant='primary' onClick={() => location.reload()}>
                {t('reload page label')}
              </Button>
            )}
          </div>
        </AlertDialog.Content>
      </AlertDialog.Overlay>
    </AlertDialog.Root>
  );
};
