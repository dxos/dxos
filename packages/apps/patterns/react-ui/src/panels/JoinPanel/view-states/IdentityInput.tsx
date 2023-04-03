//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { ComponentPropsWithoutRef, useState } from 'react';

import { useClient } from '@dxos/react-client';
import { getSize, Input, mx, useTranslation } from '@dxos/react-components';

import { Heading, Content, Button } from '../../Panel';
import { ViewState, ViewStateProps } from './ViewState';

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
      (_error) => {
        setValidationMessage(t(isRecover ? 'failed to recover identity message' : 'failed to create identity message'));
      }
    );
  };
  return (
    <ViewState {...viewStateProps}>
      <Content className='mbs-0'>
        <Input
          disabled={disabled}
          label={
            <Heading className='mbs-0'>
              {t(isRecover ? 'recover identity input label' : 'new identity input label')}
            </Heading>
          }
          placeholder='Type here'
          onChange={({ target: { value } }) => setInputValue(value)}
          slots={{
            root: { className: 'm-0' },
            input: {
              className: 'text-center p-4',
              autoFocus: true,
              'data-autofocus': isRecover ? 'recoveringIdentity' : 'creatingIdentity',
              onKeyUp: ({ key }) => key === 'Enter' && handleNext()
            } as ComponentPropsWithoutRef<'input'>
          }}
          {...(validationMessage.length && { validationValence: 'error', validationMessage })}
          data-testid='identity-input'
        />
        <Button
          disabled={disabled}
          onClick={handleNext}
          data-testid={`${method === 'recover identity' ? 'recover' : 'create'}-identity-input-continue`}
        >
          {/* <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} /> */}
          <span className='grow'>{t('continue label')}</span>
          {/* <CaretRight weight='bold' className={getSize(4)} /> */}
        </Button>
        <Button
          variant='ghost'
          disabled={disabled}
          onClick={() => joinSend({ type: 'deselectAuthMethod' })}
          data-testid={`${method === 'recover identity' ? 'recover' : 'create'}-identity-input-back`}
        >
          {/* <CaretLeft weight='bold' className={getSize(4)} /> */}
          <span>{t('back label')}</span>
        </Button>
      </Content>
    </ViewState>
  );
};
