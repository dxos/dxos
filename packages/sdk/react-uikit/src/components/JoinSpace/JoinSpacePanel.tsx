//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InvitationEncoder, PublicKey } from '@dxos/client';
import { useClient } from '@dxos/react-client';

import { useInvitationStatus, InvitationState } from '../../experimental';
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

  const { status, cancel, error, connect, result } = useInvitationStatus();

  const redeemInvitation = useCallback(() => {
    connect(client.halo.acceptInvitation(InvitationEncoder.decode(parseInvitation(invitationCode))));
  }, [invitationCode]);

  useEffect(() => {
    if (initialInvitationCode) {
      void redeemInvitation();
    }
  }, []);

  useEffect(() => {
    if (status === InvitationState.SUCCESS && result.spaceKey) {
      onJoin?.(result.spaceKey);
    }
  }, [status, result]);

  return (
    <SingleInputStep
      {...{
        pending: status === InvitationState.CONNECTING || status === InvitationState.AUTHENTICATING,
        inputLabel: t('invitation code label'),
        inputPlaceholder: t('invitation code placeholder'),
        inputProps: {
          initialValue: invitationCode
        },
        onChange: setInvitationCode,
        onNext: redeemInvitation,
        onCancelPending: cancel,
        ...(error && {
          inputProps: {
            validationMessage: error,
            validationValence: 'error'
          }
        })
      }}
    />
  );
};
