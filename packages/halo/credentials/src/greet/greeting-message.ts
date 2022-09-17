//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { ClaimResponse, Command, SignedMessage, Message, WithTypeUrl } from '../proto';

const TYPE_URL_GREETING_COMMAND = 'dxos.halo.credentials.greet.Command';

/**
 * Create a Greeting 'BEGIN' command message.
 * @returns {{'@type': string, command: *}}
 */
export const createGreetingBeginMessage = (): WithTypeUrl<Command> => ({
  '@type': TYPE_URL_GREETING_COMMAND,
  command: Command.Type.BEGIN,
  params: []
});

/**
 * Create a Greeting 'HANDSHAKE' command message.
 */
export const createGreetingHandshakeMessage = (secret: Buffer, params = []): WithTypeUrl<Command> => {
  assert(Buffer.isBuffer(secret), 'Secret is not a buffer.');
  assert(Array.isArray(params));

  return {
    '@type': TYPE_URL_GREETING_COMMAND,
    command: Command.Type.HANDSHAKE,
    params,
    secret
  };
};

/**
 * Create a Greeting 'NOTARIZE' command message.
 */
export const createGreetingNotarizeMessage = (secret: Buffer, credentialMessages: WithTypeUrl<SignedMessage|Message>[]): WithTypeUrl<Command> => {
  assert(Buffer.isBuffer(secret), 'Secret is not a buffer.');
  assert(Array.isArray(credentialMessages));

  return {
    '@type': TYPE_URL_GREETING_COMMAND,
    command: Command.Type.NOTARIZE,
    params: credentialMessages,
    secret
  };
};

/**
 * Create a Greeting 'FINISH' command message.
 */
export const createGreetingFinishMessage = (secret: Buffer): WithTypeUrl<Command> => {
  assert(Buffer.isBuffer(secret), 'Secret is not a buffer.');

  return {
    '@type': TYPE_URL_GREETING_COMMAND,
    command: Command.Type.FINISH,
    secret,
    params: []
  };
};

/**
 * Create a Greeting 'CLAIM' command message.
 */
export const createGreetingClaimMessage = (invitationID: Buffer): WithTypeUrl<Command> => {
  assert(Buffer.isBuffer(invitationID), 'invitationID is not a buffer.');

  return {
    '@type': TYPE_URL_GREETING_COMMAND,
    command: Command.Type.CLAIM,
    params: [
      {
        '@type': 'google.protobuf.BytesValue',
        value: invitationID
      }
    ]
  };
};

/**
 * Crate a Greeting ClaimResponse message.
 * @param {Buffer} id   The ID of the new invitation.
 * @param {Buffer} rendezvousKey   The swarm key to use for Greeting.
 * @returns {{'@type': string, payload: {'@type': string, rendezvousKey: *, id: *}}}
 */
export const createGreetingClaimResponse = (id: Buffer, rendezvousKey: Buffer): WithTypeUrl<ClaimResponse> => {
  assert(id);
  assert(Buffer.isBuffer(rendezvousKey), 'rendezvousKey is not a buffer.');

  return {
    '@type': 'dxos.halo.credentials.greet.ClaimResponse',
    id,
    rendezvousKey
  };
};
