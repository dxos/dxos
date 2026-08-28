//
// Copyright 2026 DXOS.org
//

/** Credential service key under which the Anthropic API key is stored. */
export const ANTHROPIC_SOURCE = 'anthropic.com';

export const ANTHROPIC_API_URL = 'https://api.anthropic.com';

export const ANTHROPIC_VERSION = '2023-06-01';

/** Managed Agents is beta; every request to `/v1/agents` and `/v1/sessions` must carry this flag. */
export const MANAGED_AGENTS_BETA = 'managed-agents-2026-04-01';

/** Bounds a single control-plane call so a hung request cannot block an operation indefinitely. */
export const REQUEST_TIMEOUT_MS = 30_000;

/** Retries attempted after a transport, throttling, forbidden or server-side failure, on top of the first try. */
export const REQUEST_RETRIES = 3;

/** Fixed delay between retries; deliberately not exponential, see `request` in `api/client.ts`. */
export const REQUEST_RETRY_DELAY = '1 second';

/** Name given to the environment provisioned on demand when an agent has none. */
export const DEFAULT_ENVIRONMENT_NAME = 'composer-default';

/** Default number of session events read back by the transcript operation. */
export const DEFAULT_TRANSCRIPT_LIMIT = 50;

/** Page size used when listing a vault's credentials; the API's own maximum, to page as rarely as possible. */
export const CREDENTIAL_PAGE_LIMIT = 100;

/** Prefix for the per-session vault holding the credentials bound to that run. */
export const SESSION_VAULT_PREFIX = 'composer-session';
