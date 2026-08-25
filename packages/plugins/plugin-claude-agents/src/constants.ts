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

/** Default number of session events read back by the transcript operation. */
export const DEFAULT_TRANSCRIPT_LIMIT = 50;
