//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from 'phosphor-react';
import React from 'react';

import { Button, getSize, Input, mx, useTranslation } from '@dxos/react-components';

import { ViewState, ViewStateProps } from './ViewState';

export const InvitationAuthenticator = (viewStateProps: ViewStateProps) => {
  const disabled = !viewStateProps.active;
  // const { dispatch, activeInvitation } = viewStateProps;
  const { t } = useTranslation('os');
  return (
    <ViewState {...viewStateProps}>
      <div role='none' className='grow' />
      <Input label='doop' size='pin' />
      <div className='flex gap-2'>
        <Button disabled className='grow flex items-center gap-2 pli-2 order-2'>
          <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
          <span className='grow'>{t('next label')}</span>
          <CaretRight weight='bold' className={getSize(4)} />
        </Button>
        <Button disabled={disabled} className='flex items-center gap-2 pis-2 pie-4'>
          <CaretLeft weight='bold' className={getSize(4)} />
          <span>{t('cancel label')}</span>
        </Button>
      </div>
    </ViewState>
  );
};
