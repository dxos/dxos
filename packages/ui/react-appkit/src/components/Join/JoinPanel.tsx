//
// Copyright 2022 DXOS.org
//

import React, { ChangeEvent, useCallback, useEffect, useState } from 'react';

import { useTranslation } from '@dxos/aurora';
import {
  AuthenticatingInvitationObservable,
  CancellableInvitationObservable,
  Invitation,
  InvitationEncoder,
  InvitationResult,
  useInvitationStatus,
} from '@dxos/react-client/invitations';

import { InvitationStatus } from '../InvitationStatus';
import { SingleInputStep } from '../SingleInputStep';

const pinLength = 6;

export interface JoinPanelProps {
  // TODO(burdon): Use InvitationEncoder to parse/decode?
  parseInvitation?: (invitationCode: string) => string;
  initialInvitationCode?: string;
  onJoin?: (result: InvitationResult) => void;
  acceptInvitation: (invitation: Invitation) => AuthenticatingInvitationObservable;
}

interface JoinStep1Props extends JoinPanelProps {
  connect: (wrapper: CancellableInvitationObservable) => void;
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
  acceptInvitation,
}: JoinStep1Props) => {
  const { t } = useTranslation('appkit');

  const [invitationCode, setInvitationCode] = useState(initialInvitationCode ?? '');

  const onConnectNext = useCallback(async () => {
    const invitation = acceptInvitation(InvitationEncoder.decode(parseInvitation(invitationCode)));
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
        inputLabel: t('invitation code label', { ns: 'appkit' }),
        inputPlaceholder: t('invitation code placeholder', { ns: 'appkit' }),
        inputProps: {
          initialValue: invitationCode, // TODO(dmaretskyi): defaultValue?.
          slots: { input: { autoFocus: true, className: 'text-center' } },
          ...(error && {
            validationMessage: `Untranslated error code: ${error}`, // todo: provide usable error message
            validationValence: 'error' as const,
          }),
        } as any,
        onChange: ({ target: { value } }) => setInvitationCode(value),
        onNext: onConnectNext,
        onCancelPending: cancel,
      }}
    />
  );
};

const JoinStep2 = ({ status, error, cancel, authenticate }: JoinStep2Props) => {
  const { t } = useTranslation('appkit');
  const [invitationSecret, setInvitationSecret] = useState('');
  const [pending, setPending] = useState(false);

  const onAuthenticateNext = useCallback((secret: string) => {
    setPending(true);
    void authenticate(secret).finally(() => setPending(false));
  }, []);

  const onChange = useCallback(
    ({ target: { value } }: ChangeEvent<HTMLInputElement>) => {
      setInvitationSecret(value);
      value.length === pinLength && onAuthenticateNext(value);
    },
    [onAuthenticateNext],
  );

  return (
    <SingleInputStep
      {...{
        pending,
        inputLabel: t('invitation secret label', { ns: 'appkit' }),
        inputProps: {
          size: 'pin',
          length: pinLength,
          initialValue: '', // TODO(dmaretskyi): defaultValue?.
          slots: { input: { autoFocus: true, inputMode: 'numeric', pattern: ' d*' } },
          ...(error && {
            validationMessage: `Untranslated error code: ${error}`, // todo: provide usable error message
            validationValence: 'error' as const,
          }),
        } as any,
        onChange,
        onNext: () => onAuthenticateNext(invitationSecret),
        onCancelPending: cancel,
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
