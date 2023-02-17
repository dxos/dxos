//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight, Plus, QrCode, Textbox } from 'phosphor-react';
import React from 'react';

import type { Profile } from '@dxos/client';
import { Button, CompoundButton, getSize, mx, useTranslation } from '@dxos/react-components';

import { ViewState, ViewStateHeading, ViewStateProps } from './ViewState';

export interface AdditionMethodSelectorProps extends ViewStateProps {
  availableIdentities: Profile[];
}

export const AdditionMethodSelector = ({ availableIdentities, ...viewStateProps }: AdditionMethodSelectorProps) => {
  const disabled = !viewStateProps.active;
  const { dispatch } = viewStateProps;

  const { t } = useTranslation('os');

  const sharedButtonProps = {
    disabled,
    after: <CaretRight className={getSize(4)} weight='bold' />,
    slots: { label: { className: 'text-sm' } }
  };

  return (
    <ViewState {...viewStateProps}>
      <ViewStateHeading>{t('addition method selector title')}</ViewStateHeading>
      <div role='none' className='flex flex-col gap-1 grow'>
        <CompoundButton
          {...sharedButtonProps}
          description={t('create identity description')}
          before={<Plus className={getSize(6)} />}
          onClick={() => dispatch({ type: 'select addition method', method: 'create identity' })}
          data-autofocus='addition method selector'
          data-testid='create-identity'
        >
          {t('create identity label')}
        </CompoundButton>
        <CompoundButton
          {...sharedButtonProps}
          description={t('join identity description')}
          before={<QrCode className={getSize(6)} />}
          onClick={() => dispatch({ type: 'select addition method', method: 'accept device invitation' })}
          data-testid='join-identity'
        >
          {t('join identity label')}
        </CompoundButton>
        <CompoundButton
          {...sharedButtonProps}
          description={t('recover identity description')}
          before={<Textbox className={getSize(6)} />}
          onClick={() => dispatch({ type: 'select addition method', method: 'recover identity' })}
          data-testid='recover-identity'
        >
          {t('recover identity label')}
        </CompoundButton>
      </div>
      <Button
        disabled={disabled || availableIdentities.length < 1}
        onClick={() => dispatch({ type: 'deselect identity' })}
        data-testid='deselect-identity'
      >
        <CaretLeft className={getSize(4)} weight='bold' />
        <span className='grow'>{t('deselect identity label')}</span>
        <CaretRight className={mx(getSize(4), 'invisible')} weight='bold' />
      </Button>
    </ViewState>
  );
};
