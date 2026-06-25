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
  ApiProxy: 'api-proxy',
  Introspect: 'introspect',
  ChatAgent: 'chat-agent',
} as const);

export type EdgeServiceName = (typeof EdgeServiceName)[keyof typeof EdgeServiceName];

/**
 * Canonical dev/test default endpoints for EDGE services.
 * Single source of truth for the URLs previously hard-coded across plugins.
 * Production values are supplied per-app via `dx.yml` (`runtime.services.edgeServices`).
 */
export const EDGE_SERVICE_DEFAULTS: Readonly<Record<EdgeServiceName, string>> = Object.freeze({
  [EdgeServiceName.Calls]: 'https://calls-service.dxos.workers.dev',
  [EdgeServiceName.Image]: 'https://image-service-main.dxos.workers.dev',
  [EdgeServiceName.Transcription]: 'https://calls-service.dxos.workers.dev',
  [EdgeServiceName.Discord]: 'https://discord-service.dxos.workers.dev',
  [EdgeServiceName.CorsProxy]: 'https://cors-proxy.dxos.workers.dev',
  [EdgeServiceName.ApiProxy]: 'https://api-proxy.dxos.workers.dev',
  [EdgeServiceName.Introspect]: 'https://introspect-service-labs.dxos.workers.dev/mcp',
  [EdgeServiceName.ChatAgent]: 'wss://chat-agent-labs.dxos.workers.dev',
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
