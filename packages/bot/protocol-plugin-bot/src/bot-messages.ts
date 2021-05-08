//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { InvitationMessage, Message } from './proto';

export const COMMAND_SIGN = 'dxos.protocol.bot.SignChallenge';
export const SIGN_RESPONSE = 'dxos.protocol.bot.SignChallengeResponse';
export const COMMAND_BOT_INVITE = 'dxos.protocol.bot.InvitationMessage';
export const BOT_COMMAND = 'dxos.protocol.bot.BotCommand';
export const BOT_COMMAND_RESPONSE = 'dxos.protocol.bot.BotCommandResponse';
export const BOT_EVENT = 'dxos.protocol.bot.BotEvent';

export const MESSAGE_CONFIRM = 'dxos.protocol.bot.ConfirmConnection';

/**
 * Creates a new Sign command message.
 */
export const createSignCommand = (message: Buffer): Message => {
  assert(message);
  assert(Buffer.isBuffer(message));

  return {
    message: {
      __type_url: COMMAND_SIGN,
      message
    }
  };
};

/**
 * Creates a response for Sign command message.
 */
export const createSignResponse = (signature: Buffer): Message => {
  assert(signature);
  assert(Buffer.isBuffer(signature));

  return {
    message: {
      __type_url: SIGN_RESPONSE,
      signature
    }
  };
};

/**
 * Creates a new connection confirmation message.
 */
export const createConnectConfirmMessage = (botId: string): Message => {
  assert(botId);

  return {
    message: {
      __type_url: MESSAGE_CONFIRM,
      botId
    }
  };
};

/**
 * Creates a new invitation message.
 */
export const createInvitationMessage = (topic: string, invitation: InvitationMessage.Invitation): Message => {
  assert(topic);
  assert(invitation);

  return {
    message: {
      __type_url: COMMAND_BOT_INVITE,
      topic,
      invitation
    }
  };
};

/**
 * Create arbitrary message to bot.
 */
export const createBotCommand = (botId: string, command: Buffer): Message => {
  assert(botId);
  assert(command);

  return {
    message: {
      __type_url: BOT_COMMAND,
      botId,
      command
    }
  };
};

/**
 * Create arbitrary message response from bot.
 */
export const createBotCommandResponse = (data?: Buffer, error?: string): Message => {
  return {
    message: {
      __type_url: BOT_COMMAND_RESPONSE,
      data,
      error
    }
  };
};

/**
 * Create Bot event.
 * @param {string} botId
 * @param {string} type
 * @param {Buffer} data
 */
export const createEvent = (botId: string, type: string, data: Buffer): Message => {
  assert(botId);
  assert(type);

  return {
    message: {
      __type_url: BOT_EVENT,
      botId,
      type,
      data
    }
  };
};
