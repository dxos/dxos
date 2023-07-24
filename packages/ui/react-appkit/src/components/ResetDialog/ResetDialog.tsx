//
// Copyright 2022 DXOS.org
//

import { Clipboard } from '@phosphor-icons/react';
import React, { useCallback } from 'react';

import { Button, Message, useTranslation, DropdownMenu } from '@dxos/aurora';
import { Config, DEFAULT_CLIENT_ORIGIN } from '@dxos/react-client';
import { getAsyncValue, Provider } from '@dxos/util';

import { Dialog, DialogProps } from '../Dialog';
import { Tooltip } from '../Tooltip';

// TODO(burdon): Factor out.
const parseError = (error: Error) => {
  const message = String(error); // Error.name + Error.message

  let stack = String(error?.stack);
  if (stack.indexOf(message) === 0) {
    stack = stack.substr(message.length).trim();
  }

  // Removes indents.
  stack = stack
    .split('\n')
    .map((text) => text.trim())
    .join('\n');

  return { message, stack };
};

export type FatalErrorProps = Pick<DialogProps, 'defaultOpen' | 'open' | 'onOpenChange'> & {
  error?: Error;
  errors?: Error[];
  config?: Config | Provider<Promise<Config>>;
  isDev?: boolean;
};

export const ResetDialog = ({
  error,
  errors: propsErrors,
  config: configProvider,
  isDev = false,
  defaultOpen,
  open,
  onOpenChange,
}: FatalErrorProps) => {
  const { t } = useTranslation('appkit');

  const errors = [...(error ? [error] : []), ...(propsErrors || [])].map(parseError);

  const onCopyError = useCallback(() => {
    void navigator.clipboard.writeText(JSON.stringify(errors));
  }, [error, propsErrors]);

  // TODO(burdon): Make responsive (full page mobile).
  return (
    <Dialog
      title={t(errors.length > 0 ? 'fatal error label' : 'reset dialog label', { count: errors.length })}
      slots={{ content: { classNames: 'block' } }}
      {...(typeof defaultOpen === 'undefined' && typeof open === 'undefined' && typeof onOpenChange === 'undefined'
        ? { defaultOpen: true }
        : { defaultOpen, open, onOpenChange })}
    >
      {isDev && errors.length > 0 ? (
        errors.map(({ message, stack }, index) => (
          <Message.Root key={`${index}--${message}`} valence='error' className='mlb-4 overflow-auto max-bs-72'>
            <Message.Title>{message}</Message.Title>
            <pre className='text-xs'>{stack}</pre>
          </Message.Root>
        ))
      ) : (
        <p>{t(errors.length > 0 ? 'fatal error message' : 'reset dialog message')}</p>
      )}
      <div role='none' className='flex gap-2 mbs-4'>
        {errors.length > 0 && (
          <Tooltip content={t('copy error label')} zIndex='z-[51]'>
            <Button onClick={onCopyError}>
              <Clipboard weight='duotone' size='1em' />
            </Button>
          </Tooltip>
        )}
        <div role='none' className='flex-grow' />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant='ghost'>{t('reset client label')}</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content side='top' classNames='z-[51]'>
              <DropdownMenu.Item
                onClick={async () => {
                  // TODO(wittjosiah): This is a hack.
                  //   We should have access to client here and be able to reset over rpc even if storage is corrupted.
                  const config = await getAsyncValue(configProvider);
                  window.open(`${config?.get('runtime.client.remoteSource') ?? DEFAULT_CLIENT_ORIGIN}#reset`, '_blank');
                }}
              >
                {t('reset client confirm label')}
              </DropdownMenu.Item>
              <DropdownMenu.Arrow />
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <Button variant='primary' onClick={() => location.reload()}>
          {t('reload page label')}
        </Button>
      </div>
    </Dialog>
  );
};
