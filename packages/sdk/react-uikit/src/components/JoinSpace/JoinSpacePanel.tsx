//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InvitationEncoder, InvitationObservable, PublicKey, Invitation } from '@dxos/client';
import { useClient, useInvitationStatus } from '@dxos/react-client';

import { InvitationStatus } from '../InvitationStatus';
import { SingleInputStep } from '../SingleInputStep';

export interface JoinSpacePanelProps {
  // TODO(burdon): Use InvitationEncoder to parse/decode?
  parseInvitation?: (invitationCode: string) => string;
  initialInvitationCode?: string;
  onJoin?: (spaceKey: PublicKey) => void;
}

interface JoinStep1Props extends JoinSpacePanelProps {
  connect: (wrapper: InvitationObservable) => void;
  status: Invitation.State;
  cancel: () => void;
  error?: number;
}

interface JoinStep2Props extends JoinSpacePanelProps {
  status: Invitation.State;
  cancel: () => void;
  authenticate: (secret: string) => Promise<void>;
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

  const onConnectNext = useCallback(async () => {
    const invitation = await client.echo.acceptInvitation(InvitationEncoder.decode(parseInvitation(invitationCode)));
    connect(invitation);
  }, [invitationCode]);

  useEffect(() => {
    if (initialInvitationCode) {
      void onConnectNext();
    }
  }, []);

  return (
    <SingleInputStep
      {...{
        pending: status === Invitation.State.CONNECTING,
        inputLabel: t('invitation code label', { ns: 'uikit' }),
        inputPlaceholder: t('invitation code placeholder', { ns: 'uikit' }),
        inputProps: {
          initialValue: invitationCode,
          autoFocus: true,
          className: 'text-center',
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

const JoinStep2 = ({ status, error, cancel, authenticate }: JoinStep2Props) => {
  const { t } = useTranslation();
  const [invitationSecret, setInvitationSecret] = useState('');
  const [pending, setPending] = useState(false);

  const onAuthenticateNext = useCallback(() => {
    setPending(true);
    authenticate(invitationSecret).finally(() => setPending(false));
  }, [invitationSecret]);

  return (
    <SingleInputStep
      {...{
        pending,
        inputLabel: t('invitation secret label', { ns: 'uikit' }),
        inputProps: {
          size: 'pin',
          length: 6,
          initialValue: '',
          autoFocus: true,
          className: 'text-center',
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
  const { status, cancel, error, connect, authenticate, result, haltedAt } = useInvitationStatus();

  useEffect(() => {
    if (status === Invitation.State.SUCCESS && result.spaceKey) {
      props.onJoin?.(result.spaceKey);
    }
  }, [status, result]);

  const cursor =
    status === Invitation.State.ERROR || status === Invitation.State.TIMEOUT || status === Invitation.State.CANCELLED
      ? haltedAt!
      : status;

  return (
    <>
      <InvitationStatus {...{ status, haltedAt }} className='mbs-3' />
      {cursor < Invitation.State.CONNECTED ? (
        <JoinStep1 {...props} {...{ connect, status, cancel, error }} />
      ) : (
        <JoinStep2 {...props} {...{ connect, authenticate, status, cancel, error }} />
      )}
    </>
  );
};
