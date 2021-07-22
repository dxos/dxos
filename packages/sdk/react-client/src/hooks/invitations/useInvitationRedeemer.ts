//
// Copyright 2020 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { trigger } from '@dxos/async';
import { Party } from '@dxos/echo-db';

import { useClient } from '../client';
import { decodeInvitation, noOp } from './utils';

type UseInvitationRedeemerProps = {
  onDone?: (party: Party) => void; // called once the redeem flow finishes successfully.
  onError?: (error?: string) => void | never; // called if the invite flow produces an error.
  isOffline?: boolean;
};

/**
 * Hook to redeem an invitation Code and provide the PIN authentication if needed.
 */
export const useInvitationRedeemer = ({
  onDone = noOp,
  onError = noOp,
  isOffline = false
}: UseInvitationRedeemerProps = {}) => {
  const client = useClient();
  const [code, setCode] = useState<string>();
  const [resolver, setResolver] = useState<boolean>();
  const [secretProvider, secretResolver] = useMemo(() => trigger<Buffer>(), [code]);

  useEffect(() => {
    setResolver(!isOffline);

    if (!code) {
      return;
    }

    try {
      const invitation = decodeInvitation(code);

      client.echo
        .joinParty(invitation, !isOffline ? secretProvider : undefined)
        .then((party) => {
          party.open().then(() => onDone(party));
        })
        .catch((error) => onError(error));
    } catch (error) {
      onError(error);
    }
  }, [code, isOffline]);

  return [
    setCode, // redeemCode
    resolver ? (pin: string) => secretResolver(Buffer.from(pin)) : () => null // setPin
  ];
};
