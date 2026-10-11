//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { DISCORD_API_BASE } from '../constants.ts';
import { DiscordChannelError } from '../errors.ts';

/**
 * Discord REST base for the bot's posts; a reference so a test or a fake Discord can point it
 * elsewhere. Plain `fetch` rather than dfx so posting runs on EDGE as well as in the app.
 */
export const DiscordApiBase = Context.Reference<string>('@dxos/plugin-discord/DiscordApiBase', {
  defaultValue: () => DISCORD_API_BASE,
});

/**
 * The `fetch` Discord calls go through: the platform's own by default (EDGE), replaced by the integration proxy where
 * Discord's missing CORS headers would make a browser refuse the response.
 */
export const DiscordFetch = Context.Reference<typeof fetch>('@dxos/plugin-discord/DiscordFetch', {
  defaultValue: () => (input, init) => globalThis.fetch(input, init),
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

/** One authenticated JSON request; the token goes only into the header, never into errors or logs. */
const request = Effect.fnUntraced(function* (
  method: 'POST' | 'DELETE',
  token: string,
  path: string,
  payload?: unknown,
) {
  const base = yield* DiscordApiBase;
  const discordFetch = yield* DiscordFetch;
  return yield* Effect.tryPromise({
    try: async (): Promise<DiscordResponse> => {
      const response = await discordFetch(`${base}${path}`, {
        method,
        headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      });
      // Error bodies are not always JSON (a proxy's HTML 502), and only the status matters then.
      const body = await response.json().catch(() => undefined);
      return { ok: response.ok, status: response.status, body: decodeBody(body) };
    },
    catch: (cause) => new DiscordChannelError({ message: `Discord request to ${path} failed.`, cause }),
  });
});

const post = (token: string, path: string, payload: unknown) => request('POST', token, path, payload);

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

/** Opens (or returns) the bot's DM channel with a Discord user. */
export const openDirectMessage: (token: string, userId: string) => Effect.Effect<string, DiscordChannelError> =
  Effect.fnUntraced(function* (token, userId) {
    const response = yield* post(token, '/users/@me/channels', { recipient_id: userId });
    const id = response.body.id;
    if (!response.ok || typeof id !== 'string') {
      return yield* Effect.fail(new DiscordChannelError({ message: failureReason(response) }));
    }
    return id;
  });

/** Posts text into a Discord channel, thread or DM channel, split past the length limit; returns the post ids. */
export const postText: (
  token: string,
  channelId: string,
  text: string,
) => Effect.Effect<string[], DiscordChannelError> = Effect.fnUntraced(function* (token, channelId, text) {
  const messageIds: string[] = [];
  for (const content of chunkText(text)) {
    const response = yield* post(token, `/channels/${encodeURIComponent(channelId)}/messages`, {
      content,
      // The bot must never ping anyone by echoing a mention it was given.
      allowed_mentions: { parse: [] },
    });
    const id = response.body.id;
    if (!response.ok || typeof id !== 'string') {
      return yield* Effect.fail(new DiscordChannelError({ message: failureReason(response) }));
    }
    messageIds.push(id);
  }
  return messageIds;
});

/** Deletes a Discord thread for everyone in it; Discord requires the bot to hold Manage Threads. */
export const deleteThread: (token: string, threadId: string) => Effect.Effect<void, DiscordChannelError> =
  Effect.fnUntraced(function* (token, threadId) {
    const response = yield* request('DELETE', token, `/channels/${encodeURIComponent(threadId)}`);
    if (!response.ok) {
      const reason =
        response.status === 403
          ? 'The bot lacks Manage Threads in this server; reinstall it from Discord setup to grant it.'
          : failureReason(response);
      return yield* Effect.fail(new DiscordChannelError({ message: reason }));
    }
  });
