//
// Copyright 2026 DXOS.org
//

export const CLOUDFLARE_SOURCE = 'cloudflare.com';

export const CLOUDFLARE_PROVIDER_ID = 'cloudflare';

export const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

/**
 * `api.cloudflare.com` returns no `Access-Control-Allow-Origin` and answers the preflight an
 * `Authorization` header forces with a 400, so a browser can only reach it through EDGE's proxy.
 */
export const CLOUDFLARE_PROXY_BASE = `https://dxos.network/cors-proxy/${CLOUDFLARE_API_BASE.replace('https://', '')}`;

/**
 * Scope ids from Cloudflare's `GET /oauth/scopes`, not the colon-delimited namespace
 * `wrangler login --scopes-list` prints: the create-client API rejects the colon form, and the two
 * namespaces disagree on names (`workers_kv:write` is `workers-kv-storage.write` here).
 *
 * Cloudflare defines a write as full CRUDL, so a write scope already carries its read.
 * `workers-scripts.bind` is not a level above write — binding is its own capability.
 *
 * `offline_access` cannot be listed: Cloudflare attaches it from the client's refresh-token grant
 * and fails the authorization request with `invalid_scope` when it is named.
 *
 * Register the three identity reads as REQUIRED on the OAuth client and the rest as OPTIONAL.
 */
export const CLOUDFLARE_OAUTH_SCOPES = [
  'memberships.read',
  'account-settings.read',
  'user-details.read',

  'workers-scripts.write',
  'workers-scripts.bind',
  'workers-routes.write',
  'workers-tail.read',
  'workers-observability.read',

  'workers-kv-storage.write',
  'workers-r2.write',
  'workers-r2-bucket-item.write',
  'd1.write',
  'queues.write',
  'pipelines.write',
  'vectorize.write',
  'query-cache.write',
  'secrets-store.write',

  'ai.write',
  'containers.write',

  'zone.read',
  'ssl-and-certificates.write',
] as const;
