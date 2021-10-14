//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { useEffect, useState } from 'react';

import { PublicKey, PublicKeyLike } from '@dxos/crypto';
import { Contact } from '@dxos/echo-db';

import { useClient } from '../client';
import { encodeInvitation, noOp } from './utils';

type UseOfflineInvitationOpts = {
  onError?: (error?: string) => void | never;
};

/**
 * Hook to create an Offline Invitation for a recipient to a given party.
 * Offline Invitation, unlike regular invitation, does NOT require
 * the inviter and invitee to be online at the same time - hence `Offline` Invitation.
 * The invitee (recipient) needs to be known ahead of time.
 * Invitation it not valid for other users.
 *
 * Works with `useInvitationRedeemer` hooks on the invitee side.
 *
 * @param partyKey the Party to create the invitation for.
 * @param recipient the invitee (recipient for the invitation).
 * @param opts
 * @param opts.onError called if the invite flow produces an error.
 * @deprecated
 */
// TODO(burdon): Remove.
export const useOfflineInvitation = (
  partyKey: PublicKeyLike,
  recipient: Contact,
  opts: UseOfflineInvitationOpts = {}
) => {
  assert(partyKey);
  assert(recipient);
  const { onError = noOp } = opts;
  const client = useClient();
  const [invitationCode, setInvitationCode] = useState<string>();

  useEffect(() => {
    setImmediate(async () => {
      try {
        const invitation = await client.createOfflineInvitation(PublicKey.from(partyKey), recipient.publicKey);
        setInvitationCode(encodeInvitation(invitation));
      } catch (error) {
        onError(error);
      }
    });
  }, []);

  return [invitationCode];
};
