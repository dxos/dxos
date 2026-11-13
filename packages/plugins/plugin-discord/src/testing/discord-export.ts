//
// Copyright 2026 DXOS.org
//

// A port of DiscordChatExporter's core (Tyrrrz/DiscordChatExporter): reads channels, and their threads, through
// Discord's REST API and writes one JSON file per channel in DiscordChatExporter's JSON layout, so its output and the
// tool's are interchangeable.
//
// Auth: DISCORD_EXPORT_TOKEN, else the first `KEY=value` of `.secrets/discord-export.env`. A bot token works on servers
// the bot was added to. A user token reads whatever that account can read, but automating a user account
// ("self-botting") breaks Discord's Terms of Service and can get the account banned — use one only where that risk
// is accepted.
//
//   pnpm exec tsx src/testing/discord-export.ts --channel <id>[,<id>…] | --guild <id>
//     [--days <n> | --after <iso date>] [--before <iso date>] [--no-threads] [--out <dir>]

import type * as Cause from 'effect/Cause';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import * as EffectEx from '@dxos/effect/EffectEx';

import { snowflakeForTimestamp } from '../services/discord-message.ts';

const API = 'https://discord.com/api/v10';
const PAGE = 100;
const THREAD_PAGE = 25;
const MAX_RETRIES = 6;

//
// Discord's response shapes (the fields this exporter reads).
//

type User = { id: string; username: string; global_name?: string | null; discriminator?: string; bot?: boolean };
type Attachment = { id: string; url: string; filename: string; size: number };
type Message = {
  id: string;
  type: number;
  timestamp: string;
  edited_timestamp: string | null;
  pinned: boolean;
  content: string;
  author: User;
  mentions: User[];
  attachments: Attachment[];
  message_reference?: { message_id?: string; channel_id?: string; guild_id?: string };
  thread?: { id: string; name: string };
};
type Channel = {
  id: string;
  type: number;
  guild_id?: string;
  parent_id?: string | null;
  name?: string;
  topic?: string | null;
};
type Guild = { id: string; name: string };
type ThreadSearch = { threads: Channel[]; has_more: boolean };

/** Text, announcement and forum channels hold messages or threads; categories and voice channels are skipped. */
const EXPORTABLE = new Set([0, 5, 15]);
const THREAD_TYPES = new Set([10, 11, 12]);

const MESSAGE_TYPES: Record<number, string> = {
  0: 'Default',
  6: 'ChannelPinnedMessage',
  7: 'GuildMemberJoin',
  18: 'ThreadCreated',
  19: 'Reply',
  21: 'ThreadStarterMessage',
};
const CHANNEL_TYPES: Record<number, string> = {
  0: 'GuildTextChat',
  5: 'GuildNews',
  10: 'GuildNewsThread',
  11: 'GuildPublicThread',
  12: 'GuildPrivateThread',
  15: 'GuildForum',
};

//
// Transport: one request at a time, paced by Discord's rate-limit headers.
//

/** A request Discord refused (`status`), or a run that cannot start. */
class ExportError extends Data.TaggedError('ExportError')<{ readonly message: string; readonly status?: number }> {}

const secondsHeader = (headers: Headers, name: string): number | undefined => {
  const value = headers.get(name);
  return value === null ? undefined : Number(value);
};

/**
 * A GET against the API. A bucket with no requests left waits out its reset before the next call; a 429 waits the
 * `retry_after` Discord names, and a 5xx backs off exponentially — both bounded by {@link MAX_RETRIES}.
 */
const makeClient = (authorization: string) => {
  const get = <T>(path: string, attempt = 0): Effect.Effect<T, ExportError | Cause.UnknownError> =>
    Effect.gen(function* () {
      const response = yield* Effect.tryPromise(() =>
        fetch(`${API}/${path}`, { headers: { Authorization: authorization } }),
      );
      if (response.status === 429 && attempt < MAX_RETRIES) {
        const body: { retry_after?: number } = yield* Effect.tryPromise(() => response.json());
        yield* Effect.sleep(`${Math.ceil((body.retry_after ?? 1) * 1000)} millis`);
        return yield* get<T>(path, attempt + 1);
      }
      if (response.status >= 500 && attempt < MAX_RETRIES) {
        yield* Effect.sleep(`${2 ** attempt * 500} millis`);
        return yield* get<T>(path, attempt + 1);
      }
      if (!response.ok) {
        return yield* Effect.fail(
          new ExportError({ message: `Discord answered ${response.status} for ${path}`, status: response.status }),
        );
      }
      if (secondsHeader(response.headers, 'x-ratelimit-remaining') === 0) {
        yield* Effect.sleep(
          `${Math.ceil((secondsHeader(response.headers, 'x-ratelimit-reset-after') ?? 1) * 1000)} millis`,
        );
      }
      const body: T = yield* Effect.tryPromise(() => response.json());
      return body;
    });
  return { get };
};

type Client = ReturnType<typeof makeClient>;

/**
 * The header a token authenticates with: a user token is sent bare and a bot token as `Bot <token>`. Like
 * DiscordChatExporter, try the bare form first and fall back when Discord rejects it.
 */
const authorize = (token: string) =>
  Effect.gen(function* () {
    for (const authorization of [token, `Bot ${token}`]) {
      const me = yield* makeClient(authorization)
        .get<User>('users/@me')
        .pipe(
          Effect.catchIf(
            (error) => error._tag === 'ExportError' && error.status === 401,
            () => Effect.succeed(undefined),
          ),
        );
      if (me) {
        return { client: makeClient(authorization), me, kind: authorization === token ? 'user' : 'bot' } as const;
      }
    }
    return yield* Effect.fail(
      new ExportError({ message: 'Discord rejected the token as both a user and a bot token.' }),
    );
  });

//
// Crawl.
//

/** Every message after `after` and before `before`, oldest first, a page of 100 per request. */
const messagesOf = (client: Client, channelId: string, after: string, before: string | undefined) =>
  Effect.gen(function* () {
    const all: Message[] = [];
    let cursor = after;
    while (true) {
      const page = yield* client.get<Message[]>(`channels/${channelId}/messages?after=${cursor}&limit=${PAGE}`);
      const sorted = [...page].sort((left, right) => (BigInt(left.id) < BigInt(right.id) ? -1 : 1));
      const inRange = before ? sorted.filter((message) => BigInt(message.id) < BigInt(before)) : sorted;
      all.push(...inRange);
      process.stdout.write(`\r  ${all.length} messages`);
      if (page.length < PAGE || inRange.length < sorted.length) {
        break;
      }
      cursor = sorted[sorted.length - 1].id;
    }
    process.stdout.write('\n');
    return all;
  });

/**
 * A channel's threads, active and archived. A user token reaches them through the client's thread search, which pages
 * by offset; a bot uses the guild's active list plus the channel's archived public threads, paged by archive time.
 */
const threadsOf = (client: Client, kind: 'user' | 'bot', channel: Channel) =>
  Effect.gen(function* () {
    const found = new Map<string, Channel>();
    if (kind === 'user') {
      for (const archived of [false, true]) {
        for (let offset = 0; ; offset += THREAD_PAGE) {
          const page = yield* client.get<ThreadSearch>(
            `channels/${channel.id}/threads/search?archived=${archived}&sort_by=last_message_time&sort_order=desc&limit=${THREAD_PAGE}&offset=${offset}`,
          );
          page.threads.forEach((thread) => found.set(thread.id, thread));
          if (!page.has_more || page.threads.length === 0) {
            break;
          }
        }
      }
    } else {
      const active = yield* client.get<{ threads: Channel[] }>(`guilds/${channel.guild_id}/threads/active`);
      active.threads
        .filter((thread) => thread.parent_id === channel.id)
        .forEach((thread) => found.set(thread.id, thread));
      let before: string | undefined;
      while (true) {
        const page = yield* client.get<{
          threads: (Channel & { thread_metadata?: { archive_timestamp: string } })[];
          has_more: boolean;
        }>(
          `channels/${channel.id}/threads/archived/public?limit=100${before ? `&before=${encodeURIComponent(before)}` : ''}`,
        );
        page.threads.forEach((thread) => found.set(thread.id, thread));
        const last = page.threads[page.threads.length - 1]?.thread_metadata?.archive_timestamp;
        if (!page.has_more || !last) {
          break;
        }
        before = last;
      }
    }
    return [...found.values()];
  });

//
// DiscordChatExporter's JSON layout.
//

const exportUser = (user: User) => ({
  id: user.id,
  name: user.username,
  discriminator: user.discriminator ?? '0000',
  nickname: user.global_name || user.username,
  isBot: user.bot ?? false,
});

const exportMessage = (message: Message) => ({
  id: message.id,
  type: MESSAGE_TYPES[message.type] ?? `Unknown(${message.type})`,
  timestamp: message.timestamp,
  timestampEdited: message.edited_timestamp,
  isPinned: message.pinned,
  content: message.content,
  author: exportUser(message.author),
  attachments: message.attachments.map((attachment) => ({
    id: attachment.id,
    url: attachment.url,
    fileName: attachment.filename,
    fileSizeBytes: attachment.size,
  })),
  mentions: message.mentions.map(exportUser),
  ...(message.message_reference?.message_id
    ? {
        reference: {
          messageId: message.message_reference.message_id,
          channelId: message.message_reference.channel_id ?? null,
          guildId: message.message_reference.guild_id ?? null,
        },
      }
    : {}),
});

const exportDocument = (
  guild: Guild,
  channel: Channel,
  parent: Channel | undefined,
  messages: Message[],
  range: Range,
) => ({
  guild: { id: guild.id, name: guild.name },
  channel: {
    id: channel.id,
    type: CHANNEL_TYPES[channel.type] ?? `Unknown(${channel.type})`,
    // DiscordChatExporter files a thread under its parent channel, as a channel under its category.
    categoryId: parent?.id ?? channel.parent_id ?? null,
    category: parent?.name ?? null,
    name: channel.name ?? channel.id,
    topic: channel.topic ?? null,
  },
  dateRange: { after: range.afterDate ?? null, before: range.beforeDate ?? null },
  exportedAt: new Date().toISOString(),
  messages: messages.map(exportMessage),
  messageCount: messages.length,
});

type Range = { after: string; before?: string; afterDate?: string; beforeDate?: string };

//
// Entry point.
//

const readToken = (): string | undefined => {
  if (process.env.DISCORD_EXPORT_TOKEN) {
    return process.env.DISCORD_EXPORT_TOKEN;
  }
  const file = resolve(import.meta.dirname, '../../../../../.secrets/discord-export.env');
  if (!existsSync(file)) {
    return undefined;
  }
  const line = readFileSync(file, 'utf8')
    .split('\n')
    .find((entry) => /^\w+=./.test(entry));
  return line?.slice(line.indexOf('=') + 1).trim();
};

const { values: args } = parseArgs({
  options: {
    'channel': { type: 'string' },
    'guild': { type: 'string' },
    'days': { type: 'string' },
    'after': { type: 'string' },
    'before': { type: 'string' },
    'no-threads': { type: 'boolean', default: false },
    'out': { type: 'string', default: join(homedir(), '.local/share/dxos/discord-export') },
  },
});

const program = Effect.gen(function* () {
  const token = readToken();
  if (!token) {
    return yield* Effect.fail(
      new ExportError({ message: 'Set DISCORD_EXPORT_TOKEN or fill .secrets/discord-export.env.' }),
    );
  }
  const channelIds = args.channel?.split(',').map((id) => id.trim()) ?? [];
  if (channelIds.length === 0 && !args.guild) {
    return yield* Effect.fail(new ExportError({ message: 'Name --channel <id>[,<id>…] or --guild <id>.' }));
  }
  const { client, me, kind } = yield* authorize(token);
  console.log(`Authenticated as ${me.username} (${kind} token).`);

  const afterDate =
    args.after ?? (args.days ? new Date(Date.now() - Number(args.days) * 86_400_000).toISOString() : undefined);
  const range: Range = {
    after: afterDate ? snowflakeForTimestamp(Date.parse(afterDate)) : '0',
    ...(args.before ? { before: snowflakeForTimestamp(Date.parse(args.before)), beforeDate: args.before } : {}),
    ...(afterDate ? { afterDate } : {}),
  };

  const channels: Channel[] = args.guild
    ? (yield* client.get<Channel[]>(`guilds/${args.guild}/channels`)).filter((channel) => EXPORTABLE.has(channel.type))
    : yield* Effect.forEach(channelIds, (id) => client.get<Channel>(`channels/${id}`));

  mkdirSync(args.out, { recursive: true });
  const guilds = new Map<string, Guild>();
  for (const channel of channels) {
    const guildId = channel.guild_id ?? args.guild ?? '';
    const guild = guilds.get(guildId) ?? (yield* client.get<Guild>(`guilds/${guildId}`));
    guilds.set(guildId, guild);
    const write = (target: Channel, parent: Channel | undefined, messages: Message[]) => {
      const file = join(
        args.out,
        `${guild.name} - ${parent ? `${parent.name} - ` : ''}${target.name ?? target.id} [${target.id}].json`.replace(
          /[/\\:]/g,
          '_',
        ),
      );
      writeFileSync(file, JSON.stringify(exportDocument(guild, target, parent, messages, range), null, 2));
      console.log(`  → ${file}`);
    };

    console.log(`#${channel.name} (${channel.id})`);
    // A forum holds no messages of its own, only threads.
    if (channel.type !== 15) {
      write(channel, undefined, yield* messagesOf(client, channel.id, range.after, range.before));
    }
    if (!args['no-threads']) {
      const threads = (yield* threadsOf(client, kind, channel)).filter((thread) => THREAD_TYPES.has(thread.type));
      for (const thread of threads) {
        console.log(` ↳ ${thread.name} (${thread.id})`);
        const messages = yield* messagesOf(client, thread.id, range.after, range.before);
        // An old thread usually has nothing in the window; a file per such thread would bury the ones that do.
        if (messages.length > 0) {
          write(thread, channel, messages);
        }
      }
    }
  }
});

void EffectEx.runPromise(program).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
