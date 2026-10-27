//
// Copyright 2026 DXOS.org
//

import * as HttpClient from 'effect/http/HttpClient';
import * as HttpClientRequest from 'effect/http/HttpClientRequest';

import { EdgeAiHttpClient, type GetEdgeHttpClient } from '@dxos/edge-client';
import { BYOK_HEADER } from '@dxos/protocols';

const EDGE_HOST = 'edge.internal';
const WORKERS_AI_HOST = 'workers-ai.edge.internal';
const CLAIRIC_HOST = 'clairic.edge.internal';

/** Host stripped by {@link EdgeAiHttpClient}; only the `/v1/systemone` path reaches EDGE. */
export const EDGE_ENDPOINT = `http://${EDGE_HOST}/v1/systemone`;

/** The same System One wire, answered on EDGE by Workers AI's `typesafe/jev` instead of the vendor. */
export const WORKERS_AI_ENDPOINT = `http://${WORKERS_AI_HOST}/v1/systemone`;

/** Clairic's own wire, answered on EDGE by Workers AI's `@cf/cloudflare/clairic`. */
export const CLAIRIC_ENDPOINT = `http://${CLAIRIC_HOST}/v1/extract`;

const hostOf = (url: string): string | undefined => (URL.canParse(url) ? new URL(url).host : undefined);

export const isEdgeRequest = (url: string): boolean => {
  const host = hostOf(url);
  return host === EDGE_HOST || host === WORKERS_AI_HOST || host === CLAIRIC_HOST;
};

export const isWorkersAiRequest = (url: string): boolean => hostOf(url) === WORKERS_AI_HOST;

export const isClairicRequest = (url: string): boolean => hostOf(url) === CLAIRIC_HOST;

/**
 * Sends System One calls through EDGE, the only route a browser has to the vendor: `/ai/generate/typesafe`
 * proxies to TypeSafe, `/ai/generate/workers-ai/typesafe` runs Workers AI. EDGE owns `Authorization`,
 * so a connected key the resolver sent as a bearer token moves to `X-BYOK`; with none EDGE uses its
 * platform key and meters the call. Workers AI has no vendor key to bring, so the key is dropped; the
 * same holds for Clairic at `/ai/generate/workers-ai/clairic`.
 */
export const makeEdgeHttpClient = (getEdgeClient: GetEdgeHttpClient): HttpClient.HttpClient => {
  const typesafe = EdgeAiHttpClient.make(getEdgeClient, { service: 'typesafe' });
  const workersAi = EdgeAiHttpClient.make(getEdgeClient, { service: 'workers-ai/typesafe' });
  const clairic = EdgeAiHttpClient.make(getEdgeClient, { service: 'workers-ai/clairic' });
  return HttpClient.make((request) => {
    const authorization = request.headers.authorization;
    const apiKey = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : undefined;
    const unauthorized = request.pipe(HttpClientRequest.removeHeader('authorization'));
    if (isWorkersAiRequest(request.url)) {
      return workersAi.execute(unauthorized);
    }
    if (isClairicRequest(request.url)) {
      return clairic.execute(unauthorized);
    }
    return typesafe.execute(apiKey ? unauthorized.pipe(HttpClientRequest.setHeader(BYOK_HEADER, apiKey)) : request);
  });
};
