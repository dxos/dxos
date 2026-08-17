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
 * Resolve the endpoint for an EDGE service from the matching `runtime.services.edgeServices` entry.
 * Returns `undefined` when the service is not configured — there are no built-in endpoints, so
 * consumers must treat absence as "feature unavailable" rather than assuming a DXOS-operated host.
 * `name` is expected to be unique; on duplicates the last entry wins so a later override is
 * not silently shadowed by an earlier one (proto cannot enforce uniqueness on a repeated field).
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
 * {@link getEdgeServiceEndpoint} for call sites that cannot proceed without the service.
 * Throws the canonical message rather than letting absence surface later as a generic invariant or
 * a request against an `undefined/...` URL.
 */
export const getRequiredEdgeServiceEndpoint = (config: Config, name: EdgeServiceName): string => {
  const endpoint = getEdgeServiceEndpoint(config, name);
  if (!endpoint) {
    throw new Error(edgeServiceNotConfiguredMessage(name));
  }
  return endpoint;
};
