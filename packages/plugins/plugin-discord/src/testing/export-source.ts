//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { Source, type SourceApi, type Type } from '@dxos/crawler';

import { type ExportFile, type ExportMessage, isExportFile, readExportFile } from './export-format.ts';

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
 * A crawl {@link Source} backed by a directory of export files (one per channel or thread, DiscordChatExporter JSON
 * or this exporter's JSON lines), so the pipeline runs over an exported corpus without touching the Discord API. Each file
 * is an independent channel; bots and webhooks are dropped by default, and empty-content messages
 * (thread-starter stubs) are always dropped. `fetchMessages` returns the whole channel after the
 * cursor in one page, since the file already holds every message.
 */
const makeSource = (dir: string, options: ExportSourceOptions = {}): SourceApi => {
  const skipBots = options.skipBots ?? true;
  const byChannel = new Map<string, ExportFile>();
  for (const name of readdirSync(dir).filter(isExportFile)) {
    const file = readExportFile(join(dir, name));
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
    .filter(isExportFile)
    .map((name) => readExportFile(join(dir, name)).channel.id);

export const exportSourceLayer = (dir: string, options?: ExportSourceOptions): Layer.Layer<Source> =>
  Layer.succeed(Source, makeSource(dir, options));
