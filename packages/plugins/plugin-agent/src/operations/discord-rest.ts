//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import type * as Chat from '@dxos/assistant/Chat';
import { Database, Feed, type Ref } from '@dxos/echo';
import { isManagedAccessToken } from '@dxos/protocols';
import { Message } from '@dxos/types';

import { type DiscordBinding } from '#types';

import { ensureThreadChat } from './ensure-thread-chat.ts';
import { AgentOperationError } from './errors.ts';

/** Discord REST API (v10); a reference so a test or a fake Discord can point it elsewhere. */
export const DiscordApiBase = Context.Reference<string>('@dxos/plugin-agent/DiscordApiBase', {
  defaultValue: () => 'https://discord.com/api/v10',
});

/** Discord's per-message content limit. */
export const MAX_MESSAGE_LENGTH = 2000;

/** "Cannot send messages to this user": DMs closed, or no server shared with the bot. */
const CANNOT_MESSAGE_USER = 50007;

/** Splits text into posts within the limit, preferring line then word boundaries. */
export const chunkText = (text: string, limit = MAX_MESSAGE_LENGTH): string[] => {
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    const window = rest.slice(0, limit);
    const newline = window.lastIndexOf('\n');
    const space = window.lastIndexOf(' ');
    // Only break early on a boundary in the back half, so a long unbroken run still fills the post.
    const cut = newline > limit / 2 ? newline : space > limit / 2 ? space : limit;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^[\n ]/, '');
  }
  if (rest.length > 0 || chunks.length === 0) {
    chunks.push(rest);
  }
  return chunks;
};

/** The fields read from any Discord response: a created object's id, or an error's code and message. */
const DiscordBody = Schema.Struct({
  id: Schema.optional(Schema.String),
  code: Schema.optional(Schema.Number),
  message: Schema.optional(Schema.String),
});

type DiscordBody = Schema.Schema.Type<typeof DiscordBody>;

type DiscordResponse = { ok: boolean; status: number; body: DiscordBody };

const decodeBody = (value: unknown): DiscordBody =>
  Schema.decodeUnknownOption(DiscordBody)(value).pipe(Option.getOrElse((): DiscordBody => ({})));

/** One authenticated JSON POST; the token goes only into the header, never into errors or logs. */
const post = (token: string, path: string, payload: unknown) =>
  Effect.gen(function* () {
    const base = yield* DiscordApiBase;
    return yield* Effect.tryPromise({
      try: async (): Promise<DiscordResponse> => {
        // Read at call time, not captured, so a test or host can substitute `fetch`.
        const response = await globalThis.fetch(`${base}${path}`, {
          method: 'POST',
          headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        // Error bodies are not always JSON (a proxy's HTML 502), and only the status matters then.
        const body = await response.json().catch(() => undefined);
        return { ok: response.ok, status: response.status, body: decodeBody(body) };
      },
      catch: (cause) => new AgentOperationError({ message: `Discord request to ${path} failed.`, cause }),
    });
  });

/** Turns a Discord error response into a reason the agent can relay to a person. */
const failureReason = (response: DiscordResponse): string => {
  const { code, message } = response.body;
  if (code === CANNOT_MESSAGE_USER) {
    return 'Discord will not let the bot message this user: their DMs are closed or they share no server with the bot.';
  }
  if (response.status === 403) {
    return `The bot lacks permission to post there (Discord 403${typeof message === 'string' ? `: ${message}` : ''}).`;
  }
  return `Discord answered ${response.status}${typeof message === 'string' ? `: ${message}` : ''}.`;
};

export type SendDiscordProps = {
  binding: Ref.Ref<DiscordBinding.DiscordBinding>;
  userId?: string;
  channelId?: string;
  text: string;
};

export type SendDiscordResult = {
  delivered: boolean;
  channelId?: string;
  messageIds?: string[];
  reason?: string;
  /** The chat the posts were recorded in. */
  chat?: Chat.Chat;
};

/**
 * Posts as the binding's bot (DM to `userId`, or into `channelId`) and records each post in the
 * agent's chat for that channel; the recorded messages carry `properties.discord.messageId`, which
 * is how EDGE's mirror knows not to post them a second time.
 */
export const sendDiscord = Effect.fnUntraced(function* ({
  binding: bindingRef,
  userId,
  channelId,
  text,
}: SendDiscordProps) {
  if ((userId === undefined) === (channelId === undefined)) {
    return yield* Effect.fail(new AgentOperationError({ message: 'Pass exactly one of userId or channelId.' }));
  }

  const binding = yield* Database.load(bindingRef).pipe(Effect.orDie);
  const accessToken = yield* Database.load(binding.accessToken).pipe(Effect.orDie);
  if (isManagedAccessToken(accessToken.token)) {
    return {
      delivered: false,
      reason: 'The bot token is managed by EDGE, which sending messages does not support yet; use a pasted bot token.',
    } satisfies SendDiscordResult;
  }
  const token = accessToken.token;

  let target = channelId;
  if (userId !== undefined) {
    const response = yield* post(token, '/users/@me/channels', { recipient_id: userId });
    const id = response.body.id;
    if (!response.ok || typeof id !== 'string') {
      return { delivered: false, reason: failureReason(response) } satisfies SendDiscordResult;
    }
    target = id;
  }
  if (target === undefined) {
    return { delivered: false, reason: 'No Discord channel to post in.' } satisfies SendDiscordResult;
  }

  const chunks = chunkText(text);
  const messageIds: string[] = [];
  for (const content of chunks) {
    const response = yield* post(token, `/channels/${encodeURIComponent(target)}/messages`, {
      content,
      // The agent must never ping anyone by echoing a mention it was given.
      allowed_mentions: { parse: [] },
    });
    const id = response.body.id;
    if (!response.ok || typeof id !== 'string') {
      return {
        delivered: false,
        channelId: target,
        messageIds: messageIds.length > 0 ? messageIds : undefined,
        reason: failureReason(response),
      } satisfies SendDiscordResult;
    }
    messageIds.push(id);
  }

  const agent = yield* Database.load(binding.agent).pipe(Effect.orDie);
  const chat = yield* ensureThreadChat({
    agent,
    threadId: target,
    source: userId !== undefined ? 'discord.com/dm' : 'discord.com',
  }).pipe(Effect.orDie);
  const feed = yield* Database.load(chat.feed).pipe(Effect.orDie);
  yield* Feed.append(
    feed,
    messageIds.map((messageId, index) =>
      Message.make({
        sender: { role: 'assistant', name: agent.name },
        blocks: [{ _tag: 'text', text: chunks[index] }],
        properties: { discord: { channelId: target, messageId } },
      }),
    ),
  );

  return { delivered: true, channelId: target, messageIds, chat } satisfies SendDiscordResult;
});
