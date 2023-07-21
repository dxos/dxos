//
// Copyright 2023 DXOS.org
//

import { CaretRight, Plus, QrCode, Textbox } from '@phosphor-icons/react';
import React from 'react';

import { useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { CompoundButton } from '@dxos/react-appkit';

import { PanelStepHeading } from '../../../components';
import { JoinStepProps } from '../JoinPanelProps';

export type AdditionMethodSelectorProps = JoinStepProps;

export const AdditionMethodSelector = (viewStateProps: AdditionMethodSelectorProps) => {
  const disabled = !viewStateProps.active;
  const { send } = viewStateProps;

  const { t } = useTranslation('os');

  const sharedButtonProps = {
    disabled,
    after: <CaretRight className={getSize(4)} weight='bold' />,
    slots: { label: { className: 'text-sm' } },
  };

  return (
    <>
      <PanelStepHeading>{t('addition method selector title')}</PanelStepHeading>
      <div role='none' className='flex flex-col gap-1 grow'>
        <CompoundButton
          {...sharedButtonProps}
          description={t('create identity description')}
          before={<Plus className={getSize(6)} />}
          onClick={() => send({ type: 'createIdentity' })}
          data-autofocus='choosingAuthMethod'
          data-testid='create-identity'
        >
          {t('create identity label')}
        </CompoundButton>
        <CompoundButton
          {...sharedButtonProps}
          description={t('join identity description')}
          before={<QrCode className={getSize(6)} />}
          onClick={() => send({ type: 'acceptHaloInvitation' })}
          data-testid='join-identity'
        >
          {t('join identity label')}
        </CompoundButton>
        <CompoundButton
          {...sharedButtonProps}
          // TODO(mykola): Implement recover.
          disabled={true}
          description={t('recover identity description')}
          before={<Textbox className={getSize(6)} />}
          onClick={() => send({ type: 'recoverIdentity' })}
          data-testid='recover-identity'
        >
          {t('recover identity label')}
        </CompoundButton>
      </div>
    </>
  );
};
