//
// Copyright 2026 DXOS.org
//

import { proxyFetchLegacy } from '@dxos/edge-client';
import { log } from '@dxos/log';

import { type DuffelOfferRequestBody } from './duffel-mapping';

const DUFFEL_API = 'https://api.duffel.com';
const DUFFEL_VERSION = 'v2';

/**
 * Minimal Duffel REST client. Routes through the DXOS edge CORS proxy
 * (`proxyFetchLegacy` moves `Authorization` to `X-Cors-Proxy-Authorization`),
 * because `api.duffel.com` does not permit browser CORS. Only the search path
 * (create offer request, return offers inline) is implemented.
 */
export const createOfferRequest = async (apiKey: string, body: DuffelOfferRequestBody): Promise<unknown> => {
  const target = new URL('/air/offer_requests?return_offers=true', DUFFEL_API);
  const response = await proxyFetchLegacy(target, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Duffel-Version': DUFFEL_VERSION,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    log.warn('duffel offer request failed', { status: response.status, text });
    throw new Error(`Duffel request failed: ${response.status}`);
  }

  return response.json();
};
