//
// Copyright 2023 DXOS.org
//

import { ArrowsClockwise, CaretLeft, CaretRight } from '@phosphor-icons/react';
import React from 'react';

import { AuthenticatingInvitationObservable, Invitation } from '@dxos/client';
import { useInvitationStatus } from '@dxos/react-client';
import { Button, getSize, mx, useTranslation } from '@dxos/react-components';

import { JoinSend } from '../joinMachine';
import { ViewState, ViewStateProps } from './ViewState';

export interface InvitationConnectorProps extends ViewStateProps {
  Domain: 'Space' | 'Halo';
}

const InvitationActions = ({
  activeInvitation,
  disabled,
  joinSend,
  Domain
}: {
  activeInvitation: AuthenticatingInvitationObservable;
  disabled?: boolean;
  joinSend: JoinSend;
  Domain: InvitationConnectorProps['Domain'];
}) => {
  const { status, cancel } = useInvitationStatus(activeInvitation);
  const { t } = useTranslation('os');

  switch (status) {
    case Invitation.State.CONNECTING:
      return (
        <>
          <div role='none' className='grow' />
          <div className='flex gap-2'>
            <Button disabled className='grow flex items-center gap-2 pli-2 order-2' data-testid='next'>
              <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
              <span className='grow'>{t('next label')}</span>
              <CaretRight weight='bold' className={getSize(4)} />
            </Button>
            <Button
              disabled={disabled}
              className='flex items-center gap-2 pis-2 pie-4'
              onClick={cancel}
              data-autofocus={`${Domain.toLowerCase()} invitation acceptor; invitation rescuer`}
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
        <Button
          disabled={disabled}
          className='grow flex items-center gap-2 pli-2'
          onClick={() => joinSend({ type: `reset${Domain}Invitation` })}
          data-autofocus={`${Domain.toLowerCase()} invitation acceptor; invitation rescuer`}
          data-testid='invitation-rescuer-reset'
        >
          <CaretLeft weight='bold' className={mx(getSize(5), 'invisible')} />
          <span className='grow'>{t('reset label')}</span>
          <ArrowsClockwise weight='bold' className={getSize(5)} />
        </Button>
      );
  }
};

export const InvitationRescuer = ({ Domain, ...viewStateProps }: InvitationConnectorProps) => {
  const disabled = !viewStateProps.active;
  const { joinSend, joinState } = viewStateProps;
  const activeInvitation = joinState?.context[Domain.toLowerCase() as 'space' | 'halo'].invitation;
  const { t } = useTranslation('os');
  return (
    <ViewState {...viewStateProps}>
      {activeInvitation === true || !activeInvitation ? (
        <Button
          disabled={disabled}
          className='grow flex items-center gap-2 pli-2'
          data-autofocus={`inputting${Domain}InvitationCode`}
          data-testid='invitation-rescuer-connect'
        >
          <CaretLeft weight='bold' className={mx(getSize(5), 'invisible')} />
          <span className='grow'>{t('connect label')}</span>
          <ArrowsClockwise weight='bold' className={getSize(5)} />
        </Button>
      ) : (
        <InvitationActions {...{ activeInvitation, disabled, joinSend, Domain }} />
      )}
    </ViewState>
  );
};
