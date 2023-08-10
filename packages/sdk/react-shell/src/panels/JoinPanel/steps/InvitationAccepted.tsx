//
// Copyright 2023 DXOS.org
//

import { Check } from '@phosphor-icons/react';
import React, { cloneElement } from 'react';

import { useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';

import { PanelAction, PanelActions } from '../../../components';
import { JoinStepProps } from '../JoinPanelProps';

export interface InvitationAcceptedProps extends JoinStepProps {
  Kind: 'Space' | 'Halo';
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: () => void;
}

export const InvitationAccepted = (props: InvitationAcceptedProps) => {
  const { active, Kind, doneActionParent, onDone } = props;

  const disabled = !active;
  const { t } = useTranslation('os');

  const doneAction = (
    <PanelAction
      aria-label={t('done label')}
      onClick={onDone}
      disabled={disabled}
      data-autofocus={`success${Kind}Invitation finishingJoining${Kind}`}
      data-testid={`${Kind.toLowerCase()}-invitation-accepted-done`}
    >
      <Check weight='light' className={getSize(6)} />
    </PanelAction>
  );

  return (
    <>
      <p className='text-center text-sm font-system-normal'>{t('welcome message')}</p>
      <div role='none' className='grow' />
      <PanelActions>{doneActionParent ? cloneElement(doneActionParent, {}, doneAction) : doneAction}</PanelActions>
    </>
  );
};
