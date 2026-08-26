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
 * The EDGE entrypoint per environment. `local` is `moon run edge:dev`, and `main.dxos.network`
 * remains an alias of `preview` for clients in the field.
 */
export const EDGE_URLS = Object.freeze({
  local: 'http://localhost:8787',
  dev: 'https://dev.dxos.network',
  preview: 'https://preview.dxos.network',
  production: 'https://dxos.network',
} as const);

/**
 * Canonical dev/test default endpoints for EDGE services.
 * Single source of truth for the URLs previously hard-coded across plugins.
 * Production values are supplied per-app via `dx.yml` (`runtime.services.edgeServices`).
 */
export const EDGE_SERVICE_DEFAULTS: Readonly<Record<EdgeServiceName, string>> = Object.freeze({
  [EdgeServiceName.Calls]: 'https://calls.dxos.network',
  [EdgeServiceName.Image]: 'https://image.dxos.network',
  [EdgeServiceName.Transcription]: 'https://calls.dxos.network',
  [EdgeServiceName.Discord]: 'https://discord.dxos.network',
  [EdgeServiceName.CorsProxy]: 'https://cors.dxos.network',
  [EdgeServiceName.Introspect]: 'https://introspect.dxos.network/mcp',
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
