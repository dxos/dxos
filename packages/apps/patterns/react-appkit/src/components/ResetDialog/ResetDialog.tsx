//
// Copyright 2022 DXOS.org
//

import { Clipboard } from '@phosphor-icons/react';
import React, { useCallback } from 'react';

import {
  Alert,
  Button,
  Dialog,
  DialogProps,
  DropdownMenu,
  DropdownMenuItem,
  useTranslation
} from '@dxos/react-components';

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
  isDev?: boolean;
};

export const ResetDialog = ({
  error,
  errors: propsErrors,
  isDev = process.env.NODE_ENV === 'development',
  defaultOpen,
  open,
  onOpenChange
}: FatalErrorProps) => {
  const { t } = useTranslation('appkit');

  const errors = [...(error ? [error] : []), ...(propsErrors || [])].map(parseError);

  const onCopyError = useCallback(() => {
    void navigator.clipboard.writeText(JSON.stringify(errors));
  }, [error, propsErrors]);

  // TODO(burdon): Make responsive (full page mobile).
  return (
    <Dialog
      title={t(errors.length > 0 ? 'fatal error label' : 'reset dialog label')}
      slots={{ content: { className: 'block' } }}
      {...(typeof defaultOpen === 'undefined' && typeof open === 'undefined' && typeof onOpenChange === 'undefined'
        ? { defaultOpen: true }
        : { defaultOpen, open, onOpenChange })}
    >
      {isDev && errors.length > 0 ? (
        errors.map(({ message, stack }, index) => (
          <Alert
            key={`${index}--${message}`}
            title={message}
            valence={'error'}
            slots={{ root: { className: 'mlb-4 overflow-auto max-bs-72' } }}
          >
            <pre className='text-xs'>{stack}</pre>
          </Alert>
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
        <DropdownMenu
          trigger={<Button variant='ghost'>{t('reset client label')}</Button>}
          slots={{ content: { side: 'top', className: 'z-[51]' } }}
        >
          <DropdownMenuItem
            onClick={() => {
              // TODO(wittjosiah): How do we get access to Client here so that we can trigger reset?
              console.log('todo: reset');
            }}
          >
            {t('reset client confirm label')}
          </DropdownMenuItem>
        </DropdownMenu>
        <Button variant='primary' onClick={() => location.reload()}>
          {t('reload page label')}
        </Button>
      </div>
    </Dialog>
  );
};
