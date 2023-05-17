//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { ComponentPropsWithoutRef, useState } from 'react';

import { Button, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { log } from '@dxos/log';
import { Input } from '@dxos/react-appkit';
import { useClient } from '@dxos/react-client';

import { ViewState, ViewStateHeading, ViewStateProps } from './ViewState';

export interface IdentityCreatorProps extends ViewStateProps {
  method: 'recover identity' | 'create identity';
}

export const IdentityInput = ({ method, ...viewStateProps }: IdentityCreatorProps) => {
  const disabled = !viewStateProps.active;
  const { joinSend } = viewStateProps;
  const { t } = useTranslation('os');
  const [inputValue, setInputValue] = useState('');
  const client = useClient();
  const [validationMessage, setValidationMessage] = useState('');
  const isRecover = method === 'recover identity';
  const handleNext = () => {
    void client.halo.createIdentity({ [isRecover ? 'seedphrase' : 'displayName']: inputValue }).then(
      (identity) => {
        joinSend({ type: 'selectIdentity', identity });
      },
      (error) => {
        log.catch(error);
        setValidationMessage(t(isRecover ? 'failed to recover identity message' : 'failed to create identity message'));
      },
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
        onChange={({ target: { value } }) => setInputValue(value)}
        slots={{
          root: { className: 'm-0' },
          input: {
            'data-autofocus': isRecover ? 'recoveringIdentity' : 'creatingIdentity',
            onKeyUp: ({ key }) => key === 'Enter' && handleNext(),
          } as ComponentPropsWithoutRef<'input'>,
        }}
        {...(validationMessage.length && { validationValence: 'error', validationMessage })}
        data-testid='identity-input'
      />
      <div role='none' className='grow' />
      <div className='flex gap-2'>
        <Button
          disabled={disabled}
          className='grow flex items-center gap-2 pli-2 order-2'
          onClick={handleNext}
          data-testid={`${method === 'recover identity' ? 'recover' : 'create'}-identity-input-continue`}
        >
          <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
          <span className='grow'>{t('continue label')}</span>
          <CaretRight weight='bold' className={getSize(4)} />
        </Button>
        <Button
          disabled={disabled}
          onClick={() => joinSend({ type: 'deselectAuthMethod' })}
          className='flex items-center gap-2 pis-2 pie-4'
          data-testid={`${method === 'recover identity' ? 'recover' : 'create'}-identity-input-back`}
        >
          <CaretLeft weight='bold' className={getSize(4)} />
          <span>{t('back label')}</span>
        </Button>
      </div>
    </ViewState>
  );
};
