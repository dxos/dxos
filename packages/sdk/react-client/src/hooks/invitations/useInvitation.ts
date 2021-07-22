//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { useEffect, useState } from 'react';

import { generatePasscode } from '@dxos/credentials';
import { PublicKey, PublicKeyLike } from '@dxos/crypto';

import { useClient } from '../client';
import { encodeInvitation, noOp } from './utils';

type UseInvitationProps = {
  onDone?: () => void; // called once the invite flow finishes successfully.
  onError?: (error?: string) => void | never; // called if the invite flow produces an error.
  onExpiration?: () => void; // called if the invite flow expired.
  expiration?: number; // Optional expiration
};

/**
 * Hook to create an Invitation for a given party
 */
export const useInvitation = (
  partyKey: PublicKeyLike, // the Party to create invite for.
  { onDone = noOp, onError = noOp, onExpiration = noOp, expiration }: UseInvitationProps = {}
) => {
  assert(partyKey);
  const client = useClient();
  const [invitationCode, setInvitationCode] = useState<string>();
  const [pin, setPin] = useState<string>();
  const key = partyKey.toString();

  useEffect(() => {
    client
      .createInvitation(
        PublicKey.from(partyKey),
        () => {
          const pin = generatePasscode();
          setPin(pin);
          return Promise.resolve(Buffer.from(pin));
        },
        {
          onFinish: ({ expired }) => {
            expired ? onExpiration() : onDone();
          },
          expiration
        }
      )
      .then((invitation) => setInvitationCode(encodeInvitation(invitation)))
      .catch((error) => onError(error));
  }, [key]);

  return [invitationCode, pin];
};
