//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Source, type SourceApi, type Type } from '@dxos/crawler';

/** A DiscordChatExporter author record (the fields this source reads). */
type ExportAuthor = {
  readonly id: string;
  readonly name?: string;
  readonly nickname?: string;
  readonly isBot?: boolean;
};

/** A DiscordChatExporter message record (the fields this source reads). */
type ExportMessage = {
  readonly id: string;
  readonly type?: string;
  readonly timestamp?: string;
  readonly content?: string;
  readonly author: ExportAuthor;
  readonly reference?: { readonly messageId?: string | null };
};

/** A DiscordChatExporter per-channel export file. */
type ExportFile = {
  readonly guild?: { readonly id?: string };
  readonly channel: { readonly id: string; readonly name?: string };
  readonly messages: readonly ExportMessage[];
};

export type ExportSourceOptions = {
  /** Drop messages whose author is a bot or webhook (e.g. the #github feed). Default true. */
  readonly skipBots?: boolean;
};

/** Snowflakes vary in length, so compare them numerically rather than lexically. */
const afterCursor = (id: string, cursor: string | undefined): boolean =>
  cursor === undefined || cursor === '0' ? true : BigInt(id) > BigInt(cursor);

const toMessage = (raw: ExportMessage): Type.Message => {
  const displayName = raw.author.nickname && raw.author.nickname.length > 0 ? raw.author.nickname : raw.author.name;
  const parentId = raw.reference?.messageId ?? undefined;
  return {
    id: raw.id,
    text: raw.content ?? '',
    author: { id: raw.author.id, source: 'discord', username: raw.author.name, displayName },
    ...(raw.timestamp ? { createdAt: raw.timestamp } : {}),
    ...(parentId ? { parentId } : {}),
  };
};

/**
 * A crawl {@link Source} backed by a directory of DiscordChatExporter JSON files (one per channel or
 * thread), so the pipeline runs over an exported corpus without touching the Discord API. Each file
 * is an independent channel; bots and webhooks are dropped by default, and empty-content messages
 * (thread-starter stubs) are always dropped. `fetchMessages` returns the whole channel after the
 * cursor in one page, since the file already holds every message.
 */
const makeSource = (dir: string, options: ExportSourceOptions = {}): SourceApi => {
  const skipBots = options.skipBots ?? true;
  const files = readdirSync(dir).filter((name) => name.endsWith('.json'));
  const byChannel = new Map<string, ExportFile>();
  for (const name of files) {
    const file: ExportFile = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    byChannel.set(file.channel.id, file);
  }

  const kept = (file: ExportFile): Type.Message[] =>
    file.messages
      .filter((message) => (skipBots ? !message.author.isBot : true))
      .filter((message) => (message.content ?? '').trim().length > 0)
      .map(toMessage)
      .sort((left, right) => (BigInt(left.id) < BigInt(right.id) ? -1 : 1));

  const listChannels: SourceApi['listChannels'] = () =>
    Effect.succeed(
      [...byChannel.values()].map((file) => ({
        id: file.channel.id,
        name: file.channel.name,
        guildId: file.guild?.id,
      })),
    );

  const fetchMessages: SourceApi['fetchMessages'] = ({ channelId, cursor }) =>
    Effect.sync(() => {
      const file = byChannel.get(channelId);
      if (!file) {
        return { messages: [], threads: [] };
      }
      const messages = kept(file).filter((message) => afterCursor(message.id, cursor));
      return {
        messages,
        threads: [],
        ...(messages.length > 0 ? { cursor: messages[messages.length - 1].id } : {}),
      };
    });

  return { listChannels, fetchMessages };
};

/** The channel ids of every export file in `dir`, so a run can seed the frontier with all of them. */
export const exportChannelIds = (dir: string): string[] =>
  readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => (JSON.parse(readFileSync(join(dir, name), 'utf8')) as ExportFile).channel.id);

export const exportSourceLayer = (dir: string, options?: ExportSourceOptions): Layer.Layer<Source> =>
  Layer.succeed(Source, makeSource(dir, options));
