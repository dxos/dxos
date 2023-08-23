//
// Copyright 2023 DXOS.org
//

import React, { cloneElement } from 'react';

import { useTranslation } from '@dxos/aurora';

import { PanelActions } from '../../../components';
import { LargeButton } from '../../../components/Panel/LargeButton';
import { JoinStepProps } from '../JoinPanelProps';

export interface InvitationAcceptedProps extends JoinStepProps {
  Kind: 'Space' | 'Halo';
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: () => void;
}

export const InvitationAccepted = (props: InvitationAcceptedProps) => {
  // const { active, Kind, doneActionParent, onDone } = props;
  const { doneActionParent } = props;
  // const disabled = !active;
  const { t } = useTranslation('os');

  const doneAction = (
    // <PanelAction
    //   aria-label={t('done label')}
    //   onClick={onDone}
    //   disabled={disabled}
    //   data-autofocus={`success${Kind}Invitation finishingJoining${Kind}`}
    //   data-testid={`${Kind.toLowerCase()}-invitation-accepted-done`}
    // >
    //   <Check weight='light' className={getSize(6)} />
    // </PanelAction>
    <LargeButton variant='primary'>Continue</LargeButton>
  );

  return (
    <>
      <div role='none' className='grow flex flex-col justify-center'>
        <p className='text-center text-sm font-system-normal'>{t('welcome message')}</p>
      </div>
      <PanelActions>{doneActionParent ? cloneElement(doneActionParent, {}, doneAction) : doneAction}</PanelActions>
    </>
  );
};
