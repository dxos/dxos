//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight, Plus, QrCode, Textbox } from 'phosphor-react';
import React from 'react';

import { Button, CompoundButton, getSize, mx, useTranslation } from '@dxos/react-components';

import { Profile } from '../JoinPanelProps';
import { ViewState, ViewStateHeading, ViewStateProps } from './ViewState';

export interface AdditionMethodSelectorProps extends ViewStateProps {
  availableIdentities: Profile[];
}

export const AdditionMethodSelector = ({ availableIdentities, ...viewStateProps }: AdditionMethodSelectorProps) => {
  const disabled = !viewStateProps.active;
  const { dispatch } = viewStateProps;

  const { t } = useTranslation('os');

  return (
    <ViewState {...viewStateProps}>
      <ViewStateHeading>{t('addition method selector title')}</ViewStateHeading>
      <div role='none' className='flex flex-col gap-1 grow'>
        <CompoundButton
          description={t('create identity description')}
          before={<Plus className={getSize(6)} />}
          after={<CaretRight className={getSize(4)} weight='bold' />}
          disabled={disabled}
          onClick={() => dispatch({ type: 'select addition method', method: 'create identity' })}
          data-autofocus='addition method selector'
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
      </div>
      <Button
        disabled={disabled || availableIdentities.length < 1}
        onClick={() => dispatch({ type: 'deselect identity' })}
      >
        <CaretLeft className={getSize(4)} weight='bold' />
        <span className='grow'>{t('deselect identity label')}</span>
        <CaretRight className={mx(getSize(4), 'invisible')} weight='bold' />
      </Button>
    </ViewState>
  );
};
