//
// Copyright 2026 DXOS.org
//

import { type Config } from './config';

/**
 * Canonical names for EDGE (Cloudflare Worker) services.
 * Used as keys into `runtime.services.edgeServices` and {@link EDGE_SERVICE_DEFAULTS}.
 */
export const EdgeServiceName = Object.freeze({
  Calls: 'calls',
  Image: 'image',
  Transcription: 'transcription',
  Discord: 'discord',
  CorsProxy: 'cors-proxy',
  Introspect: 'introspect',
} as const);

export type EdgeServiceName = (typeof EdgeServiceName)[keyof typeof EdgeServiceName];

/**
 * The EDGE entrypoint per environment. One host per environment, every service selected by path
 * prefix beneath it — so a client holds one base URL and a prefix table rather than a URL per
 * service. `local` is `moon run edge:dev`.
 *
 * The `*.dxos.network` hostnames these replaced are still attached as aliases for clients already
 * in the field; they are not addresses to write into new code.
 */
export const EDGE_URLS = Object.freeze({
  local: 'http://localhost:8787',
  dev: 'https://dev.edge.network',
  preview: 'https://preview.edge.network',
  production: 'https://edge.network',
} as const);

/**
 * The path prefix each EDGE service is served under, relative to an {@link EDGE_URLS} base.
 * Transcription shares calls-service's prefix — the whisper endpoint lives there; the standalone
 * video transcriber is a different worker under `/transcription`.
 */
export const EDGE_SERVICE_PATHS: Readonly<Record<EdgeServiceName, string>> = Object.freeze({
  [EdgeServiceName.Calls]: '/calls',
  [EdgeServiceName.Image]: '/image',
  [EdgeServiceName.Transcription]: '/calls',
  [EdgeServiceName.Discord]: '/discord',
  [EdgeServiceName.CorsProxy]: '/cors',
  [EdgeServiceName.Introspect]: '/introspect/mcp',
});

/**
 * Canonical default endpoints for EDGE services, resolved against production EDGE.
 * Single source of truth for the URLs previously hard-coded across plugins.
 * Per-app overrides go in `dx.yml` (`runtime.services.edgeServices`).
 */
export const EDGE_SERVICE_DEFAULTS: Readonly<Record<EdgeServiceName, string>> = Object.freeze({
  [EdgeServiceName.Calls]: `${EDGE_URLS.production}${EDGE_SERVICE_PATHS[EdgeServiceName.Calls]}`,
  [EdgeServiceName.Image]: `${EDGE_URLS.production}${EDGE_SERVICE_PATHS[EdgeServiceName.Image]}`,
  [EdgeServiceName.Transcription]: `${EDGE_URLS.production}${EDGE_SERVICE_PATHS[EdgeServiceName.Transcription]}`,
  [EdgeServiceName.Discord]: `${EDGE_URLS.production}${EDGE_SERVICE_PATHS[EdgeServiceName.Discord]}`,
  [EdgeServiceName.CorsProxy]: `${EDGE_URLS.production}${EDGE_SERVICE_PATHS[EdgeServiceName.CorsProxy]}`,
  [EdgeServiceName.Introspect]: `${EDGE_URLS.production}${EDGE_SERVICE_PATHS[EdgeServiceName.Introspect]}`,
});

/**
 * Resolve the endpoint for an EDGE service.
 * Prefers the matching `runtime.services.edgeServices` entry, falling back to the canonical
 * {@link EDGE_SERVICE_DEFAULTS} entry.
 * `name` is expected to be unique; on duplicates the last entry wins so a later override is
 * not silently shadowed by an earlier one (proto cannot enforce uniqueness on a repeated field).
 */
export const getEdgeServiceEndpoint = (config: Config, name: EdgeServiceName): string =>
  config.values.runtime?.services?.edgeServices?.findLast((service) => service.name === name)?.endpoint ??
  EDGE_SERVICE_DEFAULTS[name];
