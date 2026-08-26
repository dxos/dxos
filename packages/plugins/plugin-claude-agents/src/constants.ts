//
// Copyright 2026 DXOS.org
//

/** Credential service key under which the Anthropic credential is stored. */
export const ANTHROPIC_SOURCE = 'anthropic.com';

/** Connector id for the Anthropic OAuth connection; stored as `Connection.connectorId`. */
export const ANTHROPIC_PROVIDER_ID = 'anthropic';

/**
 * OAuth scopes requested when connecting a Claude account: inference to run the agent, and the
 * profile scope so the connection can be labelled with the authorizing account.
 */
export const ANTHROPIC_SCOPES = ['user:inference', 'user:profile'] as const;

/** Prefix of an Anthropic OAuth access token, as opposed to an `sk-ant-api…` Console key. */
export const ANTHROPIC_OAUTH_TOKEN_PREFIX = 'sk-ant-oat';

/** OAuth-authenticated requests must carry this flag; `/v1/messages` rejects a bearer token without it. */
export const ANTHROPIC_OAUTH_BETA = 'oauth-2025-04-20';

export const ANTHROPIC_API_URL = 'https://api.anthropic.com';

export const ANTHROPIC_VERSION = '2023-06-01';

/** Managed Agents is beta; every request to `/v1/agents` and `/v1/sessions` must carry this flag. */
export const MANAGED_AGENTS_BETA = 'managed-agents-2026-04-01';

/** Bounds a single control-plane call so a hung request cannot block an operation indefinitely. */
export const REQUEST_TIMEOUT_MS = 30_000;

/** Name given to the environment provisioned on demand when an agent has none. */
export const DEFAULT_ENVIRONMENT_NAME = 'composer-default';

/** Default number of session events read back by the transcript operation. */
export const DEFAULT_TRANSCRIPT_LIMIT = 50;
