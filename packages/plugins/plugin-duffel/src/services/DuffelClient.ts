//
// Copyright 2026 DXOS.org
//

import { proxyFetchLegacy } from '@dxos/edge-client';
import { log } from '@dxos/log';
import { BookingSearch } from '@dxos/plugin-trip';

import { type DuffelOfferRequestBody, type DuffelOffersResponse } from './duffel-mapping';
import { DUFFEL_SERVICE_ID } from './DuffelBookingService';

const DUFFEL_API = 'https://api.duffel.com';
const DUFFEL_VERSION = 'v2';

/** Duffel error envelope (only the fields we surface). */
type DuffelErrorResponse = { errors?: Array<{ message?: string; title?: string }> };

/** Extract a human-readable message from a Duffel error body, falling back to the status. */
export const duffelErrorMessage = (status: number, text: string): string => {
  try {
    const body = JSON.parse(text) as DuffelErrorResponse;
    const messages = (body.errors ?? []).map((error) => error.message ?? error.title).filter(Boolean);
    if (messages.length > 0) {
      return messages.join('; ');
    }
  } catch {
    // Non-JSON body; fall through to the generic message.
  }
  return `Duffel request failed (${status}).`;
};

/**
 * Minimal Duffel REST client. Routes through the DXOS edge CORS proxy
 * (`proxyFetchLegacy` moves `Authorization` to `X-Cors-Proxy-Authorization`),
 * because `api.duffel.com` does not permit browser CORS. Only the search path
 * (create offer request, return offers inline) is implemented.
 */
export const createOfferRequest = async (
  apiKey: string,
  body: DuffelOfferRequestBody,
): Promise<DuffelOffersResponse> => {
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
    throw new BookingSearch.BookingProviderError(DUFFEL_SERVICE_ID, duffelErrorMessage(response.status, text));
  }

  return response.json();
};
