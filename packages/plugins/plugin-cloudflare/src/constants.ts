//
// Copyright 2026 DXOS.org
//

/** Source string used in `AccessToken.source` for Cloudflare credentials. */
export const CLOUDFLARE_SOURCE = 'cloudflare.com';

/** Connector id matching the `ConnectorEntry.id` contributed by this plugin. */
export const CLOUDFLARE_PROVIDER_ID = 'cloudflare';

/** Base URL for the Cloudflare v4 REST API. */
export const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

/**
 * The same API reached through EDGE's CORS proxy, which is the only way a browser can call it:
 * `api.cloudflare.com` returns no `Access-Control-Allow-Origin` and answers the preflight an
 * `Authorization` header forces with a 400.
 */
export const CLOUDFLARE_PROXY_BASE = `https://dxos.network/cors-proxy/${CLOUDFLARE_API_BASE.replace('https://', '')}`;

/**
 * Scopes requested by the Cloudflare connector, as scope ids from `GET /oauth/scopes` — the same
 * ids the "Select permission scopes" step of the OAuth client form writes.
 *
 * These are NOT the colon-delimited scopes `wrangler login --scopes-list` prints. Wrangler is a
 * first-party client on a legacy namespace; a self-managed client takes dot-delimited ids and the
 * create-client API rejects the colon form outright. The two namespaces also disagree on names, so
 * a string cannot be translated between them by swapping the separator: `workers_kv:write` is
 * `workers-kv-storage.write` here, and Pages is `page.write` even though its sibling read scope is
 * `pages.metadata_read`.
 *
 * Only the write scope is listed where a product has both: Cloudflare defines a write ("Edit" in the
 * client form) as full CRUDL, so it already carries the matching read. `workers-scripts.bind` is not
 * a level above write — attaching a KV namespace or an R2 bucket to a script is its own capability,
 * and a deploy that binds anything needs it alongside the write.
 *
 * The connector exists so an agent can build on the user's account: deploy a Worker, bind the
 * storage it needs, read the logs when the deploy misbehaves. That is why this reaches well past
 * the reads the connection UI itself uses — `testConnection` needs only the account list.
 *
 * `offline_access` is deliberately absent: Cloudflare attaches it from the client's refresh-token
 * grant and rejects the authorization request outright when it is asked for by name
 * (`invalid_scope`, "the OAuth 2.0 Client is not allowed to request scope 'offline_access'").
 *
 * Register the three identity reads as REQUIRED on the OAuth client and every other scope as
 * OPTIONAL, so a user can decline a product they do not use. A declined scope is logged by
 * kms-service and the flow continues; the call that needed it fails later, at the point of use.
 *
 * Left out: AI Gateway, AI Search, Agent Memory, MCP Portals, CF Agents, Realtime, Pub/Sub,
 * Messaging, Browser Rendering, Workers CI and Cloud Connector. Each is a product in its own right
 * rather than a step on the deploy path, and every one of them widens the consent screen.
 *
 * Also left out, deliberately: `page.write`, since Cloudflare steers new projects to Workers static
 * assets rather than Pages, and `cloudchamber.write`, the legacy name for the runtime under Workers
 * Containers — `containers.write` is the scope that product takes now.
 */
export const CLOUDFLARE_OAUTH_SCOPES = [
  // Identity. Required on the client; `memberships.read` backs the account list
  // `testConnection` probes.
  'memberships.read',
  'account-settings.read',
  'user-details.read',

  // Deploy a Worker, bind things to it, and watch what it does.
  'workers-scripts.write',
  'workers-scripts.bind',
  'workers-routes.write',
  'workers-tail.read',
  'workers-observability.read',

  // Storage and data a Worker binds.
  'workers-kv-storage.write',
  'workers-r2.write',
  'workers-r2-bucket-item.write',
  'd1.write',
  'queues.write',
  'pipelines.write',
  'vectorize.write',
  'query-cache.write',
  'secrets-store.write',

  // Workers AI, and containers.
  'ai.write',
  'containers.write',

  // The zone and certificate access a custom domain needs.
  'zone.read',
  'ssl-and-certificates.write',
] as const;
