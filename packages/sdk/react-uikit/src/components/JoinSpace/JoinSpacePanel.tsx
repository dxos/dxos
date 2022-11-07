//
// Copyright 2022 DXOS.org
//

import { useAsync } from '@react-hook/async';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { invitationObserver, InvitationEncoder, Party } from '@dxos/client';
import { useClient } from '@dxos/react-client';

import { SingleInputStep } from '../SingleInputStep';

export interface JoinSpacePanelProps {
  // TODO(burdon): Use InvitationEncoder to parse/decode?
  parseInvitation?: (invitationCode: string) => string;
  initialInvitationCode?: string;
  onJoin?: (space: Party) => void;
}

export const JoinSpacePanel = ({
  parseInvitation = (code) => code,
  initialInvitationCode,
  onJoin
}: JoinSpacePanelProps) => {
  const { t } = useTranslation();
  const client = useClient();
  const [invitationCode, setInvitationCode] = useState(initialInvitationCode ?? '');
  const redeemInvitation = useCallback(async () => {
    // TODO(burdon): Implement observable to get other states (e.g., connecting...)
    const observable = client.echo.acceptInvitation(InvitationEncoder.decode(parseInvitation(invitationCode)));
    const invitation = await invitationObserver(observable);
    return client.echo.getParty(invitation.spaceKey!)!;
  }, [invitationCode]);
  const [{ status, cancel, error, value }, call] = useAsync<Party>(redeemInvitation);

  useEffect(() => {
    if (initialInvitationCode) {
      void call();
    }
  }, []);

  useEffect(() => {
    if (status === 'success' && value) {
      onJoin?.(value);
    }
  }, [status, value]);

  return (
    <SingleInputStep
      {...{
        pending: status === 'loading',
        inputLabel: t('invitation code label'),
        inputPlaceholder: t('invitation code placeholder'),
        inputProps: {
          initialValue: invitationCode
        },
        onChange: setInvitationCode,
        onNext: call,
        onCancelPending: cancel,
        ...(error && {
          inputProps: {
            validationMessage: error.message,
            validationValence: 'error'
          }
        })
      }}
    />
  );
};
