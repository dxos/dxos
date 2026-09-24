//
// Copyright 2026 DXOS.org
//

import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';

import { EdgeAiHttpClient, type GetEdgeHttpClient } from '@dxos/edge-client';
import { BYOK_HEADER } from '@dxos/protocols';

const EDGE_HOST = 'edge.internal';

/** Host stripped by {@link EdgeAiHttpClient}; only the `/v1/systemone` path reaches EDGE. */
export const EDGE_ENDPOINT = `http://${EDGE_HOST}/v1/systemone`;

export const isEdgeRequest = (url: string): boolean => URL.canParse(url) && new URL(url).host === EDGE_HOST;

/**
 * Sends System One calls through EDGE's `/ai/generate/typesafe` proxy, the only route a browser has
 * to the vendor. EDGE owns `Authorization`, so a connected key the resolver sent as a bearer token
 * moves to `X-BYOK`; with none EDGE uses its platform key and meters the call.
 */
export const makeEdgeHttpClient = (getEdgeClient: GetEdgeHttpClient): HttpClient.HttpClient =>
  EdgeAiHttpClient.make(getEdgeClient, { service: 'typesafe' }).pipe(
    HttpClient.mapRequest((request) => {
      const authorization = request.headers.authorization;
      const apiKey = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : undefined;
      return apiKey
        ? request.pipe(
            HttpClientRequest.removeHeader('authorization'),
            HttpClientRequest.setHeader(BYOK_HEADER, apiKey),
          )
        : request;
    }),
  );
