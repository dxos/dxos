//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InvitationEncoder, InvitationObservable, Invitation, AuthenticatingInvitationObservable } from '@dxos/client';
import { InvitationResult, useInvitationStatus } from '@dxos/react-client';

import { InvitationStatus } from '../InvitationStatus';
import { SingleInputStep } from '../SingleInputStep';

export interface JoinPanelProps {
  // TODO(burdon): Use InvitationEncoder to parse/decode?
  parseInvitation?: (invitationCode: string) => string;
  initialInvitationCode?: string;
  onJoin?: (result: InvitationResult) => void;
  acceptInvitation: (invitation: Invitation) => Promise<AuthenticatingInvitationObservable>;
}

interface JoinStep1Props extends JoinPanelProps {
  connect: (wrapper: InvitationObservable) => void;
  status: Invitation.State;
  cancel: () => void;
  error?: number;
}

interface JoinStep2Props extends JoinPanelProps {
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
  initialInvitationCode,
  acceptInvitation
}: JoinStep1Props) => {
  const { t } = useTranslation();

  const [invitationCode, setInvitationCode] = useState(initialInvitationCode ?? '');

  const onConnectNext = useCallback(async () => {
    const invitation = await acceptInvitation(InvitationEncoder.decode(parseInvitation(invitationCode)));
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

export const JoinPanel = (props: JoinPanelProps) => {
  const { status, cancel, error, connect, authenticate, result, haltedAt } = useInvitationStatus();

  useEffect(() => {
    if (status === Invitation.State.SUCCESS && result) {
      props.onJoin?.(result);
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
