//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref } from '@dxos/echo';
import * as AgentChannels from '@dxos/plugin-agent/AgentChannels';
import { File } from '@dxos/types';

import * as DiscordBot from './DiscordBot.ts';

//
// How an agent acts in Discord. Its written text is not posted anywhere: these are the only ways it speaks there.
// The ids come from the header of the message it is answering.
//

const agent = Ref.Ref(Agent.Agent).annotate({ description: 'The agent acting.' });

const Posted = Schema.Struct({
  channel: Schema.String.annotate({ description: 'The Discord channel (or DM) it was posted in.' }),
  message: Schema.optional(Schema.String.annotate({ description: 'The id of the message posted.' })),
});

/** Posts in a Discord channel or thread. */
export const Reply = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discord.sendMessage'),
    name: 'Reply in Discord',
    description:
      'Posts a message in a Discord channel or thread: the one a message came from, or any other the agent is in.',
    icon: 'ph--chat-circle-text--regular',
  },
  services: [Database.Service, DiscordBot.DiscordBotService],
  input: Schema.Struct({
    agent,
    channel: Schema.String.annotate({
      description: "Where to post: the header's `thread` (the conversation) or `channel`, or another channel id.",
    }),
    text: Schema.String.annotate({ description: 'The message, in Discord markdown.' }),
    replyTo: Schema.optional(
      Schema.String.annotate({ description: 'A message id (`message` in the header) to reply to.' }),
    ),
    files: Schema.optional(
      Schema.Array(Ref.Ref(File.File)).check(Schema.isMaxLength(DiscordBot.MAX_ATTACHMENTS)).annotate({
        description:
          'Files to attach (at most 10, images, videos, documents up to 10 MB each), as references to File objects in the space.',
      }),
    ),
  }),
  output: Posted,
}).pipe(AgentChannels.channelSend);

/** Sends a Discord direct message. */
export const DirectMessage = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discord.sendDirectMessage'),
    name: 'Direct message in Discord',
    description: 'Sends a person a Discord direct message.',
    icon: 'ph--paper-plane-tilt--regular',
  },
  services: [Database.Service, DiscordBot.DiscordBotService],
  input: Schema.Struct({
    agent,
    to: Schema.String.annotate({
      description: 'The person: their Discord user id (`from` in the header), @username, or name as you know them.',
    }),
    text: Schema.String.annotate({ description: 'The message, in Discord markdown.' }),
    files: Schema.optional(
      Schema.Array(Ref.Ref(File.File)).check(Schema.isMaxLength(DiscordBot.MAX_ATTACHMENTS)).annotate({
        description:
          'Files to attach (at most 10, images, videos, documents up to 10 MB each), as references to File objects in the space.',
      }),
    ),
  }),
  output: Posted,
}).pipe(AgentChannels.channelSend);

/** Reacts to a Discord message. */
export const React = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discord.addReaction'),
    name: 'React in Discord',
    description: 'Adds an emoji reaction to a Discord message, e.g. 👍 to acknowledge it without replying.',
    icon: 'ph--smiley--regular',
  },
  services: [Database.Service, DiscordBot.DiscordBotService],
  input: Schema.Struct({
    agent,
    channel: Schema.String.annotate({ description: 'The Discord channel or thread id of the message.' }),
    message: Schema.String.annotate({ description: 'The message id (`message` in the header).' }),
    emoji: Schema.String.annotate({ description: 'A unicode emoji, e.g. 👍.' }),
  }),
  output: Schema.Struct({}),
});
