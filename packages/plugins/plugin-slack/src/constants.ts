//
// Copyright 2026 DXOS.org
//

/** Source string used in `AccessToken.source` and `Obj.Meta.keys[i].source` for Slack. */
export const SLACK_SOURCE = 'slack.com';

/** Base URL for the Slack Web API. */
export const SLACK_API_BASE = 'https://slack.com/api';

/**
 * OAuth scopes required for read-only sync of channels, DMs, and group DMs.
 *
 * Splits cleanly along Slack's conversation-type axis: `<type>:read` to enumerate
 * the conversation list (drives discovery), `<type>:history` to read messages
 * inside it (drives sync). `users:read` resolves user IDs to display names so
 * we can render `Message.sender` without an extra lookup per render.
 */
export const SLACK_SCOPES = [
  'channels:read',
  'channels:history',
  'groups:read',
  'groups:history',
  'im:read',
  'im:history',
  'mpim:read',
  'mpim:history',
  'users:read',
] as const;
