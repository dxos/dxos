//
// Copyright 2026 DXOS.org
//

/** Stable id used by `plugin-integration` to look up the Discord provider entry. */
export const DISCORD_PROVIDER_ID = 'discord';

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
