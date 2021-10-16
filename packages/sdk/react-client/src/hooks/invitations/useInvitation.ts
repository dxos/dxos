//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { useEffect, useState } from 'react';

import { generatePasscode } from '@dxos/credentials';
import { PublicKey, PublicKeyLike } from '@dxos/crypto';
import { Contact } from '@dxos/echo-db';

import { useClient } from '../client';
import { encodeInvitation, noOp } from './utils';

type UseInvitationOpts = {
  onDone?: () => void
  onError?: (error?: string) => void | never
  onExpiration?: () => void
  expiration?: number
}

/**
 * Creates an Invitation for a given party on the caller side.
 * The Invitation flow requires the inviter and invitee to be online at the same time.
 * If the invitee is known ahead of time, `useOfflineInvitation` can be used instead.
 * The invitation flow is protected by a generated pin code.
 *
 * Works with `useInvitationRedeemer` hooks on the invitee side.
 *
 * @param partyKey the Party to create the invitation for.
 * @param opts
 * @param opts.onDone called once the invite flow finishes successfully.
 * @param opts.onError called if the invite flow produces an error.
 * @param opts.onExpiration called if the invite flow expired.
 * @param opts.expiration (optional) Date.now()-style timestamp of when this invitation should expire.
 * @deprecated
 */
// TODO(burdon): Return state (link useAuthenticator).
export const useInvitation = (
  partyKey: PublicKeyLike, // TODO(burdon): Avoid ambiguous types.
  opts: UseInvitationOpts = {}
) => {
  assert(partyKey);
  const key = partyKey.toString();
  const {
    onDone = noOp,
    onError = noOp,
    onExpiration = noOp,
    expiration
  }: UseInvitationOpts = opts;

  const client = useClient();
  const [invitationCode, setInvitationCode] = useState<string>();
  const [pin, setPin] = useState<string>();

  useEffect(() => {
    setImmediate(async () => {
      try {
        const secretProvider = () => {
          const pin = generatePasscode();
          setPin(pin);
          return Promise.resolve(Buffer.from(pin));
        };

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

/**
 * Creates an Offline Invitation for a recipient to a given party.
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
// TODO(burdon): Merge with useInvitation.
export const useOfflineInvitation = (
  partyKey: PublicKeyLike,
  recipient: Contact,
  opts: UseInvitationOpts = {}
) => {
  assert(partyKey);
  assert(recipient);
  const {
    onError = noOp
  } = opts;

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
