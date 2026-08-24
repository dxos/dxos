//
// Copyright 2026 DXOS.org
//

import { DESKTOP_ORIGINS, DEV_SERVER_ORIGIN } from './constants';

/**
 * Origins a native build may reach a deployment from: every channel's asset server, plus the
 * `tauri dev` Vite server outside production, so the upload path is exercisable in native dev
 * without production trusting a port any local page can claim.
 */
export const nativeOrigins = (environment: string | undefined): ReadonlySet<string> =>
  environment === 'production' ? DESKTOP_ORIGINS : new Set([...DESKTOP_ORIGINS, DEV_SERVER_ORIGIN]);

/**
 * Whether a request's `Origin` matches the origin this exact deployment is being served from, or one
 * of `nativeOrigins` when given. Derived from the request's own URL rather than a static per-channel
 * list, so it is correct for the canonical domain, a PR-preview `*.workers.dev` alias, and local dev
 * alike, with no edit needed when a channel is added, renamed, or given a domain — and a sibling
 * channel (preview calling dev's worker, say) is never permitted, since it is never this worker's own
 * origin.
 *
 * A missing `Origin` passes, for the same-origin GETs and HEADs that omit it; a handler that only
 * serves non-GET methods, which always carry one, should reject a missing `Origin` itself.
 */
export const isAllowedOrigin = (
  requestUrl: string,
  origin: string | null,
  extraOrigins?: ReadonlySet<string>,
): boolean => !origin || origin === new URL(requestUrl).origin || extraOrigins?.has(origin) === true;

/** CORS response headers echoing `origin` only when {@link isAllowedOrigin} admits it. */
export const corsHeaders = (
  requestUrl: string,
  origin: string | null,
  extraOrigins?: ReadonlySet<string>,
): Record<string, string> => ({
  'Access-Control-Allow-Origin': origin && isAllowedOrigin(requestUrl, origin, extraOrigins) ? origin : '',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Content-Encoding',
  'Vary': 'Origin',
});
