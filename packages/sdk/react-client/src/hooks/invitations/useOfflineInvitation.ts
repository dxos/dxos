//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { useEffect, useState } from 'react';

import { PublicKey, PublicKeyLike } from '@dxos/crypto';
import { Contact } from '@dxos/echo-db';

import { useClient } from '../client';
import { encodeInvitation, noOp } from './utils';

type UseOfflineInvitationProps = {
  onDone?: () => void; // called once the invite flow finishes successfully.
  onError?: (error?: string) => void | never; // called if the invite flow produces an error.
};

/**
 * Hook to create an Offline Invitation for recipient to a given party
 */
export const useOfflineInvitation = (
  partyKey: PublicKeyLike, // the Party to create invite for. Required.
  recipient: Contact, // the recipient for the invitation. Required.
  { onDone = noOp, onError = noOp }: UseOfflineInvitationProps = {}
) => {
  assert(partyKey);
  assert(recipient);
  const client = useClient();
  const [invitationCode, setInvitationCode] = useState<string>();
  const key = partyKey.toString();
  const recipientKey = recipient.publicKey.toString();

  useEffect(() => {
    client
      .createOfflineInvitation(PublicKey.from(partyKey), recipient.publicKey)
      .then((invitation) => {
        setInvitationCode(encodeInvitation(invitation));
      })
      .catch((error) => onError(error));
  }, [key, recipientKey]);

  return [invitationCode];
};
