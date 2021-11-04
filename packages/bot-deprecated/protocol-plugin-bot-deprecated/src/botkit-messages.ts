//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { keyToString } from '@dxos/crypto';

import { Message, SpawnOptions, Status } from './proto';

export const COMMAND_SPAWN = 'dxos.protocol.bot.Spawn';
export const COMMAND_SPAWN_AND_INVITE = 'dxos.protocol.bot.SpawnAndInvite';
export const SPAWN_RESPONSE = 'dxos.protocol.bot.SpawnResponse';

export const COMMAND_STATUS = 'dxos.protocol.bot.GetStatus';
export const STATUS_RESPONSE = 'dxos.protocol.bot.Status';

export const COMMAND_INVITE = 'dxos.protocol.bot.Invite';
export const COMMAND_MANAGE = 'dxos.protocol.bot.Manage';
export const COMMAND_RESET = 'dxos.protocol.bot.Reset';
export const COMMAND_STOP = 'dxos.protocol.bot.Stop';
export const COMMAND_RESPONSE = 'dxos.protocol.bot.CommandResponse';

/**
 * Creates a new spawn command message.
 */
export const createSpawnCommand = (botName: string | undefined, options?: SpawnOptions): Message => {
  return {
    message: {
      __type_url: COMMAND_SPAWN,
      botName,
      options
    }
  };
};

export const createSpawnAndInviteCommand = (botName: string | undefined, topic: Buffer, invitation: string, options?: SpawnOptions): Message => {
  return {
    message: {
      __type_url: COMMAND_SPAWN_AND_INVITE,
      botName,
      topic: keyToString(topic),
      invitation,
      options
    }
  };
};

/**
 * Creates a new bot management command message.
 */
export const createBotManagementCommand = (botId: string, command: string): Message => {
  assert(botId);
  assert(command);

  return {
    message: {
      __type_url: COMMAND_MANAGE,
      botId,
      command
    }
  };
};

/**
 * Creates reset command.
 */
export const createResetCommand = (source: boolean): Message => {
  return {
    message: {
      __type_url: COMMAND_RESET,
      source
    }
  };
};

/**
 * Creates stop command.
 */
export const createStopCommand = (errorCode: string): Message => {
  return {
    message: {
      __type_url: COMMAND_STOP,
      errorCode
    }
  };
};

/**
 * Creates status command message.
 */
export const createStatusCommand = (): Message => {
  return {
    message: {
      __type_url: COMMAND_STATUS
    }
  };
};

/**
 * Creates status response message.
 */
export const createStatusResponse = (version: string, platform: string, uptime: string, bots: Status.Bot[]): Message => {
  return {
    message: {
      __type_url: STATUS_RESPONSE,
      version,
      platform,
      uptime,
      bots
    }
  };
};

/**
 * Creates spawn response message.
 */
export const createSpawnResponse = (botId?: string, error?: string): Message => {
  return {
    message: {
      __type_url: SPAWN_RESPONSE,
      botId,
      error
    }
  };
};

/**
 * Creates a new invitation command message.
 */
export const createInvitationCommand = (botId: string, topic: Buffer, modelOptions: string, invitation: string): Message => {
  assert(botId);
  assert(topic);
  assert(modelOptions);
  assert(Buffer.isBuffer(topic));

  return {
    message: {
      __type_url: COMMAND_INVITE,
      botId,
      topic: keyToString(topic),
      modelOptions,
      invitation
    }
  };
};

/**
 * Creates arbitrary response message.
 */
export const createCommandResponse = (status: string, error: string): Message => {
  return {
    message: {
      __type_url: COMMAND_RESPONSE,
      status,
      error
    }
  };
};
