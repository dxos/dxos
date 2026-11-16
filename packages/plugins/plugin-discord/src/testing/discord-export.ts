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
//     [--days <n> | --after <iso date>] [--before <iso date>] [--no-threads] [--human-only] [--out <dir>]
//   pnpm exec tsx src/testing/discord-export.ts --guild <id> --scan [--out <dir>]
//   pnpm exec tsx src/testing/discord-export.ts --list-guilds
//
// Each channel or thread is written as JSON lines (`<guild> - [<parent> - ]<name> [<id>].jsonl`): a header line, then
// one message per line, appended a page at a time. A restarted export continues each file after its last committed
// message, so an interrupted run loses at most the page it was writing.
//
// `--scan` samples each channel's latest messages and classifies it (human discussion, bot feed, one-way broadcast,
// empty), printing the table and saving it as `channels.json` in the output directory; `--human-only` exports only the
// channels it classes as human discussion (and forums), reusing that file when present.

import type * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import * as EffectEx from '@dxos/effect/EffectEx';
import { BaseError } from '@dxos/errors';

import { snowflakeForTimestamp } from '../services/discord-message.ts';
import { type ChannelSample, classify } from './channel-scan.ts';
import { appendPage, resumeFrom } from './export-format.ts';

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
  /** Set on messages a webhook posted (integrations such as GitHub feeds). */
  webhook_id?: string;
};
type Channel = {
  id: string;
  type: number;
  guild_id?: string;
  parent_id?: string | null;
  name?: string;
  topic?: string | null;
  last_message_id?: string | null;
  thread_metadata?: { archive_timestamp?: string };
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
class ExportError extends BaseError.extend('ExportError', 'Discord export failed') {}

/** The HTTP status Discord refused a request with, when it was a refusal rather than a run that cannot start. */
const statusOf = (error: ExportError): number | undefined =>
  typeof error.context.status === 'number' ? error.context.status : undefined;

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
          new ExportError({
            message: `Discord answered ${response.status} for ${path}`,
            context: { status: response.status },
          }),
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
            (error) => error instanceof ExportError && statusOf(error) === 401,
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

/**
 * Every message after `after` and before `before`, oldest first, a page of 100 per request; each page is handed to
 * `onPage` as it arrives, so it is committed before the next request. Returns how many messages there were.
 */
const messagesOf = (
  client: Client,
  channelId: string,
  after: string,
  before: string | undefined,
  onPage: (messages: readonly Message[]) => void,
) =>
  Effect.gen(function* () {
    let count = 0;
    let cursor = after;
    while (true) {
      const page = yield* client.get<Message[]>(`channels/${channelId}/messages?after=${cursor}&limit=${PAGE}`);
      const sorted = [...page].sort((left, right) => (BigInt(left.id) < BigInt(right.id) ? -1 : 1));
      const inRange = before ? sorted.filter((message) => BigInt(message.id) < BigInt(before)) : sorted;
      onPage(inRange);
      count += inRange.length;
      process.stdout.write(`\r  ${count} messages`);
      if (page.length < PAGE || inRange.length < sorted.length) {
        break;
      }
      cursor = sorted[sorted.length - 1].id;
    }
    process.stdout.write('\n');
    return count;
  });

/** The later of two snowflakes. */
const later = (left: string, right: string | undefined): string =>
  right !== undefined && BigInt(right) > BigInt(left) ? right : left;

//
// Channel classification.
//

/** Samples each channel's latest page and classifies it; a channel the token cannot read is `no-access`. */
const scanChannels = (client: Client, channels: readonly Channel[]) =>
  Effect.forEach(channels, (channel) =>
    Effect.gen(function* () {
      if (channel.type === 15) {
        return classify(channel, []);
      }
      const latest = yield* client
        .get<Message[]>(`channels/${channel.id}/messages?limit=${PAGE}`)
        .pipe(Effect.catchIf(accessDenied, () => Effect.succeed(undefined)));
      return latest === undefined
        ? ({
            id: channel.id,
            name: channel.name ?? channel.id,
            kind: 'no-access',
            sampled: 0,
            botShare: 0,
            humans: 0,
          } as const)
        : classify(channel, latest);
    }),
  );

const printScan = (samples: readonly ChannelSample[]) => {
  for (const sample of [...samples].sort((left, right) => left.kind.localeCompare(right.kind))) {
    console.log(
      [
        sample.kind.padEnd(10),
        `#${sample.name}`.padEnd(40),
        `bots ${Math.round(sample.botShare * 100)}%`.padEnd(10),
        `humans ${sample.humans}`.padEnd(11),
        sample.lastMessageAt?.slice(0, 10) ?? '',
      ].join(' '),
    );
  }
  const counts = Object.entries(Object.groupBy(samples, ({ kind }) => kind)).map(
    ([kind, group]) => `${kind} ${group?.length ?? 0}`,
  );
  console.log(counts.join(', '));
};

/** A thread's last activity as a snowflake, so it compares to the window's `after` id: its last message, else its archive time. */
const threadActivity = (thread: Channel): string =>
  thread.last_message_id ??
  (thread.thread_metadata?.archive_timestamp
    ? snowflakeForTimestamp(Date.parse(thread.thread_metadata.archive_timestamp))
    : '0');

/** A thread whose last activity predates the window has nothing to export, so enumeration can stop at it. */
const inWindow = (thread: Channel, after: string): boolean => BigInt(threadActivity(thread)) >= BigInt(after);

/**
 * A channel's threads whose last activity is within the window. A user token reaches them through the client's thread
 * search, which pages by offset; a bot uses the guild's active list plus the channel's archived public threads, paged
 * by archive time. Both archived lists are newest-first, so enumeration stops once it passes the window (by last
 * message for the search, by archive time for the bot list) instead of walking a forum's entire history.
 */
const threadsOf = (client: Client, kind: 'user' | 'bot', channel: Channel, after: string) =>
  Effect.gen(function* () {
    const found = new Map<string, Channel>();
    const keep = (threads: readonly Channel[]): boolean => {
      // `false` once a thread falls before the window, so a newest-first page stops the walk.
      let within = true;
      for (const thread of threads) {
        if (inWindow(thread, after)) {
          found.set(thread.id, thread);
        } else {
          within = false;
        }
      }
      return within;
    };
    if (kind === 'user') {
      // Active threads first (recent by definition), then archived newest-first until one predates the window.
      for (const archived of [false, true]) {
        for (let offset = 0; ; offset += THREAD_PAGE) {
          const page = yield* client.get<ThreadSearch>(
            `channels/${channel.id}/threads/search?archived=${archived}&sort_by=last_message_time&sort_order=desc&limit=${THREAD_PAGE}&offset=${offset}`,
          );
          const within = keep(page.threads);
          if (!page.has_more || page.threads.length === 0 || (archived && !within)) {
            break;
          }
        }
      }
    } else {
      const active = yield* client.get<{ threads: Channel[] }>(`guilds/${channel.guild_id}/threads/active`);
      keep(active.threads.filter((thread) => thread.parent_id === channel.id));
      let before: string | undefined;
      while (true) {
        const page = yield* client.get<{ threads: Channel[]; has_more: boolean }>(
          `channels/${channel.id}/threads/archived/public?limit=100${before ? `&before=${encodeURIComponent(before)}` : ''}`,
        );
        keep(page.threads);
        const last = page.threads[page.threads.length - 1]?.thread_metadata?.archive_timestamp;
        // Pages are ordered by archive time, not last message: only a thread archived before the window proves the
        // rest of the walk is older, since a thread archived recently can have gone quiet long before.
        if (!page.has_more || !last || BigInt(snowflakeForTimestamp(Date.parse(last))) < BigInt(after)) {
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

/** An export file's header line: DiscordChatExporter's document without its messages. */
const exportHeader = (guild: Guild, channel: Channel, parent: Channel | undefined, range: Range) => ({
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
    'scan': { type: 'boolean', default: false },
    'human-only': { type: 'boolean', default: false },
    'list-guilds': { type: 'boolean', default: false },
    'out': { type: 'string', default: join(homedir(), '.local/share/dxos/discord-export') },
  },
});

/** A channel the token cannot read (Discord answers 401/403, or 404 for one hidden from it); those are skipped. */
const accessDenied = (error: ExportError | Cause.UnknownError): boolean =>
  error instanceof ExportError && [401, 403, 404].includes(statusOf(error) ?? 0);

/** The effect's result, or `undefined` when the token has no access — a public guild has channels most members cannot read. */
const orSkip = <A>(effect: Effect.Effect<A, ExportError | Cause.UnknownError>, what: string) =>
  effect.pipe(
    Effect.catchIf(accessDenied, () => {
      process.stdout.write(`\r  (no access to ${what}, skipped)\n`);
      return Effect.succeed(undefined);
    }),
  );

const program = Effect.gen(function* () {
  const token = readToken();
  if (!token) {
    return yield* Effect.fail(
      new ExportError({ message: 'Set DISCORD_EXPORT_TOKEN or fill .secrets/discord-export.env.' }),
    );
  }
  const channelIds = args.channel?.split(',').map((id) => id.trim()) ?? [];
  if (channelIds.length === 0 && !args.guild && !args['list-guilds']) {
    return yield* Effect.fail(new ExportError({ message: 'Name --channel <id>[,<id>…] or --guild <id>.' }));
  }
  const { client, me, kind } = yield* authorize(token);
  console.log(`Authenticated as ${me.username} (${kind} token).`);
  if (args['list-guilds']) {
    for (const guild of yield* client.get<Guild[]>('users/@me/guilds')) {
      console.log(`${guild.id}  ${guild.name}`);
    }
    return;
  }

  const afterDate =
    args.after ?? (args.days ? new Date(Date.now() - Number(args.days) * 86_400_000).toISOString() : undefined);
  const range: Range = {
    after: afterDate ? snowflakeForTimestamp(Date.parse(afterDate)) : '0',
    ...(args.before ? { before: snowflakeForTimestamp(Date.parse(args.before)), beforeDate: args.before } : {}),
    ...(afterDate ? { afterDate } : {}),
  };

  const listed: Channel[] = args.guild
    ? (yield* client.get<Channel[]>(`guilds/${args.guild}/channels`)).filter((channel) => EXPORTABLE.has(channel.type))
    : yield* Effect.forEach(channelIds, (id) => client.get<Channel>(`channels/${id}`));

  mkdirSync(args.out, { recursive: true });
  const scanFile = join(args.out, 'channels.json');
  let channels = listed;
  if (args.scan || args['human-only']) {
    const samples: ChannelSample[] =
      !args.scan && existsSync(scanFile)
        ? JSON.parse(readFileSync(scanFile, 'utf8'))
        : yield* scanChannels(client, listed);
    if (args.scan) {
      writeFileSync(scanFile, JSON.stringify(samples, null, 2));
      printScan(samples);
      console.log(`→ ${scanFile}`);
      return;
    }
    const keep = new Set(samples.filter(({ kind }) => kind === 'human' || kind === 'forum').map(({ id }) => id));
    channels = listed.filter(({ id }) => keep.has(id));
    console.log(`Exporting ${channels.length} of ${listed.length} channels (human discussion and forums).`);
  }
  const guilds = new Map<string, Guild>();
  for (const channel of channels) {
    const guildId = channel.guild_id ?? args.guild ?? '';
    const guild = guilds.get(guildId) ?? (yield* client.get<Guild>(`guilds/${guildId}`));
    guilds.set(guildId, guild);
    /** Exports one channel or thread into its file, continuing after the last message a previous run committed. */
    const exportTarget = (target: Channel, parent: Channel | undefined, what: string) =>
      Effect.gen(function* () {
        const file = join(
          args.out,
          `${guild.name} - ${parent ? `${parent.name} - ` : ''}${target.name ?? target.id} [${target.id}].jsonl`.replace(
            /[/\\:]/g,
            '_',
          ),
        );
        const resumed = resumeFrom(file);
        // An old thread usually has nothing in the window; its file is created only once a page has messages.
        const count = yield* orSkip(
          messagesOf(client, target.id, later(range.after, resumed), range.before, (messages) =>
            appendPage(file, () => exportHeader(guild, target, parent, range), messages.map(exportMessage)),
          ),
          what,
        );
        if (count) {
          console.log(`  → ${file}${resumed ? ` (resumed after ${resumed})` : ''}`);
        }
      });

    console.log(`#${channel.name} (${channel.id})`);
    // A forum holds no messages of its own, only threads.
    if (channel.type !== 15) {
      yield* exportTarget(channel, undefined, 'messages');
    }
    if (!args['no-threads']) {
      const found = yield* orSkip(threadsOf(client, kind, channel, range.after), 'threads');
      const threads = (found ?? []).filter((thread) => THREAD_TYPES.has(thread.type));
      for (const thread of threads) {
        console.log(` ↳ ${thread.name} (${thread.id})`);
        yield* exportTarget(thread, channel, 'thread messages');
      }
    }
  }
});

void EffectEx.runPromise(program).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
