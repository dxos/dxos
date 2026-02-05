//
// Copyright 2023 DXOS.org
//

import React, { cloneElement } from 'react';

import { useTranslation } from '@dxos/react-ui';

import { Action, Actions } from '../../../components';
import { translationKey } from '../../../translations';
import { type JoinStepProps } from '../JoinPanelProps';

export interface InvitationAcceptedProps extends JoinStepProps {
  Kind: 'Space' | 'Halo';
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: () => void;
}

export const InvitationAccepted = (props: InvitationAcceptedProps) => {
  const { active, Kind, doneActionParent, onDone } = props;
  const disabled = !active;
  const { t } = useTranslation(translationKey);

  const doneAction = (
    <Action
      variant='primary'
      onClick={onDone}
      disabled={disabled}
      data-autofocus={`success${Kind}Invitation finishingJoining${Kind}`}
      data-testid={`${Kind.toLowerCase()}-invitation-accepted-done`}
    >
      {t('done label')}
    </Action>
  );

  return (
    <>
      <div role='none' className='grow flex flex-col justify-center'>
        <p className='text-center text-sm font-normal'>{t('welcome message')}</p>
      </div>
      <Actions>{doneActionParent ? cloneElement(doneActionParent, {}, doneAction) : doneAction}</Actions>
    </>
  );
};
