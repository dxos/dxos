//
// Copyright 2026 DXOS.org
//

/** Stable id used by `plugin-integration` to look up the Discord Bot provider entry. */
export const DISCORD_PROVIDER_ID = 'discord';

/** Stable id used by `plugin-integration` to look up the Discord User OAuth provider entry. */
export const DISCORD_USER_PROVIDER_ID = 'discord-user';

/** Display label for the Discord Bot (manual bot-token) integration. */
export const DISCORD_BOT_LABEL = 'Discord Bot';

/** Display label for the Discord User (OAuth) integration. */
export const DISCORD_USER_LABEL = 'Discord User';

/** Source string used in `AccessToken.source` and `Obj.Meta.keys[i].source` for Discord. */
export const DISCORD_SOURCE = 'discord.com';

/** Base URL for the Discord REST API (v10). */
export const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * Bot permission integer requested by the invite URL.
 *
 * `VIEW_CHANNEL (1<<10) | SEND_MESSAGES (1<<11) | READ_MESSAGE_HISTORY (1<<16)`.
 * Sync only needs the read permissions; `SEND_MESSAGES` is kept so the same bot
 * can be reused by features that post into channels without re-inviting.
 */
const BOT_PERMISSIONS = String((1 << 10) | (1 << 11) | (1 << 16));

/** OAuth scopes used by the invite URL — Discord requires `bot` + `applications.commands`. */
const BOT_SCOPES = ['bot', 'applications.commands'];

/**
 * Discord snowflake epoch — 2015-01-01 00:00:00 UTC in milliseconds. All
 * Discord snowflakes (message ids, channel ids, ...) encode the time of
 * creation as `(unix_ms - DISCORD_EPOCH_MS) << 22`. We use this to construct
 * an "after" snowflake from a wall-clock cutoff so we can ask Discord for
 * "messages since N days ago" without first knowing any message id.
 */
export const DISCORD_EPOCH_MS = 1_420_070_400_000;

/**
 * Construct a Discord snowflake that sorts equal to the given wall-clock
 * timestamp. Used as the `after` parameter on `/channels/{id}/messages` to
 * start the initial sync at a bounded lookback rather than walking the full
 * channel history (which would generate hundreds of requests and burn through
 * the bot's rate limit on busy channels).
 *
 * BigInt because the result exceeds `Number.MAX_SAFE_INTEGER` for any
 * timestamp in the post-2015 epoch.
 */
export const snowflakeForTimestamp = (timestampMs: number): string => {
  const adjusted = Math.max(0, timestampMs - DISCORD_EPOCH_MS);
  return (BigInt(Math.floor(adjusted)) << 22n).toString();
};

/** Default lookback window for the first sync of a channel when the user hasn't set `daysOfHistory`. */
export const DEFAULT_DAYS_OF_HISTORY = 30;

/**
 * Builds the Discord OAuth invite URL for adding the bot to a guild.
 *
 * Kept exported because Discord (unlike Slack/Trello) requires a manual
 * "invite the bot to a server" step before any API call returns useful data —
 * the credential form's description links to this so the user can complete
 * that step in the same flow.
 */
export const generateInviteUrl = (applicationId: string): string => {
  const params = new URLSearchParams({
    client_id: applicationId,
    scope: BOT_SCOPES.join(' '),
    permissions: BOT_PERMISSIONS,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
};
