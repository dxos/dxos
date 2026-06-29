//
// Copyright 2026 DXOS.org
//

/**
 * Generates a Discord channel fixture for use in tests.
 *
 * Usage:
 *   DISCORD_TOKEN=<bot-token> DISCORD_CHANNEL_ID=<channel-id> [DISCORD_DAYS_OF_HISTORY=90] \
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

const rawDays = process.env.DISCORD_DAYS_OF_HISTORY;
const daysOfHistory = rawDays !== undefined ? Number(rawDays) : 30;

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../__fixtures__');
const outPath = resolve(outDir, 'discord-messages.json');

const program = Effect.gen(function* () {
  console.log(`Fetching messages from channel ${channelId} (last ${daysOfHistory} days)…`);
  const result = yield* fetchChannelMessages(channelId, { daysOfHistory });
  console.log(`Fetched ${result.messages.length} messages.`);

  const fixture: DiscordChannelFixture = {
    state: { channelId, cursor: result.cursor, fetchedAt: result.fetchedAt },
    messages: result.messages,
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(fixture, null, 2));
  console.log(`Written to ${outPath}`);
});

await EffectEx.runPromise(program.pipe(Effect.provide(makeDiscordLayerFromToken(token))));
