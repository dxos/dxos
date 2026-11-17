//
// Copyright 2026 DXOS.org
//

/** The channel fields classification reads (Discord's channel object). */
export type ScannedChannel = { readonly id: string; readonly name?: string; readonly type: number };

/** The message fields classification reads (Discord's message object). */
export type ScannedMessage = {
  readonly timestamp: string;
  readonly author: { readonly id: string; readonly bot?: boolean };
  readonly webhook_id?: string;
};

/** What a channel's recent traffic says it is; only `human` channels (and forums) carry discussion worth extracting. */
export type ChannelKind = 'human' | 'bot' | 'broadcast' | 'empty' | 'forum' | 'no-access';

export type ChannelSample = {
  readonly id: string;
  readonly name: string;
  readonly kind: ChannelKind;
  /** Messages sampled (the latest page). */
  readonly sampled: number;
  /** Share of sampled messages a bot or webhook posted. */
  readonly botShare: number;
  /** Distinct human authors among the sampled messages. */
  readonly humans: number;
  readonly lastMessageAt?: string;
};

/** A bot feed: most of the latest page came from bots or webhooks. */
const BOT_SHARE = 0.5;
/** A broadcast (announcements, rules, releases): few people post, nobody answers. */
const BROADCAST_AUTHORS = 2;

/** Classifies a channel from its latest page of messages. */
export const classify = (channel: ScannedChannel, latest: readonly ScannedMessage[]): ChannelSample => {
  const name = channel.name ?? channel.id;
  if (channel.type === 15) {
    return { id: channel.id, name, kind: 'forum', sampled: 0, botShare: 0, humans: 0 };
  }
  const bots = latest.filter((message) => message.author.bot || message.webhook_id !== undefined);
  const humans = new Set(
    latest.filter((message) => !message.author.bot && message.webhook_id === undefined).map(({ author }) => author.id),
  ).size;
  const botShare = latest.length === 0 ? 0 : bots.length / latest.length;
  const kind: ChannelKind =
    latest.length === 0 ? 'empty' : botShare > BOT_SHARE ? 'bot' : humans <= BROADCAST_AUTHORS ? 'broadcast' : 'human';
  const lastMessageAt = latest
    .map(({ timestamp }) => timestamp)
    .sort()
    .at(-1);
  return {
    id: channel.id,
    name,
    kind,
    sampled: latest.length,
    botShare,
    humans,
    ...(lastMessageAt ? { lastMessageAt } : {}),
  };
};
