//
// Copyright 2026 DXOS.org
//

import { EDGE_URLS } from '@dxos/config';

/** Stable id used by `plugin-connector` to look up the Discord Bot provider entry. */
export const DISCORD_PROVIDER_ID = 'discord';

/** Stable id used by `plugin-connector` to look up the Discord User OAuth provider entry. */
export const DISCORD_USER_PROVIDER_ID = 'discord-user';

/** Display label for the Discord Bot (manual bot-token) integration. */
export const DISCORD_BOT_LABEL = 'Discord Bot';

/** Display label for the Discord User (OAuth) integration. */
export const DISCORD_USER_LABEL = 'Discord';

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

/** Default lookback window for the first sync of a channel when the user hasn't set `maxDays`. */
export const DEFAULT_DAYS = 30;

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

/** Companion variant (and surface literal) of an agent's Discord setup: account, servers and routed channels. */
export const DISCORD_AGENT_COMPANION = 'discord';

/** The EDGE environments of `EDGE_URLS`, which the Kai apps and the hub console are per. */
const EDGE_ENVIRONMENTS = ['local', 'dev', 'preview', 'production'] as const satisfies (keyof typeof EDGE_URLS)[];

type EdgeEnvironment = (typeof EDGE_ENVIRONMENTS)[number];

/** The known EDGE environment `edgeUrl` belongs to, matched by origin; undefined for a custom EDGE. */
const edgeEnvironment = (edgeUrl: string | undefined): EdgeEnvironment | undefined => {
  const origin = edgeUrl && URL.parse(edgeUrl)?.origin;
  return origin
    ? EDGE_ENVIRONMENTS.find((environment) => new URL(EDGE_URLS[environment]).origin === origin)
    : undefined;
};

/** Hub console page listing the Discord bots EDGE hosts; one hub serves every environment, picked by `env`. */
const EDGE_CONSOLE_URL = 'https://hub.dev.dxos.network/console/edge/discord';

/** The hub console's Discord page for the EDGE environment `edgeUrl` belongs to; undefined for a custom EDGE. */
export const edgeConsoleUrl = (edgeUrl: string | undefined): string | undefined => {
  const environment = edgeEnvironment(edgeUrl);
  return environment && `${EDGE_CONSOLE_URL}?${new URLSearchParams({ env: environment })}`;
};

/**
 * DXOS's Kai Discord app in each EDGE environment. EDGE holds each app's token (discord-service's
 * `DISCORD_KAI_APPLICATION_ID` / `DISCORD_KAI_BOT_TOKEN`), so a space records neither.
 */
export const KAI_APPLICATION_IDS: Readonly<Record<EdgeEnvironment, string>> = Object.freeze({
  local: '1559967387972009984',
  dev: '1559736753990926390',
  preview: '1559967457274372126',
  production: '1555777706459660288',
});

/** The Kai app of the EDGE at `edgeUrl`; undefined for a custom EDGE, which has none. */
export const kaiApplicationId = (edgeUrl: string | undefined): string | undefined => {
  const environment = edgeEnvironment(edgeUrl);
  return environment && KAI_APPLICATION_IDS[environment];
};
