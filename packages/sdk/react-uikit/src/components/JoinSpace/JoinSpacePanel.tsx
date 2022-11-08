//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InvitationEncoder, PublicKey } from '@dxos/client';
import { useClient } from '@dxos/react-client';

import { useInvitationStatus, InvitationState, InvitationWrapper, InvitationStatus } from '../../experimental';
import { SingleInputStep } from '../SingleInputStep';

export interface JoinSpacePanelProps {
  // TODO(burdon): Use InvitationEncoder to parse/decode?
  parseInvitation?: (invitationCode: string) => string;
  initialInvitationCode?: string;
  onJoin?: (spaceKey: PublicKey) => void;
}

interface JoinStep1Props extends JoinSpacePanelProps {
  connect: (wrapper: InvitationWrapper) => void;
  status: InvitationState;
  cancel: () => void;
  error?: number;
}

interface JoinStep2Props extends JoinSpacePanelProps {
  status: InvitationState;
  cancel: () => void;
  error?: number;
}

const JoinStep1 = ({
  connect,
  status,
  cancel,
  error,
  parseInvitation = (code) => code,
  initialInvitationCode
}: JoinStep1Props) => {
  const { t } = useTranslation();
  const client = useClient();

  const [invitationCode, setInvitationCode] = useState(initialInvitationCode ?? '');

  const onConnectNext = useCallback(() => {
    connect(
      client.echo.acceptInvitation(
        InvitationEncoder.decode(parseInvitation(invitationCode))
      ) as unknown as InvitationWrapper
    );
  }, [invitationCode]);

  useEffect(() => {
    if (initialInvitationCode) {
      void onConnectNext();
    }
  }, []);

  return (
    <SingleInputStep
      {...{
        pending: status === InvitationState.CONNECTING,
        inputLabel: t('invitation code label', { ns: 'uikit' }),
        inputPlaceholder: t('invitation code placeholder', { ns: 'uikit' }),
        inputProps: {
          initialValue: invitationCode,
          autoFocus: true,
          ...(error && {
            validationMessage: `Untranslated error code: ${error}`, // todo: provide usable error message
            validationValence: 'error' as const
          })
        },
        onChange: setInvitationCode,
        onNext: onConnectNext,
        onCancelPending: cancel
      }}
    />
  );
};

const JoinStep2 = ({ status, error, cancel }: JoinStep2Props) => {
  const { t } = useTranslation();
  const [invitationSecret, setInvitationSecret] = useState('');

  const onAuthenticateNext = useCallback(() => {
    console.warn('[onAuthenticateNext]', 'not implemented', invitationSecret);
  }, [invitationSecret]);

  return (
    <SingleInputStep
      {...{
        pending: status === InvitationState.AUTHENTICATING,
        inputLabel: t('invitation secret label', { ns: 'uikit' }),
        inputPlaceholder: t('invitation secret placeholder', { ns: 'uikit' }),
        inputProps: {
          initialValue: '',
          autoFocus: true,
          ...(error && {
            validationMessage: `Untranslated error code: ${error}`, // todo: provide usable error message
            validationValence: 'error' as const
          })
        },
        onChange: setInvitationSecret,
        onNext: onAuthenticateNext,
        onCancelPending: cancel
      }}
    />
  );
};

export const JoinSpacePanel = (props: JoinSpacePanelProps) => {
  const { status, cancel, error, connect, result, haltedAt } = useInvitationStatus();

  useEffect(() => {
    if (status === InvitationState.SUCCESS && result.spaceKey) {
      props.onJoin?.(result.spaceKey);
    }
  }, [status, result]);

  const cursor =
    status === InvitationState.ERROR || status === InvitationState.TIMEOUT || status === InvitationState.CANCELLED
      ? haltedAt!
      : status;

  return (
    <>
      <InvitationStatus {...{ status, haltedAt }} className='mbs-3' />
      {cursor < InvitationState.CONNECTED ? (
        <JoinStep1 {...props} {...{ connect, status, cancel, error }} />
      ) : (
        <JoinStep2 {...props} {...{ connect, status, cancel, error }} />
      )}
    </>
  );
};
