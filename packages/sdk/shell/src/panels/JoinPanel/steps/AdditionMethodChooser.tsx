//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { CompoundButton, InputLabel } from '../../../components/index.ts';
import { translationKey } from '../../../translations.ts';
import { type JoinStepProps } from '../JoinPanelProps.ts';

export type AdditionMethodChooserProps = JoinStepProps;

export const AdditionMethodChooser = (viewStateProps: AdditionMethodChooserProps) => {
  const disabled = !viewStateProps.active;
  const { send } = viewStateProps;

  const { t } = useTranslation(translationKey);

  const sharedButtonProps = {
    disabled,
    after: <Next.Icon icon='ph--caret-right--bold' size='md' />,
    slots: { label: { className: 'text-sm' } },
  };

  return (
    <>
      <InputLabel>{t('addition-method-chooser.title')}</InputLabel>
      <div className='flex flex-col gap-1 grow'>
        <CompoundButton
          {...sharedButtonProps}
          description={t('create-identity.description')}
          before={<Next.Icon icon='ph--plus--regular' size='xl' />}
          onClick={() => send({ type: 'createIdentity' })}
          data-autofocus='choosingAuthMethod'
          data-testid='identity-chooser.create-identity'
        >
          {t('create-identity.label')}
        </CompoundButton>
        <CompoundButton
          {...sharedButtonProps}
          description={t('join-identity.description')}
          before={<Next.Icon icon='ph--qr-code--regular' size='xl' />}
          onClick={() => send({ type: 'acceptHaloInvitation' })}
          data-testid='identity-chooser.join-identity'
        >
          {t('join-identity.label')}
        </CompoundButton>
        <CompoundButton
          {...sharedButtonProps}
          description={t('recover-identity.description')}
          before={<Next.Icon icon='ph--textbox--regular' size='xl' />}
          onClick={() => send({ type: 'recoverIdentity' })}
          data-testid='identity-chooser.recover-identity'
        >
          {t('recover-identity.label')}
        </CompoundButton>
      </div>
    </>
  );
};
