//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Invitation } from '@dxos/react-client/invitations';
import { useTranslation } from '@dxos/react-ui';
import { descriptionText } from '@dxos/ui-theme';

import { Action, Actions, StepHeading } from '../../../components';
import { type FailReason } from '../../../types';
import { type JoinStepProps } from '../JoinPanelProps';

export interface InvitationRescuerProps extends JoinStepProps {
  Kind: 'Space' | 'Halo';
  invitationState?: Invitation.State;
  onInvitationCancel?: () => Promise<void> | undefined;
  failReason?: FailReason | null;
}

const InvitationActions = ({
  // `invitationState` does report correct state, but here we evaluate whether `failReason` is a better source of truth
  // for the UI in particular.
  invitationState,
  onInvitationCancel,
  active,
  send,
  Kind,
  failReason,
}: InvitationRescuerProps) => {
  const { t } = useTranslation('os');

  if (failReason) {
    return (
      <>
        <StepHeading className={descriptionText}>
          {t(
            failReason === 'timeout'
              ? 'timeout status label'
              : failReason === 'cancelled'
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
  } else {
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
  }
};

export const InvitationRescuer = (props: InvitationRescuerProps) => {
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
