//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from 'phosphor-react';
import React, { ComponentPropsWithoutRef, useState } from 'react';

import { InvitationEncoder } from '@dxos/client';
import { useClient } from '@dxos/react-client';
import { Button, getSize, Input, mx, useTranslation } from '@dxos/react-components';

import { ViewState, ViewStateHeading, ViewStateProps } from './ViewState';

export interface InvitationInputProps extends ViewStateProps {
  invitationType: 'space' | 'halo';
}

export const InvitationInput = ({ invitationType, ...viewStateProps }: InvitationInputProps) => {
  const client = useClient();
  const disabled = !viewStateProps.active;
  const { dispatch } = viewStateProps;
  const { t } = useTranslation('os');

  const [inputValue, setInputValue] = useState('');

  const handleNext = () =>
    dispatch({
      type: 'connecting invitation',
      from: invitationType,
      invitation: client[invitationType === 'halo' ? 'halo' : 'echo'].acceptInvitation(
        InvitationEncoder.decode(inputValue)
      )
    });

  return (
    <ViewState {...viewStateProps}>
      <Input
        disabled={disabled}
        label={<ViewStateHeading>{t('invitation input label')}</ViewStateHeading>}
        onChange={({ target: { value } }) => setInputValue(value)}
        slots={{
          root: { className: 'm-0' },
          label: { className: 'sr-only' },
          input: {
            'data-autofocus': `${invitationType} invitation acceptor; invitation input`,
            onKeyUp: ({ key }) => key === 'Enter' && handleNext()
          } as ComponentPropsWithoutRef<'input'>
        }}
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
