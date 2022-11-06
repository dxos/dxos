//
// Copyright 2022 DXOS.org
//

import { useAsync } from '@react-hook/async';
import { PublicKey } from 'packages/common/keys/src';
import { InvitationEvents } from 'packages/sdk/client-services/src';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Observable, Trigger } from '@dxos/async';
import { Invitation, InvitationWrapper, Party } from '@dxos/client';
import { useClient } from '@dxos/react-client';

import { SingleInputStep } from '../SingleInputStep';

// TODO(burdon): Convenience util to wrap observable with promise? How to expose state?
const awaitInvitation = async (observable: Observable<InvitationEvents>): Promise<PublicKey> => {
  const partyPromise = new Trigger<PublicKey>();

  // TODO(burdon): Custom hook.
  // TODO(burdon): Unsubscribe on success/failure/cancelled.
  const unsubscribe = observable.subscribe({
    onSuccess: (invitation: Invitation) => {
      partyPromise.wake(invitation.spaceKey!);
      unsubscribe();
    },
    onError: (err: Error) => {
      // TODO(burdon): Handler error.
      console.error(err);
      unsubscribe();
    }
  });

  return partyPromise.wait();
};

export interface JoinSpacePanelProps {
  // TODO(burdon): Pass in parsed invitation?
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
    const invitation = InvitationWrapper.decode(parseInvitation(invitationCode));
    const observable = client.echo.acceptInvitation(invitation.toProto());
    const partyKey = await awaitInvitation(observable);
    return client.echo.getParty(partyKey)!;
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
