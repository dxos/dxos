//
// Copyright 2023 DXOS.org
//

import { ArrowsClockwise, CaretLeft, CaretRight } from 'phosphor-react';
import React, { useCallback } from 'react';

import { CancellableInvitationObservable, Invitation } from '@dxos/client';
import { useClient, useInvitationStatus } from '@dxos/react-client';
import { Button, getSize, mx, useTranslation } from '@dxos/react-components';

import { ViewState, ViewStateProps } from './ViewState';

export interface InvitationConnectorProps extends ViewStateProps {
  invitationType: 'space' | 'halo';
}

const InvitationActions = ({
  activeInvitation,
  disabled,
  invitationType
}: {
  activeInvitation: CancellableInvitationObservable;
  disabled?: boolean;
  dispatch: ViewStateProps['dispatch'];
  invitationType: InvitationConnectorProps['invitationType'];
}) => {
  const client = useClient();
  const { status, cancel, connect } = useInvitationStatus(activeInvitation);
  const { t } = useTranslation('os');

  const connectInvitation = useCallback(() => {
    activeInvitation.invitation &&
      client[invitationType === 'halo' ? 'halo' : 'echo'].acceptInvitation(activeInvitation.invitation);
    connect(activeInvitation);
  }, [client, activeInvitation, connect, invitationType]);

  switch (status) {
    case Invitation.State.CONNECTING:
      return (
        <>
          <div role='none' className='grow' />
          <div className='flex gap-2'>
            <Button disabled className='grow flex items-center gap-2 pli-2 order-2'>
              <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
              <span className='grow'>{t('next label')}</span>
              <CaretRight weight='bold' className={getSize(4)} />
            </Button>
            <Button disabled={disabled} className='flex items-center gap-2 pis-2 pie-4' onClick={cancel}>
              <CaretLeft weight='bold' className={getSize(4)} />
              <span>{t('cancel label')}</span>
            </Button>
          </div>
        </>
      );
    case Invitation.State.TIMEOUT:
    case Invitation.State.CANCELLED:
    case Invitation.State.ERROR:
      return (
        <Button
          disabled={disabled}
          className='grow flex items-center gap-2 pli-2'
          onClick={connectInvitation}
          data-autofocus='space invitation acceptor; invitation connector'
        >
          <CaretLeft weight='bold' className={mx(getSize(5), 'invisible')} />
          <span className='grow'>{t('reconnect label')}</span>
          <ArrowsClockwise weight='bold' className={getSize(5)} />
        </Button>
      );
    default:
      return (
        <Button disabled={disabled} className='grow flex items-center gap-2 pli-2' onClick={connectInvitation}>
          <CaretLeft weight='bold' className={mx(getSize(5), 'invisible')} />
          <span className='grow'>{t('connect label')}</span>
          <CaretRight weight='bold' className={getSize(5)} />
        </Button>
      );
  }
};

export const InvitationConnector = ({ invitationType, ...viewStateProps }: InvitationConnectorProps) => {
  const disabled = !viewStateProps.active;
  const { dispatch, activeInvitation } = viewStateProps;
  const { t } = useTranslation('os');
  return (
    <ViewState {...viewStateProps}>
      {activeInvitation === true || !activeInvitation ? (
        <Button
          disabled={disabled}
          className='grow flex items-center gap-2 pli-2'
          data-autofocus='space invitation acceptor; invitation connector'
        >
          <CaretLeft weight='bold' className={mx(getSize(5), 'invisible')} />
          <span className='grow'>{t('connect label')}</span>
          <ArrowsClockwise weight='bold' className={getSize(5)} />
        </Button>
      ) : (
        <InvitationActions {...{ activeInvitation, disabled, dispatch, invitationType }} />
      )}
    </ViewState>
  );
};
