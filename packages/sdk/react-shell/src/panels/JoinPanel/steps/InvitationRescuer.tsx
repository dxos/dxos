//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/aurora';
import { descriptionText } from '@dxos/aurora-theme';
import { Invitation } from '@dxos/react-client/invitations';

import { Action, Actions, StepHeading } from '../../../components';
import { type JoinStepProps } from '../JoinPanelProps';

export interface InvitationConnectorProps extends JoinStepProps {
  Kind: 'Space' | 'Halo';
  invitationState?: Invitation.State;
  onInvitationCancel?: () => Promise<void> | undefined;
}

const InvitationActions = ({ invitationState, onInvitationCancel, active, send, Kind }: InvitationConnectorProps) => {
  const { t } = useTranslation('os');
  switch (invitationState) {
    case Invitation.State.CONNECTING:
      return (
        <>
          <StepHeading className={descriptionText}>{t('connecting status label')}</StepHeading>
          <div role='none' className='grow' />
          <Actions>
            <Action disabled classNames='order-2' data-testid='next'>
              {t('next label')}
            </Action>
            <Action disabled={!active} onClick={onInvitationCancel} data-testid='invitation-rescuer-cancel'>
              {t('cancel label')}
            </Action>
          </Actions>
        </>
      );
    case Invitation.State.TIMEOUT:
    case Invitation.State.CANCELLED:
    case Invitation.State.ERROR:
    default:
      return (
        <>
          <StepHeading className={descriptionText}>
            {t(
              invitationState === Invitation.State.TIMEOUT
                ? 'timeout status label'
                : invitationState === Invitation.State.CANCELLED
                ? 'cancelled status label'
                : 'error status label',
            )}
          </StepHeading>
          <div role='none' className='grow' />
          <Actions>
            <Action
              disabled={!active}
              onClick={() => send({ type: `reset${Kind}Invitation` })}
              data-testid='invitation-rescuer-reset'
            >
              {t('reset label')}
            </Action>
          </Actions>
        </>
      );
  }
};

export const InvitationRescuer = (props: InvitationConnectorProps) => {
  const { Kind, invitationState, active, send } = props;
  const { t } = useTranslation('os');
  return (
    <>
      {typeof invitationState === 'undefined' ? (
        <>
          <div role='none' className='grow flex flex-col justify-center'>
            <StepHeading className={descriptionText}>There was a problem joining the space</StepHeading>
          </div>
          <Actions>
            <Action
              disabled={!active}
              data-testid='invitation-rescuer-blank-reset'
              onClick={() => send({ type: `reset${Kind}Invitation` })}
            >
              {t('reset label')}
            </Action>
          </Actions>
        </>
      ) : (
        <InvitationActions {...props} />
      )}
    </>
  );
};
