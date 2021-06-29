//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { useEffect, useState, useMemo } from 'react';

import { trigger } from '@dxos/async';
import { generatePasscode } from '@dxos/credentials';
import { PublicKey, PublicKeyLike } from '@dxos/crypto';
import { Contact, InvitationDescriptor, Party } from '@dxos/echo-db';

import { useClient } from '../client';

const encodeInvitation = (invitation: InvitationDescriptor) => btoa(JSON.stringify(invitation.toQueryParameters()));
const decodeInvitation = (code: string) => InvitationDescriptor.fromQueryParameters(JSON.parse(atob(code)));

const noOp = () => null;

type InvitationRedeemerHookProps = {
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
}: InvitationRedeemerHookProps = {}) => {
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

type InvitationHookProps = {
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
  { onDone = noOp, onError = noOp, onExpiration = noOp, expiration }: InvitationHookProps = {}
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

type OfflineInvitationHookProps = {
  onDone?: () => void; // called once the invite flow finishes successfully.
  onError?: (error?: string) => void | never; // called if the invite flow produces an error.
};

/**
 * Hook to create an Offline Invitation for recipient to a given party
 */
export const useOfflineInvitation = (
  partyKey: PublicKeyLike, // the Party to create invite for. Required.
  recipient: Contact, // the recipient for the invitation. Required.
  { onDone = noOp, onError = noOp }: OfflineInvitationHookProps = {}
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
