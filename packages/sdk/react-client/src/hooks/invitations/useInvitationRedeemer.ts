//
// Copyright 2020 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { trigger } from '@dxos/async';
import { Party } from '@dxos/echo-db';

import { useClient } from '../client';
import { decodeInvitation, noOp } from './utils';

type UseInvitationRedeemerProps = {
  onDone?: (party: Party) => void
  onError?: (error?: string) => void | never // TODO(burdon): Error type (and not optional).
  isOffline?: boolean
};

/**
 * Hook to redeem an Invitation Code and provide the PIN authentication (if needed).
 * Works with both regular and `Offline` invitations.
 *
 * Works with `useInvitation` and `useOfflineInvitation` hooks on the inviter side.
 *
 * @param onDone called once the redeem flow finishes successfully.
 * @param onError called if the invite flow produces an error.
 * @param isOffline Is this an `Offline` invitation?
 * @deprecated
 */
// TODO(burdon): Return state (link useAuthenticator).
export const useInvitationRedeemer = ({
  onDone = noOp, // TODO(burdon): Hooks shouldn't have callbacks (return state?)
  onError = noOp,
  isOffline = false // TODO(burdon): Document? Rename "offline"
}: UseInvitationRedeemerProps = {}) => {
  const client = useClient();
  const [invitationCode, setInvitationCode] = useState<string>();
  const [secretProvider, secretResolver] = useMemo(() => trigger<Buffer>(), [invitationCode]);

  useEffect(() => {
    if (!invitationCode) {
      return;
    }

    setImmediate(async () => {
      try {
        const invitation = decodeInvitation(invitationCode);
        const party = await client.echo.joinParty(invitation, isOffline ? undefined : secretProvider);
        await party.open();
        onDone(party);
      } catch (error) {
        onError(error);
      }
    });
  }, [invitationCode, isOffline]);

  return [
    setInvitationCode,
    (pin: string) => {
      secretResolver(Buffer.from(pin));
    }
  ];
};
