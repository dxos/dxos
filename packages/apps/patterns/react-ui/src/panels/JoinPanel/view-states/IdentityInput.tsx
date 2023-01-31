//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from 'phosphor-react';
import React, { ComponentPropsWithoutRef, useState } from 'react';

import { useClient } from '@dxos/react-client';
import { Button, getSize, Input, mx, useTranslation } from '@dxos/react-components';

import { ViewState, ViewStateHeading, ViewStateProps } from './ViewState';

export interface IdentityCreatorProps extends ViewStateProps {
  method: 'recover identity' | 'create identity';
}

export const IdentityInput = ({ method, ...viewStateProps }: IdentityCreatorProps) => {
  const disabled = !viewStateProps.active;
  const { dispatch } = viewStateProps;
  const { t } = useTranslation('os');
  const [inputValue, setInputValue] = useState('');
  const client = useClient();
  const [validationMessage, setValidationMessage] = useState('');
  const isRecover = method === 'recover identity';
  const handleNext = () => {
    void client.halo.createProfile({ [isRecover ? 'seedphrase' : 'displayName']: inputValue }).then(
      (identity) => {
        dispatch({ type: 'added identity', identity });
      },
      (_error) => {
        setValidationMessage(t(isRecover ? 'failed to recover identity message' : 'failed to create identity message'));
      }
    );
  };
  return (
    <ViewState {...viewStateProps}>
      <Input
        disabled={disabled}
        label={
          <ViewStateHeading>
            {t(isRecover ? 'recover identity input label' : 'new identity input label')}
          </ViewStateHeading>
        }
        onChange={(value) => setInputValue(value)}
        slots={{
          root: { className: 'm-0' },
          input: {
            'data-autofocus': isRecover ? 'identity input; recover identity' : 'identity input; create identity',
            onKeyUp: ({ key }) => key === 'Enter' && handleNext()
          } as ComponentPropsWithoutRef<'input'>
        }}
        {...(validationMessage.length && { validationValence: 'error', validationMessage })}
      />
      <div role='none' className='grow' />
      <div className='flex gap-2'>
        <Button disabled={disabled} className='grow flex items-center gap-2 pli-2 order-2' onClick={handleNext}>
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
