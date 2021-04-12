//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { ClaimResponse, Command, SignedMessage, Message } from '../proto';
import { WithTypeUrl } from '../proto/any';

const TYPE_URL_GREETING_COMMAND = 'dxos.credentials.greet.Command';

/**
 * Create a Greeting 'BEGIN' command message.
 * @returns {{__type_url: string, command: *}}
 */
export const createGreetingBeginMessage = (): WithTypeUrl<Command> => {
  return {
    __type_url: TYPE_URL_GREETING_COMMAND,
    command: Command.Type.BEGIN
  };
};

/**
 * Create a Greeting 'HANDSHAKE' command message.
 */
export const createGreetingHandshakeMessage = (secret: Buffer, params = []): WithTypeUrl<Command> => {
  assert(Buffer.isBuffer(secret));
  assert(Array.isArray(params));

  return {
    __type_url: TYPE_URL_GREETING_COMMAND,
    command: Command.Type.HANDSHAKE,
    params,
    secret
  };
};

/**
 * Create a Greeting 'NOTARIZE' command message.
 */
export const createGreetingNotarizeMessage = (secret: Buffer, credentialMessages: WithTypeUrl<SignedMessage|Message>[]): WithTypeUrl<Command> => {
  assert(Buffer.isBuffer(secret));
  assert(Array.isArray(credentialMessages));

  return {
    __type_url: TYPE_URL_GREETING_COMMAND,
    command: Command.Type.NOTARIZE,
    params: credentialMessages,
    secret
  };
};

/**
 * Create a Greeting 'FINISH' command message.
 */
export const createGreetingFinishMessage = (secret: Buffer): WithTypeUrl<Command> => {
  assert(Buffer.isBuffer(secret));

  return {
    __type_url: TYPE_URL_GREETING_COMMAND,
    command: Command.Type.FINISH,
    secret
  };
};

/**
 * Create a Greeting 'CLAIM' command message.
 */
export const createGreetingClaimMessage = (invitationID: Buffer): WithTypeUrl<Command> => {
  assert(Buffer.isBuffer(invitationID));

  return {
    __type_url: TYPE_URL_GREETING_COMMAND,
    command: Command.Type.CLAIM,
    params: [
      {
        __type_url: 'google.protobuf.BytesValue',
        value: invitationID
      }
    ]
  };
};

/**
 * Crate a Greeting ClaimResponse message.
 * @param {Buffer} id   The ID of the new invitation.
 * @param {Buffer} rendezvousKey   The swarm key to use for Greeting.
 * @returns {{__type_url: string, payload: {__type_url: string, rendezvousKey: *, id: *}}}
 */
export const createGreetingClaimResponse = (id: Buffer, rendezvousKey: Buffer): WithTypeUrl<ClaimResponse> => {
  assert(id);
  assert(Buffer.isBuffer(rendezvousKey));

  return {
    __type_url: 'dxos.credentials.greet.ClaimResponse',
    id,
    rendezvousKey
  };
};
