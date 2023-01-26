//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from 'phosphor-react';
import React, { ComponentPropsWithoutRef, useState } from 'react';

import { useClient } from '@dxos/react-client';
import { Button, getSize, Input, mx, useTranslation } from '@dxos/react-components';

import { ViewState, ViewStateHeading, ViewStateProps } from './ViewState';

export const IdentityCreator = (viewStateProps: ViewStateProps) => {
  const disabled = !viewStateProps.active;
  const { dispatch } = viewStateProps;
  const { t } = useTranslation('os');
  const [displayName, setDisplayName] = useState('');
  const client = useClient();
  const [validationMessage, setValidationMessage] = useState('');
  const handleCreate = () => {
    void client.halo.createProfile({ displayName }).then(
      (identity) => {
        dispatch({ type: 'added identity', identity });
      },
      (_error) => {
        setValidationMessage(t('failed to create identity message'));
      }
    );
  };
  return (
    <ViewState {...viewStateProps}>
      <Input
        disabled={disabled}
        label={<ViewStateHeading>{t('new identity input label')}</ViewStateHeading>}
        onChange={(value) => setDisplayName(value)}
        slots={{
          root: { className: 'm-0' },
          input: {
            'data-autofocus': 'identity creator; create identity',
            onKeyUp: ({ key }) => key === 'Enter' && handleCreate()
          } as ComponentPropsWithoutRef<'input'>
        }}
        {...(validationMessage.length && { validationValence: 'error', validationMessage })}
      />
      <div role='none' className='grow' />
      <div className='flex gap-2'>
        <Button disabled={disabled} className='grow flex items-center gap-2 pli-2 order-2' onClick={handleCreate}>
          <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
          <span className='grow'>{t('continue label')}</span>
          <CaretRight weight='bold' className={getSize(4)} />
        </Button>
        <Button
          disabled={disabled}
          onClick={() => dispatch({ type: 'add identity' })}
          className='flex items-center gap-2 pis-2 pie-4'
        >
          <CaretLeft weight='bold' className={getSize(4)} />
          <span>{t('back label')}</span>
        </Button>
      </div>
    </ViewState>
  );
};
