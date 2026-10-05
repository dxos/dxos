//
// Copyright 2026 DXOS.org
//

/** Source string used in `AccessToken.source` and `Obj.Meta.keys[i].source` for Slack. */
export const SLACK_SOURCE = 'slack.com';

/** Base URL for the Slack Web API. */
export const SLACK_API_BASE = 'https://slack.com/api';

/**
 * OAuth scopes requested for the Slack connection.
 *
 * EDGE requests these as Slack's bot `scope` (not `user_scope`), so the stored token is the bot
 * token (`xoxb-…`) and agents post as the bot, never as the person who connected.
 *
 * Reading splits along Slack's conversation-type axis: `<type>:read` enumerates conversations
 * (discovery) and `<type>:history` reads messages (sync); `users:read` resolves user ids to names.
 * Writing: `chat:write` posts into conversations the bot is in, and `im:write` opens a DM with a
 * person (`conversations.open`) for the channel backend's `openDirect`. DM history (`im:history`)
 * is not requested because DMs are posted to, never synced.
 *
 * A connection made before the write scopes were added keeps its old grant: it syncs, but its
 * channels stay read-only until it is reconnected to consent to the new scopes.
 */
export const SLACK_SCOPES = [
  'channels:read',
  'channels:history',
  'groups:read',
  'groups:history',
  'users:read',
  'chat:write',
  'im:write',
] as const;

/** Scope a token needs before a Slack channel accepts posts. */
export const SLACK_WRITE_SCOPE = 'chat:write';
