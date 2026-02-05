//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Icon, useTranslation } from '@dxos/react-ui';

import { CompoundButton, StepHeading } from '../../../components';
import { translationKey } from '../../../translations';
import { type JoinStepProps } from '../JoinPanelProps';

export type AdditionMethodChooserProps = JoinStepProps;

export const AdditionMethodChooser = (viewStateProps: AdditionMethodChooserProps) => {
  const disabled = !viewStateProps.active;
  const { send } = viewStateProps;

  const { t } = useTranslation(translationKey);

  const sharedButtonProps = {
    disabled,
    after: <Icon icon='ph--caret-right--bold' size={4} />,
    slots: { label: { className: 'text-sm' } },
  };

  return (
    <>
      <StepHeading>{t('addition method chooser title')}</StepHeading>
      <div role='none' className='flex flex-col gap-1 grow'>
        <CompoundButton
          {...sharedButtonProps}
          description={t('create identity description')}
          before={<Icon icon='ph--plus--regular' size={6} />}
          onClick={() => send({ type: 'createIdentity' })}
          data-autofocus='choosingAuthMethod'
          data-testid='identity-chooser.create-identity'
        >
          {t('create identity label')}
        </CompoundButton>
        <CompoundButton
          {...sharedButtonProps}
          description={t('join identity description')}
          before={<Icon icon='ph--qr-code--regular' size={6} />}
          onClick={() => send({ type: 'acceptHaloInvitation' })}
          data-testid='identity-chooser.join-identity'
        >
          {t('join identity label')}
        </CompoundButton>
        <CompoundButton
          {...sharedButtonProps}
          description={t('recover identity description')}
          before={<Icon icon='ph--textbox--regular' size={6} />}
          onClick={() => send({ type: 'recoverIdentity' })}
          data-testid='identity-chooser.recover-identity'
        >
          {t('recover identity label')}
        </CompoundButton>
      </div>
    </>
  );
};
