//
// Copyright 2023 DXOS.org
//

import { ArrowsClockwise, CaretLeft, CaretRight } from '@phosphor-icons/react';
import React from 'react';

import { useTranslation } from '@dxos/aurora';
import { descriptionText, getSize } from '@dxos/aurora-theme';
import { Invitation } from '@dxos/react-client/invitations';

import { PanelAction, PanelActions, PanelStepHeading } from '../../../components';
import { JoinStepProps } from '../JoinPanelProps';

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
          <PanelStepHeading className={descriptionText}>{t('connecting status label')}</PanelStepHeading>
          <div role='none' className='grow' />
          <PanelActions>
            <PanelAction aria-label={t('next label')} disabled classNames='order-2' data-testid='next'>
              <CaretRight weight='light' className={getSize(6)} />
            </PanelAction>
            <PanelAction
              aria-label={t('cancel label')}
              disabled={!active}
              onClick={onInvitationCancel}
              data-testid='invitation-rescuer-cancel'
            >
              <CaretLeft weight='light' className={getSize(6)} />
            </PanelAction>
          </PanelActions>
        </>
      );
    case Invitation.State.TIMEOUT:
    case Invitation.State.CANCELLED:
    case Invitation.State.ERROR:
    default:
      return (
        <>
          <PanelStepHeading className={descriptionText}>
            {t(
              invitationState === Invitation.State.TIMEOUT
                ? 'timeout status label'
                : invitationState === Invitation.State.CANCELLED
                ? 'cancelled status label'
                : 'error status label',
            )}
          </PanelStepHeading>
          <div role='none' className='grow' />
          <PanelActions>
            <PanelAction
              aria-label={t('reset label')}
              disabled={!active}
              onClick={() => send({ type: `reset${Kind}Invitation` })}
              data-testid='invitation-rescuer-reset'
            >
              <ArrowsClockwise weight='light' className={getSize(6)} />
            </PanelAction>
          </PanelActions>
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
          <div role='none' className='grow' />
          <PanelActions>
            <PanelAction
              aria-label={t('reset label')}
              disabled={!active}
              onClick={() => send({ type: `reset${Kind}Invitation` })}
              data-testid='invitation-rescuer-blank-reset'
            >
              <ArrowsClockwise weight='light' className={getSize(6)} />
            </PanelAction>
          </PanelActions>
        </>
      ) : (
        <InvitationActions {...props} />
      )}
    </>
  );
};
