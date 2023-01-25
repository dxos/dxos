//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from 'phosphor-react';
import React from 'react';

import type { Profile } from '@dxos/client';
import { Avatar, Button, getSize, mx, useTranslation } from '@dxos/react-components';

import { ViewState, ViewStateHeading, ViewStateProps } from './ViewState';

export interface IdentityAddedProps extends ViewStateProps {
  addedIdentity?: Profile;
}

export const IdentityAdded = ({ addedIdentity, ...viewStateProps }: IdentityAddedProps) => {
  const disabled = !viewStateProps.active;
  const { dispatch } = viewStateProps;
  const { t } = useTranslation('os');

  return (
    <ViewState {...viewStateProps}>
      <ViewStateHeading>{t('identity added label')}</ViewStateHeading>
      <div role='none' className='grow flex flex-col items-center justify-center text-center gap-2'>
        <Avatar
          size={20}
          fallbackValue={addedIdentity?.identityKey.toHex() ?? ''}
          label={
            <p className={mx(!addedIdentity?.displayName && 'font-mono')}>
              {addedIdentity?.displayName ?? addedIdentity?.identityKey.truncate() ?? ' '}
            </p>
          }
          variant='circle'
          status='active'
        />
      </div>
      <div className='flex gap-2'>
        <Button
          disabled={disabled}
          className='grow flex items-center gap-2 pli-2 order-2'
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
        <Button
          disabled={disabled}
          onClick={() => dispatch({ type: 'deselect identity' })}
          className='flex items-center gap-2 pis-2 pie-4'
        >
          <CaretLeft weight='bold' className={getSize(4)} />
          <span>{t('deselect identity label')}</span>
        </Button>
      </div>
    </ViewState>
  );
};
