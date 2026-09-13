//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { SpaceId } from '@dxos/keys';

/**
 * Which MCP surface an eval runs against.
 *
 * `local` is the in-process host (`src/mcp-host.ts`) over the harness's own database — the only
 * target whose writes a scorer can read back. The rest are the deployed `mcp-space-service` workers,
 * which own their own data plane: against those an eval measures the surface the way a client sees
 * it (discovery, governance, latency) rather than what reached a space this process controls.
 */
export type Target = 'local' | 'local-edge' | 'dev' | 'main' | 'prod';

export const TARGETS: readonly Target[] = ['local', 'local-edge', 'dev', 'main', 'prod'];

export const DEFAULT: Target = 'local';

/**
 * The deployed endpoints, from `packages/services/mcp-space-service/wrangler.jsonc` in the edge
 * repo; `main` is the `preview` worker, whose legacy alias is `main.dxos.network`.
 *
 * `local-edge` is `wrangler dev` on the port the hub's `DX_MCP_CALLBACK_ORIGINS` names — `127.0.0.1`
 * rather than `localhost`, which resolves to `::1` first on Linux and reaches no IPv4 listener.
 */
const URLS: Record<Target, string | undefined> = {
  'local': undefined,
  'local-edge': 'http://127.0.0.1:8791/mcp',
  'dev': 'https://mcp.dev.dxos.network/mcp',
  'main': 'https://mcp.preview.dxos.network/mcp',
  'prod': 'https://mcp.dxos.network/mcp',
};

/** Reads the target from `DX_EVAL_MCP_TARGET`, defaulting to the in-process host. */
export const fromEnv = (value: string | undefined = process.env.DX_EVAL_MCP_TARGET): Target => {
  if (value == null || value.length === 0) {
    return DEFAULT;
  }
  const target = value.trim().toLowerCase();
  // `preview` is what the worker's environment is called; `main` is the host it also serves.
  const alias = target === 'preview' ? 'main' : target === 'production' ? 'prod' : target;
  if (!TARGETS.includes(alias as Target)) {
    throw new Error(`Unknown MCP eval target "${value}"; expected one of ${TARGETS.join(', ')}.`);
  }
  return alias as Target;
};

/** True for the in-process host, the one target whose writes a scorer can read back. */
export const isLocal = (target: Target): boolean => target === 'local';

/** The endpoint to dial, or undefined for the in-process host, whose URL is only known once bound. */
export const url = (target: Target): string | undefined =>
  isLocal(target) ? undefined : (process.env.DX_EVAL_MCP_URL ?? URLS[target]);

/**
 * Credentials for a deployed endpoint.
 *
 * The deployed surface is OAuth-gated, and an eval cannot complete a passkey ceremony: the token is
 * minted by hand and handed over in `DX_EVAL_MCP_TOKEN`. Without it a remote run gets 401s, which is
 * a legible failure rather than a silent one.
 */
export const headers = (target: Target): Record<string, string> | undefined => {
  const token = process.env.DX_EVAL_MCP_TOKEN;
  if (isLocal(target) || token == null || token.length === 0) {
    return undefined;
  }
  const endpoint = url(target);
  // A bearer over plain HTTP puts the token on the wire in cleartext, and `local-edge` and
  // `DX_EVAL_MCP_URL` both make that reachable by accident.
  if (endpoint == null || !endpoint.startsWith('https:')) {
    throw new Error(`DX_EVAL_MCP_TOKEN is set for a non-HTTPS endpoint (${endpoint ?? 'none'}); refusing to send it.`);
  }
  return { Authorization: `Bearer ${token}` };
};

/**
 * Ceiling for the p95 of a tool call, in ms.
 *
 * Parsed rather than `Number(...)`: an empty variable coerces to `0`, which fails every report, and
 * a typo to `NaN`, which fails every comparison — both of them silently.
 */
export const latencyBudget = (fallback: number): number => {
  const value = process.env.DX_EVAL_MCP_LATENCY_BUDGET_MS;
  if (value == null || value.trim().length === 0) {
    return fallback;
  }
  const budget = Number(value);
  if (!Number.isFinite(budget) || budget <= 0) {
    throw new Error(`DX_EVAL_MCP_LATENCY_BUDGET_MS must be a positive number of milliseconds; got "${value}".`);
  }
  return budget;
};

/**
 * The space a remote run acts on.
 *
 * A deployed worker serves its own data plane, so the harness's freshly created space does not exist
 * there; `DX_EVAL_SPACE_ID` names one that does.
 */
export const spaceId = (): SpaceId | undefined => {
  const value = process.env.DX_EVAL_SPACE_ID;
  if (value == null || value.length === 0) {
    return undefined;
  }
  if (!SpaceId.isValid(value)) {
    throw new Error(`DX_EVAL_SPACE_ID is not a space id: "${value}".`);
  }
  return value;
};
