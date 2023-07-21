//
// Copyright 2023 DXOS.org
//

import { ArrowsClockwise, CaretLeft, CaretRight } from '@phosphor-icons/react';
import React from 'react';

import { Button, useTranslation } from '@dxos/aurora';
import { descriptionText, getSize, mx } from '@dxos/aurora-theme';
import { Invitation } from '@dxos/react-client/invitations';

import { JoinSend, JoinState } from '../joinMachine';
import { ViewState, ViewStateHeading, ViewStateProps } from './ViewState';

export interface InvitationConnectorProps extends ViewStateProps {
  Kind: 'Space' | 'Halo';
}

const InvitationActions = ({
  invitationState,
  disabled,
  joinSend,
  joinState,
  Kind,
}: {
  invitationState?: Invitation.State;
  disabled?: boolean;
  joinSend: JoinSend;
  joinState?: JoinState;
  Kind: InvitationConnectorProps['Kind'];
}) => {
  const { t } = useTranslation('os');
  const invitationType = Kind.toLowerCase() as 'space' | 'halo';
  switch (invitationState) {
    case Invitation.State.CONNECTING:
      return (
        <>
          <ViewStateHeading className={descriptionText}>{t('connecting status label')}</ViewStateHeading>
          <div role='none' className='grow' />
          <div className='flex gap-2'>
            <Button disabled classNames='grow flex items-center gap-2 pli-2 order-2' data-testid='next'>
              <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
              <span className='grow'>{t('next label')}</span>
              <CaretRight weight='bold' className={getSize(4)} />
            </Button>
            <Button
              disabled={disabled}
              classNames='flex items-center gap-2 pis-2 pie-4'
              onClick={() => joinState?.context[invitationType].invitationObservable?.cancel()}
              data-testid='invitation-rescuer-cancel'
            >
              <CaretLeft weight='bold' className={getSize(4)} />
              <span>{t('cancel label')}</span>
            </Button>
          </div>
        </>
      );
    case Invitation.State.TIMEOUT:
    case Invitation.State.CANCELLED:
    case Invitation.State.ERROR:
    default:
      return (
        <>
          <ViewStateHeading className={descriptionText}>
            {t(
              invitationState === Invitation.State.TIMEOUT
                ? 'timeout status label'
                : invitationState === Invitation.State.CANCELLED
                ? 'cancelled status label'
                : 'error status label',
            )}
          </ViewStateHeading>
          <div role='none' className='grow' />
          <Button
            disabled={disabled}
            classNames='flex items-center gap-2 pli-2'
            onClick={() => joinSend({ type: `reset${Kind}Invitation` })}
            data-testid='invitation-rescuer-reset'
          >
            <CaretLeft weight='bold' className={mx(getSize(5), 'invisible')} />
            <span className='grow'>{t('reset label')}</span>
            <ArrowsClockwise className={getSize(4)} />
          </Button>
        </>
      );
  }
};

export const InvitationRescuer = ({ Kind, ...viewStateProps }: InvitationConnectorProps) => {
  const disabled = !viewStateProps.active;
  const { joinSend, joinState } = viewStateProps;
  const invitationState = joinState?.context[Kind.toLowerCase() as 'space' | 'halo'].invitation?.state;
  const { t } = useTranslation('os');
  return (
    <ViewState {...viewStateProps}>
      {typeof invitationState === 'undefined' ? (
        <>
          <div role='none' className='grow' />
          <Button
            disabled={disabled}
            classNames='flex items-center gap-2 pli-2'
            data-autofocus={`inputting${Kind}InvitationCode`}
            data-testid='invitation-rescuer-blank-reset'
            onClick={() => joinSend({ type: `reset${Kind}Invitation` })}
          >
            <CaretLeft weight='bold' className={mx(getSize(5), 'invisible')} />
            <span className='grow'>{t('reset label')}</span>
            <ArrowsClockwise className={getSize(5)} />
          </Button>
        </>
      ) : (
        <InvitationActions {...{ invitationState, disabled, joinSend, joinState, Kind }} />
      )}
    </ViewState>
  );
};
