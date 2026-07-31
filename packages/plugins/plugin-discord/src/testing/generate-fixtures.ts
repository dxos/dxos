//
// Copyright 2026 DXOS.org
//

/**
 * Generates a Discord channel fixture for use in tests.
 *
 * Usage:
 *   DISCORD_TOKEN=<bot-token> DISCORD_CHANNEL_ID=<channel-id> [DISCORD_MAX_DAYS=90] \
 *     moon run plugin-discord:generate-fixtures
 *
 * Output: src/__fixtures__/discord-messages.json
 */

import * as Effect from 'effect/Effect';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { EffectEx } from '@dxos/effect';

import { makeDiscordLayerFromToken } from '../services';
import { type DiscordChannelFixture, fetchChannelMessages } from './index';

const token = process.env.DISCORD_TOKEN;
const channelId = process.env.DISCORD_CHANNEL_ID;
if (!token || !channelId) {
  console.error('DISCORD_TOKEN and DISCORD_CHANNEL_ID must be set.');
  process.exit(1);
}

const rawDays = process.env.DISCORD_MAX_DAYS;
const maxDays = rawDays !== undefined ? Number(rawDays) : 30;

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../__fixtures__');
const outPath = resolve(outDir, 'discord-messages.json');

const program = Effect.gen(function* () {
  console.log(`Fetching messages from channel ${channelId} (last ${maxDays} days)…`);
  const result = yield* fetchChannelMessages(channelId, { maxDays });
  console.log(`Fetched ${result.messages.length} messages, ${result.threads.length} threads.`);
  for (const thread of result.threads) {
    console.log(`  thread "${thread.name}" (${thread.channelId}): ${thread.messages.length} messages`);
  }

  const fixture: DiscordChannelFixture = {
    state: { channelId, cursor: result.cursor, fetchedAt: result.fetchedAt },
    messages: result.messages,
    threads: result.threads.map((thread) => ({
      state: {
        channelId: thread.channelId,
        parentMessageId: thread.parentMessageId,
        name: thread.name,
        cursor: thread.cursor,
        fetchedAt: thread.fetchedAt,
      },
      messages: thread.messages,
    })),
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(fixture, null, 2));
  console.log(`Written to ${outPath}`);
});

const isDiscordError = (value: unknown): value is { message: string; code: number } =>
  typeof value === 'object' && value !== null && 'message' in value && 'code' in value;

await EffectEx.runPromise(
  program.pipe(
    Effect.provide(makeDiscordLayerFromToken(token)),
    Effect.catchAll((err) => {
      // dfx surfaces the Discord API body as a `[cause]` property on the wrapper error.
      const cause =
        typeof err === 'object' && err !== null && '[cause]' in err ? err['[cause]' as keyof typeof err] : err;
      if (isDiscordError(cause)) {
        console.error(`Discord API error: ${cause.message} (code ${cause.code})`);
        if (cause.code === 50001) {
          console.error(
            'Hint: the bot lacks READ_MESSAGE_HISTORY permission on this channel, or has not been invited to the server.',
          );
        }
      } else {
        console.error('Discord API error:', err);
      }

      return Effect.sync(() => process.exit(1));
    }),
  ),
);
