//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from 'phosphor-react';
import React from 'react';

import { Profile } from '@dxos/client';
import { Avatar, Button, getSize, mx, useTranslation } from '@dxos/react-components';

import { ViewState, ViewStateProps } from './ViewState';

export interface IdentityAddedProps extends ViewStateProps {
  identity?: Profile;
}

export const IdentityAdded = ({ identity, ...viewStateProps }: IdentityAddedProps) => {
  const disabled = !viewStateProps.active;
  const { dispatch } = viewStateProps;
  const { t } = useTranslation('os');

  return (
    <ViewState {...viewStateProps}>
      <h2>{t('identity added label')}</h2>
      <div role='none' className='grow flex flex-col items-center justify-center text-center gap-2'>
        <Avatar
          size={20}
          fallbackValue={identity?.identityKey.toHex() ?? 'X'}
          label={<p>{identity?.displayName ?? 'X'}</p>}
          variant='circle'
          status='active'
        />
      </div>
      <div className='flex gap-2'>
        <Button
          disabled={disabled}
          onClick={() => dispatch({ type: 'deselect identity' })}
          className='flex items-center gap-2 pis-2 pie-4'
        >
          <CaretLeft weight='bold' className={getSize(4)} />
          <span>{t('deselect identity label')}</span>
        </Button>
        <Button
          disabled={disabled}
          className='grow flex items-center gap-2 pli-2'
          onClick={() => {
            console.log('Identity added');
            // dispatch({ type: 'added identity', identity })
          }}
          data-autofocus='identity added'
        >
          <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
          <span className='grow'>{t('continue label')}</span>
          <CaretRight weight='bold' className={getSize(4)} />
        </Button>
      </div>
    </ViewState>
  );
};
