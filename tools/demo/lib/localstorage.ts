//
// Copyright 2026 DXOS.org
//

import type { Page } from 'playwright';

/** Keys read from .env.demo and mirrored into Composer's localStorage. */
export const LOCAL_STORAGE_KEYS = [
  'ANTHROPIC_API_KEY',
  'TRELLO_API_KEY',
  'TRELLO_API_TOKEN',
  'TRELLO_BOARD_ID',
  'GRANOLA_API_KEY',
  'SLACK_BOT_TOKEN',
  'SLACK_CHANNELS',
  'SLACK_NUDGE_CHANNEL',
  'GITHUB_PAT',
  'GITHUB_REPO',
  'DEMO_PERSONA_NAME',
  'DEMO_PERSONA_EMAIL',
  'DEMO_ORG_NAME',
  'DEMO_LIVE_SLACK',
  'DEMO_NUDGE_MENTION_ID',
  'DEMO_NUDGE_MENTION_NAME',
  'DEMO_PR_AUTHOR_ID',
  'DEMO_PR_AUTHOR_NAME',
  'DEMO_CROSS_SURFACE_CHAT',
  'DEMO_CHAT_CHANNELS',
  'TELEGRAM_BOT_TOKEN',
  'DEMO_SHARED_AGENT_ACTIVE',
] as const;

export const collectLocalStorageValues = (env: NodeJS.ProcessEnv): Record<string, string> => {
  return LOCAL_STORAGE_KEYS.reduce<Record<string, string>>((accumulator, key) => {
    const value = env[key];
    if (value && value.length > 0) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});
};

export const writeLocalStorage = async (page: Page, values: Record<string, string>): Promise<void> => {
  await page.evaluate((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      globalThis.localStorage.setItem(key, value);
    }
  }, values);
};
