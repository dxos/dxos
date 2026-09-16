//
// Copyright 2026 DXOS.org
//

import { DESKTOP_ORIGINS, DEV_SERVER_ORIGIN } from './constants.ts';

/** Origins a native build may reach a deployment from, adding the `tauri dev` server outside production. */
export const nativeOrigins = (environment: string | undefined): ReadonlySet<string> =>
  environment === 'production' ? DESKTOP_ORIGINS : new Set([...DESKTOP_ORIGINS, DEV_SERVER_ORIGIN]);

/**
 * Whether a request's `Origin` is this deployment's own — read off the request URL, so a channel or
 * preview alias needs no list — or one of `extraOrigins`.
 *
 * A missing `Origin` passes, for the same-origin GETs and HEADs that omit it; a handler serving only
 * non-GET methods, which always carry one, should reject a missing `Origin` itself.
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
