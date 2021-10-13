//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { useEffect, useState } from 'react';

import { generatePasscode } from '@dxos/credentials';
import { PublicKey, PublicKeyLike } from '@dxos/crypto';

import { useClient } from '../client';
import { encodeInvitation, noOp } from './utils';

type UseInvitationOpts = {
  onDone?: () => void;
  onError?: (error?: string) => void | never;
  onExpiration?: () => void;
  expiration?: number;
};

/**
 * Hook to create an Invitation for a given party.
 * The Invitation flow requires the inviter and invitee to be online at the same time.
 * If the invitee is known ahead of time, `useOfflineInvitation` can be used instead.
 * The invitation flow is protected by a generated pin code.
 *
 * Works with `useInvitationRedeemer` hooks on the invitee side.
 *
 * @param partyKey the Party to create the invitation for.
 * @param opts.onDone called once the invite flow finishes successfully.
 * @param opts.onError called if the invite flow produces an error.
 * @param opts.onExpiration called if the invite flow expired.
 * @param opts.expiration (optional) Date.now()-style timestamp of when this invitation should expire.
 * @deprecated
 */
export const useInvitation = (
  partyKey: PublicKeyLike, { onDone = noOp, onError = noOp, onExpiration = noOp, expiration }: UseInvitationOpts = {}
) => {
  assert(partyKey);
  const client = useClient();
  const [invitationCode, setInvitationCode] = useState<string>();
  const [pin, setPin] = useState<string>();
  const key = partyKey.toString();

  const secretProvider = () => {
    const pin = generatePasscode();
    setPin(pin);
    return Promise.resolve(Buffer.from(pin));
  };

  useEffect(() => {
    setImmediate(async () => {
      try {
        const invitation = await client.createInvitation(PublicKey.from(partyKey), secretProvider, {
          onFinish: ({ expired }) => {
            expired ? onExpiration() : onDone();
          },
          expiration
        });

        setInvitationCode(encodeInvitation(invitation));
      } catch (error) {
        onError(error);
      }
    });
  }, [key]);

  return [invitationCode, pin];
};
