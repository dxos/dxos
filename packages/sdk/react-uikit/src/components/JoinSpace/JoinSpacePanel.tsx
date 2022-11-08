//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

export const JoinSpacePanel = ({
  parseInvitation = (code) => code,
  initialInvitationCode,
  onJoin
}: JoinSpacePanelProps) => {
  const { t } = useTranslation();
  const client = useClient();
  const [invitationCode, setInvitationCode] = useState(initialInvitationCode ?? '');
  const [invitationSecret, setInvitationSecret] = useState(initialInvitationCode ?? '');

  const { status, cancel, error, connect, result, haltedAt } = useInvitationStatus();

  const onConnectNext = useCallback(() => {
    connect(
      client.echo.acceptInvitation(
        InvitationEncoder.decode(parseInvitation(invitationCode))
      ) as unknown as InvitationWrapper
    );
  }, [invitationCode]);

  const onAuthenticateNext = useCallback(() => {
    console.warn('[onAuthenticateNext]', 'not implemented', invitationSecret);
  }, [invitationSecret]);

  useEffect(() => {
    if (initialInvitationCode) {
      void onConnectNext();
    }
  }, []);

  useEffect(() => {
    if (status === InvitationState.SUCCESS && result.spaceKey) {
      onJoin?.(result.spaceKey);
    }
  }, [status, result]);

  const cursor =
    status === InvitationState.ERROR || status === InvitationState.TIMEOUT || status === InvitationState.CANCELLED
      ? haltedAt!
      : status;

  const stepProps = useMemo(() => {
    return cursor < InvitationState.CONNECTED
      ? {
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
        }
      : {
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
        };
  }, [cursor, error, onAuthenticateNext, invitationSecret, invitationCode, onConnectNext, status, result, t]);

  return (
    <>
      <InvitationStatus {...{ status, haltedAt }} className='mbs-3' />
      <SingleInputStep {...stepProps} />
    </>
  );
};
