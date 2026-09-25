//
// Copyright 2026 DXOS.org
//

import { type Config } from './config.ts';

/**
 * Canonical names for EDGE (Cloudflare Worker) services.
 * Used as keys into `runtime.services.edgeServices` and into the path table below.
 */
export const EdgeServiceName = Object.freeze({
  Calls: 'calls',
  Image: 'image',
  Transcription: 'transcription',
  VideoTranscription: 'video-transcription',
  Discord: 'discord',
  CorsProxy: 'cors-proxy',
  Introspect: 'introspect',
  Sandbox: 'sandbox',
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
 * The path each service answers on beneath the EDGE entrypoint.
 *
 * EDGE is the front door for every service, and each owns exactly one prefix on it, so a client needs
 * one base URL per environment rather than a hostname per service — a hostname per service has to be
 * redeployed every time one of them moves, a prefix table does not. See
 * `edge/docs/design/system/http-route-migration.md`.
 *
 * The entries that are not simply `/<name>`:
 *
 * - `transcription` is the ASR endpoint (`POST /transcribe`), which calls-service serves — the same
 *   worker `calls` reaches, which is why it has always been configured to the same host.
 * - `video-transcription` is the separate transcription-service (`GET /video`), whose prefix is the
 *   worker's own name.
 * - `introspect` carries the `/mcp` path because the value IS the MCP server URL a client connects to.
 */
const EDGE_SERVICE_PATHS: Record<EdgeServiceName, string> = Object.freeze({
  [EdgeServiceName.Calls]: '/calls',
  [EdgeServiceName.Image]: '/image',
  [EdgeServiceName.Transcription]: '/calls',
  [EdgeServiceName.VideoTranscription]: '/transcription',
  [EdgeServiceName.Discord]: '/discord',
  [EdgeServiceName.CorsProxy]: '/cors-proxy',
  [EdgeServiceName.Introspect]: '/introspect/mcp',
  [EdgeServiceName.Sandbox]: '/sandbox',
});

/** Join a service path onto a base URL, tolerating a trailing slash on the base (`dx.yml` has one). */
const joinEdgePath = (baseUrl: string, path: string): string => `${baseUrl.replace(/\/+$/, '')}${path}`;

/**
 * Resolve an EDGE service endpoint, `undefined` when nothing is configured — absence still means the
 * feature is unavailable, so an unconfigured client reaches no network at all.
 *
 * Two sources, in order:
 *
 * 1. An explicit `runtime.services.edgeServices` entry. The last match wins, since proto cannot enforce
 *    uniqueness on a repeated field. This is the override — a local worker, a one-off host.
 * 2. `runtime.services.edge.url` plus the service's path. This is the normal case: configuring the EDGE
 *    entrypoint configures every service behind it, and no service endpoint can drift to a different
 *    environment than the client's own.
 */
export const getEdgeServiceEndpoint = (config: Config, name: EdgeServiceName): string | undefined => {
  const configured = config.values.runtime?.services?.edgeServices?.findLast(
    (service) => service.name === name,
  )?.endpoint;
  if (configured) {
    return configured;
  }
  const edgeUrl = config.values.runtime?.services?.edge?.url;
  return edgeUrl ? joinEdgePath(edgeUrl, EDGE_SERVICE_PATHS[name]) : undefined;
};
