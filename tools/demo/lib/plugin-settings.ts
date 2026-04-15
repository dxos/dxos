//
// Copyright 2026 DXOS.org
//

/**
 * Seed plugin-settings atoms from .env.demo credentials.
 *
 * Plugins like `@dxos/plugin-slack` persist their settings as one JSON blob
 * under a localStorage key matching their plugin id. To bring Composer up
 * fully configured we write those blobs directly before the app mounts.
 *
 * Data-driven: add new providers to SEEDERS rather than new branches to the
 * function body. Each seeder declares its localStorage key, a preview
 * predicate (so we don't clobber a user-configured value), and a builder
 * that turns `process.env` into the settings JSON.
 */

import type { Page } from 'playwright';

export type PluginSeeder = {
  /** Short display name for the seeder; shown in the "seeded: X, Y" log line. */
  readonly name: string;
  /** localStorage key the plugin reads its settings from. */
  readonly key: string;
  /**
   * Build the settings object from env. May be async — some seeders need to
   * hit the provider's API to resolve human-friendly names into IDs (e.g.
   * Slack channel names → channel IDs). Return undefined to skip this seeder
   * (e.g. no credentials in env).
   */
  readonly build: (env: NodeJS.ProcessEnv) => Promise<Record<string, unknown> | undefined> | Record<string, unknown> | undefined;
  /**
   * Return true if the existing value already contains non-stub credentials
   * and this seeder should not overwrite it.
   */
  readonly hasCreds?: (existing: Record<string, unknown>) => boolean;
};

/** Resolve a list of channel names / IDs to their canonical IDs. Names pass through on failure. */
const resolveSlackChannelIds = async (botToken: string, channels: readonly string[]): Promise<string[]> => {
  if (channels.length === 0) {
    return [];
  }
  try {
    const response = await fetch(
      'https://slack.com/api/conversations.list?exclude_archived=true&limit=1000&types=public_channel,private_channel',
      { headers: { authorization: `Bearer ${botToken}` } },
    );
    const body = (await response.json()) as { ok: boolean; channels?: { id: string; name: string }[] };
    if (!body.ok || !body.channels) {
      return [...channels];
    }
    const byName = new Map<string, string>(body.channels.map((channel) => [channel.name, channel.id]));
    const byId = new Set<string>(body.channels.map((channel) => channel.id));
    return channels.map((channel) => byId.has(channel) ? channel : byName.get(channel) ?? channel);
  } catch {
    return [...channels];
  }
};

const split = (value: string | undefined, separator = ','): string[] =>
  (value ?? '')
    .split(separator)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

export const SEEDERS: readonly PluginSeeder[] = [
  {
    name: 'slack',
    key: 'org.dxos.plugin.slack',
    hasCreds: (existing) => typeof existing.botToken === 'string' && existing.botToken.length > 0,
    build: async (env) => {
      const botToken = env.SLACK_BOT_TOKEN;
      if (!botToken) {
        return undefined;
      }
      // Slack's conversations.history (used by plugin-slack to poll messages)
      // needs channel IDs, not names. Resolve here so the bot doesn't emit
      // `channel_not_found` on every poll.
      const monitoredChannels = await resolveSlackChannelIds(botToken, split(env.SLACK_CHANNELS));
      return {
        botToken,
        monitoredChannels,
        respondToMentions: true,
        respondToDMs: true,
      };
    },
  },
];

/**
 * Apply all seeders. Returns the list of seeder names that actually wrote a
 * value (i.e. had credentials AND the slot was empty / stub).
 */
export const seedPluginSettings = async (page: Page, env: NodeJS.ProcessEnv): Promise<string[]> => {
  const seeded: string[] = [];
  for (const seeder of SEEDERS) {
    const settings = await seeder.build(env);
    if (!settings) {
      continue;
    }
    const applied = await page.evaluate(
      ({ key, value, hasCredsSrc }: { key: string; value: Record<string, unknown>; hasCredsSrc: string | null }) => {
        const existing = globalThis.localStorage.getItem(key);
        if (existing && hasCredsSrc) {
          try {
            const parsed = JSON.parse(existing) as Record<string, unknown>;
            if (parsed && typeof parsed === 'object') {
              // eslint-disable-next-line @typescript-eslint/no-implied-eval
              const hasCreds = new Function('existing', `return (${hasCredsSrc})(existing);`);
              if (hasCreds(parsed)) {
                return false;
              }
            }
          } catch {
            // Malformed — fall through and overwrite.
          }
        }
        globalThis.localStorage.setItem(key, JSON.stringify(value));
        return true;
      },
      { key: seeder.key, value: settings, hasCredsSrc: seeder.hasCreds?.toString() ?? null },
    );
    if (applied) {
      seeded.push(seeder.name);
    }
  }
  return seeded;
};
