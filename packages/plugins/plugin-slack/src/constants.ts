//
// Copyright 2026 DXOS.org
//

/** Source string used in `AccessToken.source` and `Obj.Meta.keys[i].source` for Slack. */
export const SLACK_SOURCE = 'slack.com';

/** Base URL for the Slack Web API. */
export const SLACK_API_BASE = 'https://slack.com/api';

/**
 * OAuth scopes required for read-only sync of public and private channels.
 *
 * Splits cleanly along Slack's conversation-type axis: `<type>:read` to enumerate
 * the conversation list (drives discovery), `<type>:history` to read messages
 * inside it (drives sync). `users:read` resolves user IDs to display names so
 * we can render `Message.sender` without an extra lookup per render.
 *
 * `im:*` and `mpim:*` scopes are intentionally omitted — direct messages and
 * group DMs are out of scope for sync; only channel-shaped conversations are
 * synced as Channels.
 */
export const SLACK_SCOPES = [
  'channels:read',
  'channels:history',
  'groups:read',
  'groups:history',
  'users:read',
] as const;
