//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight, Plus, QrCode, Textbox } from 'phosphor-react';
import React from 'react';

import { Button, CompoundButton, getSize, mx, useTranslation } from '@dxos/react-components';

import { JoinDispatch, Profile } from '../JoinPanelProps';
import { ViewState, ViewStateProps } from './ViewState';

export interface AdditionMethodSelectorProps extends ViewStateProps {
  dispatch: JoinDispatch;
  availableIdentities: Profile[];
}

export const AdditionMethodSelector = ({
  dispatch,
  availableIdentities,
  ...viewStateProps
}: AdditionMethodSelectorProps) => {
  const disabled = !viewStateProps.active;
  const { t } = useTranslation('os');
  return (
    <ViewState {...viewStateProps}>
      <h2 className='font-system-medium text-sm'>{t('addition method selector title')}</h2>
      <CompoundButton
        description={t('create identity description')}
        before={<Plus className={getSize(6)} />}
        after={<CaretRight className={getSize(4)} weight='bold' />}
        disabled={disabled}
        onClick={() => dispatch({ type: 'select addition method', method: 'create identity' })}
      >
        {t('create identity label')}
      </CompoundButton>
      <CompoundButton
        description={t('join identity description')}
        before={<QrCode className={getSize(6)} />}
        after={<CaretRight className={getSize(4)} weight='bold' />}
        disabled={disabled}
        onClick={() => dispatch({ type: 'select addition method', method: 'accept device invitation' })}
      >
        {t('join identity label')}
      </CompoundButton>
      <CompoundButton
        description={t('recover identity description')}
        before={<Textbox className={getSize(6)} />}
        after={<CaretRight className={getSize(4)} weight='bold' />}
        disabled={disabled}
        onClick={() => dispatch({ type: 'select addition method', method: 'restore identity' })}
      >
        {t('recover identity label')}
      </CompoundButton>
      <div role='none' className='grow' />
      {availableIdentities.length && (
        <Button disabled={disabled} onClick={() => dispatch({ type: 'deselect identity' })}>
          <CaretLeft className={getSize(4)} weight='bold' />
          <span className='grow'>{t('deselect identity label')}</span>
          <CaretRight className={mx(getSize(4), 'invisible')} weight='bold' />
        </Button>
      )}
    </ViewState>
  );
};
