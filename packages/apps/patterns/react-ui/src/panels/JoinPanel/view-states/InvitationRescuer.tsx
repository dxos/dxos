//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Invitation } from '@dxos/client';
import { useTranslation } from '@dxos/react-components';

import { Content, Button, Heading } from '../../Panel';
import { JoinSend, JoinState } from '../joinMachine';
import { ViewState, ViewStateProps } from './ViewState';

export interface InvitationConnectorProps extends ViewStateProps {
  Kind: 'Space' | 'Halo';
}

const InvitationActions = ({
  invitationState,
  disabled,
  joinSend,
  joinState,
  Kind
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
          <Heading className='mbs-0'>{t('connecting status label')}</Heading>
          <Content>
            <Button disabled data-testid='next'>
              <span className='grow'>{t('next label')}</span>
            </Button>
            <Button
              disabled={disabled}
              variant='ghost'
              onClick={() => joinState?.context[invitationType].invitationObservable?.cancel()}
              data-testid='invitation-rescuer-cancel'
            >
              <span>{t('cancel label')}</span>
            </Button>
          </Content>
        </>
      );
    case Invitation.State.TIMEOUT:
    case Invitation.State.CANCELLED:
    case Invitation.State.ERROR:
    default:
      return (
        <>
          <Heading className='mbs-0'>
            {t(
              invitationState === Invitation.State.TIMEOUT
                ? 'timeout status label'
                : invitationState === Invitation.State.CANCELLED
                ? 'cancelled status label'
                : 'error status label'
            )}
          </Heading>
          <Content>
            <Button
              disabled={disabled}
              onClick={() => joinSend({ type: `reset${Kind}Invitation` })}
              data-testid='invitation-rescuer-reset'
            >
              <span className='grow'>{t('reset label')}</span>
            </Button>
          </Content>
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
        <Content className='mbs-0'>
          <Button
            disabled={disabled}
            data-autofocus={`inputting${Kind}InvitationCode`}
            data-testid='invitation-rescuer-blank-reset'
            onClick={() => joinSend({ type: `reset${Kind}Invitation` })}
          >
            <span className='grow'>{t('reset label')}</span>
          </Button>
        </Content>
      ) : (
        <InvitationActions {...{ invitationState, disabled, joinSend, joinState, Kind }} />
      )}
    </ViewState>
  );
};
