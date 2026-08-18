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

/**
 * Canonical wording for an unconfigured EDGE service, naming the config path so every consumer
 * reports the same actionable fix instead of inventing its own.
 */
export const edgeServiceNotConfiguredMessage = (name: EdgeServiceName): string =>
  `The ${name} service is not configured (runtime.services.edgeServices: ${name}).`;

/**
 * {@link getEdgeServiceEndpoint} for call sites that cannot proceed without the service, throwing
 * before absence can surface as a generic invariant or a request against an `undefined/...` URL.
 */
export const getRequiredEdgeServiceEndpoint = (config: Config, name: EdgeServiceName): string => {
  const endpoint = getEdgeServiceEndpoint(config, name);
  if (!endpoint) {
    throw new Error(edgeServiceNotConfiguredMessage(name));
  }
  return endpoint;
};
