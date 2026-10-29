//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { DiscordAgentOperation, DiscordChannel } from '#types';

export const operations: readonly Operation.Definition.Any[] = [
  DiscordAgentOperation.Reply,
  DiscordAgentOperation.DirectMessage,
  DiscordAgentOperation.React,
];

const tool = Operation.toolName;

export const key = DiscordChannel.SKILL_KEY;

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Discord',
    description: 'Acts in Discord: replies in a channel or thread, sends direct messages, reacts to messages.',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        Discord messages reach you with a header such as
        \`[discord #general; channel 111; thread 222; message 222; from @rich (333); addressed: mentioned]\`.
        Nothing you write is posted to Discord: you act only through these tools, and doing nothing is a choice.
        When you answer a question or request, deliver it with ${tool(DiscordAgentOperation.Reply)} or
        ${tool(DiscordAgentOperation.DirectMessage)}; an answer you only write out never reaches anyone.

        - ${tool(DiscordAgentOperation.Reply)}: post a message. To answer in the conversation, pass the header's
          \`thread\` (started on your first post there), or its \`channel\` when it names no thread (a thread you are
          already in, a DM). To post in the channel itself instead, pass \`channel\`, with \`replyTo\` set to the
          \`message\` you answer. Any other channel you are in works too.
        - ${tool(DiscordAgentOperation.React)}: react to a message (\`channel\` and \`message\`), e.g. ${'\u{1F44D}'} to
          acknowledge it when a reply would add nothing.
        - ${tool(DiscordAgentOperation.DirectMessage)}: message a person directly; \`to\` is their user id (the number
          after \`from\`), their @username, or their name.
        - To send a picture, video or document, pass \`files\`: references to File objects (\`echo://...\` URIs you were
          given), up to 10 MB each, with a short \`text\` saying what it is.

        Pick what the request needs, and it may be somewhere other than where it came from: "tell Rich the agent is
        ready" is a direct message to Rich, perhaps with a ${'\u{1F44D}'} on the request. Do one thing per intent, never post the
        same text twice, and when you were not addressed, do nothing.
      `,
    }),
  });
