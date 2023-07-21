//
// Copyright 2023 DXOS.org
//

import { ArrowsClockwise, CaretLeft, CaretRight } from '@phosphor-icons/react';
import React from 'react';

import { Button, useTranslation } from '@dxos/aurora';
import { descriptionText, getSize, mx } from '@dxos/aurora-theme';
import { Invitation } from '@dxos/client';

import { ViewStateHeading, ViewStateProps } from './ViewState';

export interface InvitationConnectorProps extends ViewStateProps {
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
          <ViewStateHeading className={descriptionText}>{t('connecting status label')}</ViewStateHeading>
          <div role='none' className='grow' />
          <div className='flex gap-2'>
            <Button disabled classNames='grow flex items-center gap-2 pli-2 order-2' data-testid='next'>
              <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
              <span className='grow'>{t('next label')}</span>
              <CaretRight weight='bold' className={getSize(4)} />
            </Button>
            <Button
              disabled={!active}
              classNames='flex items-center gap-2 pis-2 pie-4'
              onClick={onInvitationCancel}
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
            disabled={!active}
            classNames='flex items-center gap-2 pli-2'
            onClick={() => send({ type: `reset${Kind}Invitation` })}
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

export const InvitationRescuer = (props: InvitationConnectorProps) => {
  const { Kind, invitationState, active, send } = props;
  const { t } = useTranslation('os');
  return (
    <>
      {typeof invitationState === 'undefined' ? (
        <>
          <div role='none' className='grow' />
          <Button
            disabled={!active}
            classNames='flex items-center gap-2 pli-2'
            data-autofocus={`inputting${Kind}InvitationCode`}
            data-testid='invitation-rescuer-blank-reset'
            onClick={() => send({ type: `reset${Kind}Invitation` })}
          >
            <CaretLeft weight='bold' className={mx(getSize(5), 'invisible')} />
            <span className='grow'>{t('reset label')}</span>
            <ArrowsClockwise className={getSize(5)} />
          </Button>
        </>
      ) : (
        <InvitationActions {...props} />
      )}
    </>
  );
};
