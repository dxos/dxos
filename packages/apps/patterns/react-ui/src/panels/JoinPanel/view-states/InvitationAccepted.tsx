//
// Copyright 2023 DXOS.org
//

import React, { cloneElement } from 'react';

import { AuthenticatingInvitationObservable } from '@dxos/client';
import { InvitationResult, useInvitationStatus, useIdentity } from '@dxos/react-client';
import { useTranslation } from '@dxos/react-components';

import { Content, Button, Heading } from '../../Panel';
import { ViewState, ViewStateProps } from './ViewState';

export interface InvitationAcceptedProps extends ViewStateProps {
  Kind: 'Space' | 'Halo';
  screenName?: string;
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: () => void;
}

const PureInvitationAcceptedContent = ({
  onDone,
  Kind,
  doneActionParent,
  active,
  screenName
}: InvitationAcceptedProps) => {
  const disabled = !active;
  const { t } = useTranslation('os');

  const doneButton = (
    <Content>
      <Button
        {...(onDone && { onClick: () => onDone?.() })}
        disabled={disabled}
        data-autofocus={`success${Kind}Invitation finishingJoining${Kind}`}
        data-testid={`${Kind.toLowerCase()}-invitation-accepted-done`}
      >
        <span className='grow'>{t('dismiss label')}</span>
      </Button>
    </Content>
  );

  return (
    <>
      <Heading>
        {t('welcome message')}
        {screenName ? ', ' + screenName : ''}
      </Heading>
      {doneActionParent ? cloneElement(doneActionParent, {}, doneButton) : doneButton}
    </>
  );
};

const InvitationAcceptedContent = (
  props: InvitationAcceptedProps & {
    activeInvitation: AuthenticatingInvitationObservable;
    onDone?: (result: InvitationResult) => any;
  }
) => {
  const { onDone } = props;
  const { result } = useInvitationStatus(props.activeInvitation);
  const identity = useIdentity();
  return (
    <PureInvitationAcceptedContent
      {...props}
      screenName={identity?.profile?.displayName}
      onDone={() => onDone?.(result)}
    />
  );
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
