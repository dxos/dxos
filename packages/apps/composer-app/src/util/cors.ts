//
// Copyright 2026 DXOS.org
//

import { DESKTOP_ORIGINS } from './constants';

/**
 * Whether a request's `Origin` matches the origin this exact deployment is being served from.
 * Same-origin GETs/HEADs often omit `Origin` — those pass by default; when present it must equal
 * this worker's own origin. Derived from the request's own URL rather than a static per-channel
 * list, so it is correct for the canonical domain, a PR-preview `*.workers.dev` alias, and local
 * dev alike, with no edit needed when a channel is added, renamed, or given a domain — and a
 * sibling channel (preview calling dev's worker, say) is never permitted, since it is never this
 * worker's own origin.
 *
 * `allowDesktop` additionally admits {@link DESKTOP_ORIGINS}, for the routes the bundled desktop
 * app has to reach cross-origin because it serves its own frontend from localhost.
 */
export const isAllowedOrigin = (requestUrl: string, origin: string | null, allowDesktop = false): boolean =>
  !origin || origin === new URL(requestUrl).origin || (allowDesktop && DESKTOP_ORIGINS.has(origin));

/** CORS response headers echoing `origin` only when {@link isAllowedOrigin} admits it. */
export const corsHeaders = (
  requestUrl: string,
  origin: string | null,
  allowDesktop = false,
): Record<string, string> => ({
  'Access-Control-Allow-Origin': origin && isAllowedOrigin(requestUrl, origin, allowDesktop) ? origin : '',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Content-Encoding',
  'Vary': 'Origin',
});
