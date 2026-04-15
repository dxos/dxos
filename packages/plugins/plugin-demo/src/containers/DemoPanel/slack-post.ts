//
// Copyright 2026 DXOS.org
//

/**
 * Real-Slack posting for DemoNudges.
 *
 * Gated on `localStorage.DEMO_LIVE_SLACK === 'true'`. When enabled, nudges
 * are posted via Slack's `chat.postMessage` using the bot token and channel
 * read from localStorage. The panel still renders them either way — the
 * only observable difference is the "preview · not posted" label and the
 * `posted` flag on the DemoNudge object.
 */

export type SlackPostConfig = {
  readonly botToken: string;
  readonly channel: string;
};

/** Reads the Slack post config from localStorage, or returns undefined if live posting is disabled / mis-configured. */
export const readSlackPostConfig = (): SlackPostConfig | undefined => {
  if (typeof globalThis.localStorage === 'undefined') {
    return undefined;
  }
  if (globalThis.localStorage.getItem('DEMO_LIVE_SLACK') !== 'true') {
    return undefined;
  }
  const botToken = globalThis.localStorage.getItem('SLACK_BOT_TOKEN');
  if (!botToken) {
    return undefined;
  }
  const channel =
    globalThis.localStorage.getItem('SLACK_NUDGE_CHANNEL') ??
    globalThis.localStorage.getItem('SLACK_CHANNELS')?.split(',')[0]?.trim();
  if (!channel) {
    return undefined;
  }
  return { botToken, channel };
};

/** Post a nudge to Slack. Resolves on success; throws on failure (bad token, channel, network). */
export const postNudgeToSlack = async (config: SlackPostConfig, text: string): Promise<void> => {
  // Go via composer-app's /api/slack dev proxy — Slack's Web API rejects
  // browser Authorization headers on direct cross-origin POSTs.
  const response = await fetch('/api/slack/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${config.botToken}`,
    },
    body: JSON.stringify({ channel: config.channel, text }),
  });
  const body = (await response.json()) as { ok: boolean; error?: string };
  if (!body.ok) {
    throw new Error(`Slack chat.postMessage failed: ${body.error ?? response.status}`);
  }
};
