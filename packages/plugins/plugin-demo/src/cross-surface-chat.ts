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

import { addToDemoCollection } from './containers/DemoPanel/collection';
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
let cachedBotUserId: string | undefined;
// Slack ts values we've already responded to — avoid double-replying on
// subsequent poll ticks.
const respondedTs = new Set<string>();

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
    // Composer→Slack direction is handled by the shared-agent (which posts
    // responses to Slack when the source message had a slackTs). The old
    // mirrorComposerToSlack was flooding Slack with every message.
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
  // MVP: one Chat per Slack channel, not per thread. Grouping by
  // thread_ts created a new Chat for every un-threaded message, which
  // flooded the sidebar. For replies we still pass the parent ts to
  // postMessage so Slack keeps them in the thread, but the linked Chat
  // is channel-scoped.
  for (const channelId of config.channels) {
    const messages = await fetchHistory(config.botToken, channelId);
    const keepers = messages.filter((msg) => !msg.subtype);
    if (keepers.length === 0) {
      continue;
    }
    // Use the earliest message's thread_ts (or ts) as the canonical key so
    // postMessage still threads replies correctly. Same channel always
    // resolves to the same link.
    const firstTs = keepers[0].thread_ts ?? keepers[0].ts;
    const link = await ensureLink(db, channelId, firstTs);
    if (!link) {
      continue;
    }
    const chat = link.chat?.target;
    if (!chat) {
      continue;
    }
    await appendNewSlackMessages(space, chat, keepers, channelId);
    // Agent responses are handled by shared-agent.ts, which watches the
    // feed and runs Claude with real tools. This module only mirrors.
  }
};

// -- Shared-memory @mention responder ---------------------------------------

/**
 * When a user @mentions the bot in a Slack channel we mirror, read the
 * linked Composer chat's history, call Claude with that as context, append
 * the assistant reply to the chat feed, and post it back to Slack as a
 * threaded reply. Makes Slack a view onto the canonical Composer conversation.
 */
const respondToMentions = async (
  config: ChatLinkConfig,
  space: SpaceLike,
  chat: AssistantChat.Chat,
  bucket: SlackMessage[],
  channelId: string,
  threadTs: string,
): Promise<void> => {
  const apiKey = globalThis.localStorage?.getItem('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return;
  }
  const botUserId = await getBotUserId(config.botToken);
  if (!botUserId) {
    return;
  }
  const mentions = bucket.filter(
    (msg) =>
      !msg.bot_id &&
      typeof msg.text === 'string' &&
      msg.text.includes(`<@${botUserId}>`) &&
      !respondedTs.has(msg.ts),
  );
  if (mentions.length === 0) {
    return;
  }
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
  for (const mention of mentions) {
    respondedTs.add(mention.ts);
    try {
      const history = ((await queue.queryObjects?.()) ?? []) as Message.Message[];
      const context = history
        .slice(-15)
        .map((msg) => {
          const role = msg.sender?.role === 'assistant' ? 'composerclaw' : 'user';
          const textBlock = (msg.blocks ?? []).find((b: any) => b._tag === 'text') as
            | { _tag: 'text'; text: string }
            | undefined;
          const text = textBlock?.text ?? '';
          return `${role}: ${text}`;
        })
        .join('\n');
      const userAsk = mention.text!.replace(new RegExp(`<@${botUserId}>`, 'g'), '').trim();
      const reply = await callClaudeWithContext(apiKey, userAsk, context);
      // Append as assistant to the chat feed so it shows up in Composer too.
      await queue.append([
        Obj.make(Message.Message, {
          created: new Date().toISOString(),
          sender: { role: 'assistant' },
          blocks: [{ _tag: 'text', text: reply }],
          properties: { slackTs: mention.ts + '-reply', slackChannelId: channelId },
        }),
      ]);
      // Post the reply to Slack as a threaded reply to the mention.
      const postBody = new URLSearchParams({
        token: config.botToken,
        channel: channelId,
        text: reply,
        thread_ts: mention.thread_ts ?? mention.ts,
      });
      await fetch(`${SLACK_API}/chat.postMessage`, { method: 'POST', body: postBody });
      log.info('demo: responded to mention', { ts: mention.ts, channelId });
    } catch (err) {
      log.warn('demo: failed to respond to mention', { error: String(err) });
    }
  }
  void threadTs; // reserved for future thread-scoped responses
};

const getBotUserId = async (token: string): Promise<string | undefined> => {
  if (cachedBotUserId) {
    return cachedBotUserId;
  }
  try {
    const body = new URLSearchParams({ token });
    const response = await fetch(`${SLACK_API}/auth.test`, { method: 'POST', body });
    const data = (await response.json()) as { ok: boolean; user_id?: string };
    if (data.ok && data.user_id) {
      cachedBotUserId = data.user_id;
      return cachedBotUserId;
    }
  } catch {
    // swallow
  }
  return undefined;
};

const callClaudeWithContext = async (
  apiKey: string,
  userAsk: string,
  context: string,
): Promise<string> => {
  const system = [
    'You are composerclaw, the widgets team assistant.',
    'A user is asking you a question in Slack that refers back to a conversation',
    'they have been having with you in Composer. Use the Composer conversation',
    'below as authoritative context. Answer in 2-4 sentences, concrete and specific.',
    'Do not greet, do not sign off.',
    '',
    'Composer conversation so far:',
    context || '(empty — no prior conversation)',
  ].join('\n');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      system,
      messages: [{ role: 'user', content: userAsk }],
    }),
  });
  const data = (await response.json()) as {
    content?: { type: string; text: string }[];
    error?: { message: string };
  };
  if (!response.ok) {
    throw new Error(data.error?.message ?? `anthropic ${response.status}`);
  }
  return ((data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('\n')).trim();
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
  // Dedupe by channelId only — one Chat per Slack channel in the MVP. Keeps
  // the threadTs for the first-ever message so reply postMessage can thread
  // correctly, but doesn't create a second link if a new thread appears.
  const existing = links.find((entry) => entry.channelId === channelId);
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
  await addToDemoCollection(db, chat);
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
