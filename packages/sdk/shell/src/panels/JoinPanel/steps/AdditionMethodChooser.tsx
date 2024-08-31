//
// Copyright 2023 DXOS.org
//

import { CaretRight, Plus, QrCode, Textbox } from '@phosphor-icons/react';
import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { CompoundButton, StepHeading } from '../../../components';
import { type JoinStepProps } from '../JoinPanelProps';

export type AdditionMethodChooserProps = JoinStepProps;

export const AdditionMethodChooser = (viewStateProps: AdditionMethodChooserProps) => {
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
      <StepHeading>{t('addition method chooser title')}</StepHeading>
      <div role='none' className='flex grow flex-col gap-1'>
        <CompoundButton
          {...sharedButtonProps}
          description={t('create identity description')}
          before={<Plus className={getSize(6)} />}
          onClick={() => send({ type: 'createIdentity' })}
          data-autofocus='choosingAuthMethod'
          data-testid='identity-chooser.create-identity'
        >
          {t('create identity label')}
        </CompoundButton>
        <CompoundButton
          {...sharedButtonProps}
          description={t('join identity description')}
          before={<QrCode className={getSize(6)} />}
          onClick={() => send({ type: 'acceptHaloInvitation' })}
          data-testid='identity-chooser.join-identity'
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
          data-testid='identity-chooser.recover-identity'
        >
          {t('recover identity label')}
        </CompoundButton>
      </div>
    </>
  );
};
