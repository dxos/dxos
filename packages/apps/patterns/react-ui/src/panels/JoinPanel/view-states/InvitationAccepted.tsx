//
// Copyright 2023 DXOS.org
//

import React, { cloneElement } from 'react';

import { AuthenticatingInvitationObservable } from '@dxos/client';
import { InvitationResult, useInvitationStatus } from '@dxos/react-client';
import { useTranslation } from '@dxos/react-components';

import { Content, Button, Heading } from '../../Panel';
import { ViewState, ViewStateProps } from './ViewState';

export interface InvitationAcceptedProps extends ViewStateProps {
  Kind: 'Space' | 'Halo';
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: (result: InvitationResult | null) => void;
}

const PureInvitationAcceptedContent = ({
  onDone,
  result,
  Kind,
  doneActionParent,
  active
}: InvitationAcceptedProps & { result: InvitationResult | null }) => {
  const disabled = !active;
  const { t } = useTranslation('os');

  const doneButton = (
    <Content>
      <Button
        {...(onDone && { onClick: () => onDone(result) })}
        disabled={disabled}
        data-autofocus={`success${Kind}Invitation finishingJoining${Kind}`}
        data-testid={`${Kind.toLowerCase()}-invitation-accepted-done`}
      >
        <span className='grow'>{t('done label')}</span>
      </Button>
    </Content>
  );

  return (
    <>
      <Heading>{t('welcome message')}</Heading>
      {doneActionParent ? cloneElement(doneActionParent, {}, doneButton) : doneButton}
    </>
  );
};

const InvitationAcceptedContent = (
  props: InvitationAcceptedProps & { activeInvitation: AuthenticatingInvitationObservable }
) => {
  const { result } = useInvitationStatus(props.activeInvitation);
  return <PureInvitationAcceptedContent {...props} result={result} />;
};

export const InvitationAccepted = (props: InvitationAcceptedProps) => {
  const { Kind, doneActionParent: _doneActionParent, onDone: _onDone, ...viewStateProps } = props;
  const activeInvitation =
    viewStateProps.joinState?.context[Kind.toLowerCase() as 'halo' | 'space'].invitationObservable;

  return (
    <ViewState {...viewStateProps}>
      {!activeInvitation ? (
        <PureInvitationAcceptedContent {...props} result={null} />
      ) : (
        <InvitationAcceptedContent {...props} activeInvitation={activeInvitation} />
      )}
    </ViewState>
  );
};
