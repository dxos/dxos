//
// Copyright 2026 DXOS.org
//

/**
 * Cross-surface chat mirror — Slack ↔ Composer.
 *
 * The user's "phone-to-home" moment: a Slack DM and a Composer chat pane
 * share a single ECHO Chat object so the conversation continues across
 * surfaces with full memory.
 *
 * Two directions, both observer-driven (no UI changes required):
 *
 *   Slack → Composer:  poll Slack, group messages by thread, lookup-or-create
 *                      a SlackChatLink, and append each unseen Slack message
 *                      to the linked Chat's Feed queue.
 *
 *   Composer → Slack:  watch each linked Chat's queue for messages authored
 *                      from the Composer surface (i.e. messages without a
 *                      slackTs property), and post them to the linked Slack
 *                      thread via chat.postMessage.
 *
 * Mirror-state is encoded directly on Message.properties.slackTs so we can
 * tell at a glance which surface each message originated on. No side table.
 */

import { Chat as AssistantChat } from '@dxos/assistant-toolkit';
import { type Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import { Demo } from './types';

const POLL_INTERVAL_MS = 4_000;
const SLACK_API = 'https://slack.com/api';

type SlackMessage = {
  readonly ts: string;
  readonly thread_ts?: string;
  readonly user?: string;
  readonly text?: string;
  readonly bot_id?: string;
  readonly subtype?: string;
};

type ChatLinkConfig = {
  readonly botToken: string;
  readonly channels: readonly string[];
};

type SpaceLike = { queues: { get: (dxn: any) => any } };

let started = false;

export const startCrossSurfaceChat = (db: Database.Database, space: SpaceLike): void => {
  if (started) {
    return;
  }
  started = true;
  log.info('demo: starting cross-surface chat mirror');
  setInterval(() => void tick(db, space), POLL_INTERVAL_MS);
};

const tick = async (db: Database.Database, space: SpaceLike): Promise<void> => {
  const raw = readConfig();
  if (!raw) {
    return;
  }
  try {
    const channels = await resolveChannelNames(raw.botToken, raw.rawChannels);
    if (channels.length === 0) {
      return;
    }
    const config: ChatLinkConfig = { botToken: raw.botToken, channels };
    await mirrorSlackToComposer(db, space, config);
    await mirrorComposerToSlack(db, space, config);
  } catch (err) {
    log.info('demo: cross-surface tick failed', { error: String(err) });
  }
};

const looksLikeId = (value: string): boolean => /^[CDG][A-Z0-9]+$/.test(value);
const resolvedNameCache: Record<string, string> = {};

const resolveChannelNames = async (token: string, entries: string[]): Promise<string[]> => {
  const unresolved = entries.filter((entry) => !looksLikeId(entry) && !resolvedNameCache[entry]);
  if (unresolved.length > 0) {
    try {
      const body = new URLSearchParams({
        token,
        exclude_archived: 'true',
        limit: '1000',
        types: 'public_channel,private_channel',
      });
      const response = await fetch(`${SLACK_API}/conversations.list`, { method: 'POST', body });
      const data = (await response.json()) as { ok: boolean; channels?: { id: string; name: string }[] };
      if (data.ok) {
        for (const channel of data.channels ?? []) {
          resolvedNameCache[channel.name] = channel.id;
        }
      }
    } catch {
      // leave cache empty
    }
  }
  return entries
    .map((entry) => (looksLikeId(entry) ? entry : resolvedNameCache[entry]))
    .filter((entry): entry is string => !!entry);
};

const readConfig = (): { botToken: string; rawChannels: string[] } | undefined => {
  if (typeof globalThis.localStorage === 'undefined') {
    return undefined;
  }
  if (globalThis.localStorage.getItem('DEMO_CROSS_SURFACE_CHAT') !== 'true') {
    return undefined;
  }
  const botToken = globalThis.localStorage.getItem('SLACK_BOT_TOKEN');
  if (!botToken) {
    return undefined;
  }
  // Fall back to SLACK_CHANNELS if DEMO_CHAT_CHANNELS not set.
  const raw =
    globalThis.localStorage.getItem('DEMO_CHAT_CHANNELS') ??
    globalThis.localStorage.getItem('SLACK_NUDGE_CHANNEL') ??
    globalThis.localStorage.getItem('SLACK_CHANNELS')?.split(',')[0]?.trim() ??
    '';
  const rawChannels = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (rawChannels.length === 0) {
    return undefined;
  }
  return { botToken, rawChannels };
};

// -- Slack → Composer ---------------------------------------------------------

const mirrorSlackToComposer = async (
  db: Database.Database,
  space: SpaceLike,
  config: ChatLinkConfig,
): Promise<void> => {
  for (const channelId of config.channels) {
    const messages = await fetchHistory(config.botToken, channelId);
    const grouped = new Map<string, SlackMessage[]>();
    for (const msg of messages) {
      if (msg.subtype) {
        continue;
      }
      const key = msg.thread_ts ?? msg.ts;
      const bucket = grouped.get(key) ?? [];
      bucket.push(msg);
      grouped.set(key, bucket);
    }
    for (const [threadTs, bucket] of grouped.entries()) {
      const link = await ensureLink(db, channelId, threadTs);
      if (!link) {
        continue;
      }
      const chat = link.chat?.target;
      if (!chat) {
        continue;
      }
      await appendNewSlackMessages(space, chat, bucket, channelId);
    }
  }
};

const fetchHistory = async (token: string, channelId: string): Promise<SlackMessage[]> => {
  const body = new URLSearchParams({ token, channel: channelId, limit: '20' });
  const response = await fetch(`${SLACK_API}/conversations.history`, { method: 'POST', body });
  const data = (await response.json()) as { ok: boolean; messages?: SlackMessage[]; error?: string };
  if (!data.ok) {
    return [];
  }
  return (data.messages ?? []).slice().reverse();
};

const ensureLink = async (
  db: Database.Database,
  channelId: string,
  threadTs: string,
): Promise<Demo.SlackChatLink | undefined> => {
  const links = await db.query(Filter.type(Demo.SlackChatLink)).run();
  const existing = links.find((entry) => entry.channelId === channelId && entry.threadTs === threadTs);
  if (existing) {
    return existing;
  }
  const feed = db.add(Feed.make());
  const chat = AssistantChat.make({
    name: `Slack #${channelId}`,
    feed: Ref.make(feed),
  });
  Obj.setParent(feed, chat);
  db.add(chat);
  const link = Obj.make(Demo.SlackChatLink, {
    chat: Ref.make(chat),
    channelId,
    threadTs,
    createdAt: new Date().toISOString(),
  });
  db.add(link);
  log.info('demo: created cross-surface chat link', { channelId, threadTs, chatId: chat.id });
  return link;
};

const appendNewSlackMessages = async (
  space: SpaceLike,
  chat: AssistantChat.Chat,
  bucket: SlackMessage[],
  channelId: string,
): Promise<void> => {
  const feedTarget = chat.feed?.target;
  if (!feedTarget) {
    return;
  }
  const queueDxn = Feed.getQueueDxn(feedTarget);
  if (!queueDxn) {
    return;
  }
  const queue = space.queues.get(queueDxn);
  if (!queue) {
    return;
  }
  const existing = ((await queue.queryObjects?.()) ?? []) as Message.Message[];
  const seen = new Set(
    existing
      .map((entry) => (entry.properties as Record<string, unknown> | undefined)?.slackTs)
      .filter((value): value is string => typeof value === 'string'),
  );
  const toAppend: Message.Message[] = [];
  for (const slackMsg of bucket) {
    if (seen.has(slackMsg.ts)) {
      continue;
    }
    if (!slackMsg.text) {
      continue;
    }
    toAppend.push(
      Obj.make(Message.Message, {
        created: tsToIso(slackMsg.ts),
        sender: { role: slackMsg.bot_id ? 'assistant' : 'user' },
        blocks: [{ _tag: 'text', text: slackMsg.text }],
        properties: { slackTs: slackMsg.ts, slackChannelId: channelId },
      }),
    );
  }
  if (toAppend.length > 0) {
    await queue.append(toAppend);
    log.info('demo: mirrored slack→composer', { channelId, count: toAppend.length });
  }
};

// -- Composer → Slack ---------------------------------------------------------

const mirrorComposerToSlack = async (
  db: Database.Database,
  space: SpaceLike,
  config: ChatLinkConfig,
): Promise<void> => {
  const links = await db.query(Filter.type(Demo.SlackChatLink)).run();
  for (const link of links) {
    const chat = link.chat?.target;
    if (!chat) {
      continue;
    }
    const feedTarget = chat.feed?.target;
    if (!feedTarget) {
      continue;
    }
    const queueDxn = Feed.getQueueDxn(feedTarget);
    if (!queueDxn) {
      continue;
    }
    const queue = space.queues.get(queueDxn);
    if (!queue) {
      continue;
    }
    const messages = ((await queue.queryObjects?.()) ?? []) as Message.Message[];
    for (const message of messages) {
      const props = (message.properties as Record<string, unknown> | undefined) ?? {};
      if (typeof props.slackTs === 'string') {
        continue; // already on Slack
      }
      if (props.composerMirroredAt) {
        continue; // already mirrored
      }
      if (message.sender?.role !== 'user') {
        continue; // only mirror user-authored Composer input for the demo MVP
      }
      const text = textOf(message);
      if (!text) {
        continue;
      }
      try {
        const ts = await postToSlack(config.botToken, link.channelId, link.threadTs, text);
        Obj.change(message, (mutable) => {
          const next = { ...((mutable.properties as Record<string, unknown> | undefined) ?? {}) };
          next.slackTs = ts;
          next.slackChannelId = link.channelId;
          next.composerMirroredAt = new Date().toISOString();
          mutable.properties = next as Message.Message['properties'];
        });
        log.info('demo: mirrored composer→slack', { channelId: link.channelId, ts });
      } catch (err) {
        log.warn('demo: composer→slack post failed', { error: String(err) });
      }
    }
  }
};

const textOf = (message: Message.Message): string | undefined => {
  for (const block of message.blocks ?? []) {
    if (block._tag === 'text' && typeof block.text === 'string') {
      return block.text;
    }
  }
  return undefined;
};

const postToSlack = async (
  token: string,
  channel: string,
  threadTs: string,
  text: string,
): Promise<string> => {
  const body = new URLSearchParams({ token, channel, text, thread_ts: threadTs });
  const response = await fetch(`${SLACK_API}/chat.postMessage`, { method: 'POST', body });
  const data = (await response.json()) as { ok: boolean; ts?: string; error?: string };
  if (!data.ok || !data.ts) {
    throw new Error(`chat.postMessage failed: ${data.error ?? response.status}`);
  }
  return data.ts;
};

const tsToIso = (ts: string): string => {
  const seconds = Number(ts.split('.')[0]);
  return Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : new Date().toISOString();
};
