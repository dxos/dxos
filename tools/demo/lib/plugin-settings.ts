//
// Copyright 2026 DXOS.org
//

import type { Page } from 'playwright';

/**
 * Seed plugin-settings atoms from .env.demo credentials.
 *
 * Plugins like `@dxos/plugin-slack` persist settings as one JSON blob under
 * a localStorage key matching their plugin id (via `@effect-atom` +
 * `@effect/platform/BrowserKeyValueStore`). To let the demo come up fully
 * configured, we write those blobs directly before the app mounts.
 *
 * Only seeds a slot if its localStorage key is empty — doesn't stomp on
 * values the user may have set through the UI.
 */
export const seedPluginSettings = async (page: Page, env: NodeJS.ProcessEnv): Promise<string[]> => {
  const seeded: string[] = [];

  const slackToken = env.SLACK_BOT_TOKEN;
  if (slackToken) {
    const channels = (env.SLACK_CHANNELS ?? '')
      .split(',')
      .map((channel) => channel.trim())
      .filter((channel) => channel.length > 0);
    const settings = {
      botToken: slackToken,
      monitoredChannels: channels,
      respondToMentions: true,
      respondToDMs: true,
    };
    const applied = await page.evaluate(
      ({ key, value }) => {
        const existing = globalThis.localStorage.getItem(key);
        if (existing) {
          try {
            const parsed = JSON.parse(existing);
            if (parsed && typeof parsed === 'object' && typeof parsed.botToken === 'string' && parsed.botToken.length > 0) {
              return false;
            }
          } catch {
            // Fall through — malformed existing value, overwrite.
          }
        }
        globalThis.localStorage.setItem(key, JSON.stringify(value));
        return true;
      },
      { key: 'org.dxos.plugin.slack', value: settings },
    );
    if (applied) {
      seeded.push('slack');
    }
  }

  return seeded;
};
