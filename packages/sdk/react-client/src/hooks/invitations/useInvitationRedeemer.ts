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
  onError?: (error?: string) => void | never
  isOffline?: boolean  // TODO(burdon): Rename offline.
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
 */
// TODO(burdon): Requires tests.
export const useInvitationRedeemer = ({ // TODO(burdon): Hooks shouldn't have callbacks.
  onDone = noOp,
  onError = noOp,
  isOffline = false
}: UseInvitationRedeemerProps = {}) => {
  const client = useClient();
  const [invitationCode, setInvitationCode] = useState<string>();
  const [resolver, setResolver] = useState<boolean>(false);

  //
  const [secretProvider, secretResolver] = useMemo(() => trigger<Buffer>(), [invitationCode]);

  useEffect(() => {
    setResolver(!isOffline);

    if (!invitationCode) {
      return;
    }

    try {
      const invitation = decodeInvitation(invitationCode);

      client.echo
        .joinParty(invitation, !isOffline ? secretProvider : undefined)
        .then((party) => {
          void party.open().then(() => onDone(party));
        })
        .catch((error) => onError(error));
    } catch (error) {
      onError(error);
    }
  }, [invitationCode, isOffline]);

  return [
    setInvitationCode, // redeemCode
    // TODO(burdon): Isn't `resolver` going to be stale?
    resolver ? (pin: string) => secretResolver(Buffer.from(pin)) : () => null // setPin,
  ];
};
