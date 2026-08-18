//
// Copyright 2026 DXOS.org
//

import { type Config } from './config';

/**
 * Canonical names for EDGE (Cloudflare Worker) services.
 * Used as keys into `runtime.services.edgeServices`.
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
 * Resolve an EDGE service endpoint from `runtime.services.edgeServices`, `undefined` when
 * unconfigured — there are no built-in endpoints, so absence means the feature is unavailable.
 * The last matching entry wins, since proto cannot enforce uniqueness on a repeated field.
 */
export const getEdgeServiceEndpoint = (config: Config, name: EdgeServiceName): string | undefined =>
  config.values.runtime?.services?.edgeServices?.findLast((service) => service.name === name)?.endpoint;
