//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { useEffect, useState, useMemo } from 'react';

import { trigger } from '@dxos/async';
import { generatePasscode } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { InvitationDescriptor } from '@dxos/echo-db';

import { useClient } from './client';

const encodeInvitation = (invitation) => btoa(JSON.stringify(invitation.toQueryParameters()));
const decodeInvitation = (code) => InvitationDescriptor.fromQueryParameters(JSON.parse(atob(code)));

const noOp = () => null;

/**
 * Hook to redeem an invitation Code and provide the PIN authentication if needed.
 * @param {Object} options
 * @param {(party: Party) => void} options.onDone called once the redeem flow finishes successfully.
 * @param {(error?: string) => void | never} options.onError called if the invite flow produces an error.
 * @returns {[redeemCode: (code: String) => void, setPin: (pin: String) => void ]}
 */
export function useInvitationRedeemer ({ onDone = noOp, onError = noOp, isOffline = false } = {}) {
  const client = useClient();
  const [code, setCode] = useState();
  const [resolver, setResolver] = useState();
  const [secretProvider, secretResolver] = useMemo(() => trigger(), [code]);

  useEffect(() => {
    setResolver(!isOffline);
    if (!code) {
      return;
    }

    try {
      const invitation = decodeInvitation(code);

      client.echo.joinParty(invitation, !isOffline ? secretProvider : undefined)
        .then(party => {
          party.open().then(() => onDone(party));
        })
        .catch(error => onError(error));
    } catch (error) {
      onError(error);
    }
  }, [code, isOffline]);

  return [
    setCode, // redeemCode
    resolver ? pin => secretResolver(Buffer.from(pin)) : undefined // setPin
  ];
}

/**
 * Hook to create an Invitation for a given party
 * @param {PublicKey} partyKey the Party to create invite for. Required.
 * @param {Object} options
 * @param {() => void} options.onDone called once the invite flow finishes successfully.
 * @param {(error?: string) => void | never} options.onError called if the invite flow produces an error.
 * @param {(() => void) | undefined} options.onExpiration called if the invite flow expired.
 * @param {number | undefined} options.expiration Optional expiration
 * @returns {[invitationCode: String, pin: String ]}
 */
export function useInvitation (partyKey, { onDone = noOp, onError = noOp, onExpiration = noOp, expiration } = {}) {
  assert(partyKey);
  const client = useClient();
  const [invitationCode, setInvitationCode] = useState();
  const [pin, setPin] = useState();
  const key = partyKey.toString();

  useEffect(() => {
    client.createInvitation(
      PublicKey.from(partyKey),
      () => {
        const pin = generatePasscode();
        setPin(pin);
        return Buffer.from(pin);
      },
      {
        onFinish: ({ expired }) => {
          expired ? onExpiration() : onDone();
        },
        expiration
      })
      .then(invitation => setInvitationCode(encodeInvitation(invitation)))
      .catch(error => onError(error));
  }, [key]);

  return [
    invitationCode,
    pin
  ];
}

/**
 * Hook to create an Offline Invitation for recipient to a given party
 * @param {Buffer} partyKey the Party to create invite for. Required.
 * @param {Contact|{ publicKey: {Buffer} }} recipient the recipient for the invitation. Required.
 * @param {Object} options
 * @param {() => void} options.onDone called once the invite flow finishes successfully.
 * @param {(error?: string) => void | never} options.onError called if the invite flow produces an error.
 * @returns {[invitationCode: String ]}
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useOfflineInvitation (partyKey, recipient, { onDone = noOp, onError = noOp } = {}) {
  assert(partyKey);
  assert(recipient);
  const client = useClient();
  const [invitationCode, setInvitationCode] = useState();
  const key = partyKey.toString();
  const recipientKey = recipient.publicKey.toString();

  useEffect(() => {
    client.createOfflineInvitation(PublicKey.from(partyKey), recipient.publicKey)
      .then(invitation => {
        setInvitationCode(encodeInvitation(invitation));
      })
      .catch(error => onError(error));
  }, [key, recipientKey]);

  return [
    invitationCode
  ];
}
