//
// Copyright 2026 DXOS.org
//

import * as Redacted from 'effect/Redacted';

import type * as GenerationService from '../types/GenerationService.ts';

/** How long a loaded list is reused; catalogues (models, voices) change rarely and cost a request. */
const TTL_MS = 5 * 60_000;

type Entry = {
  expires: number;
  /** The credential the list was loaded with; compared exactly on a hit since the key holds only its fingerprint. */
  apiKey?: string;
  promise: Promise<readonly GenerationService.FieldOption[]>;
};

const cache = new Map<string, Entry>();

/** Non-reversible fingerprint (FNV-1a) so the cache key never carries the credential itself. */
const fingerprint = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16);
};

const cacheKey = (providerId: string, field: string, apiKey?: Redacted.Redacted<string>): string =>
  `${providerId}/${field}/${apiKey ? fingerprint(Redacted.value(apiKey)) : ''}`;

/**
 * Loads a provider's options for a request field through a shared, time-bounded cache keyed by
 * provider, field and credential — every article and remount reads one fetch, and a rejected load
 * is evicted so the next read retries rather than caching the failure.
 */
export const loadProviderOptions = (
  provider: Pick<GenerationService.GenerationService, 'id' | 'fieldOptions'>,
  field: string,
  request: GenerationService.FieldOptionsRequest,
): Promise<readonly GenerationService.FieldOption[]> => {
  const load = provider.fieldOptions?.[field];
  if (!load) {
    return Promise.resolve([]);
  }

  const apiKey = request.apiKey && Redacted.value(request.apiKey);
  const key = cacheKey(provider.id, field, request.apiKey);
  const now = Date.now();
  const cached = cache.get(key);
  // A 32-bit fingerprint can collide; never hand one credential's list to another.
  if (cached && cached.expires > now && cached.apiKey === apiKey) {
    return cached.promise;
  }

  // The cached promise is shared, so the caller's signal must not abort it for everyone else.
  const promise = load({ apiKey: request.apiKey }).catch((error: unknown) => {
    if (cache.get(key)?.promise === promise) {
      cache.delete(key);
    }
    throw error;
  });
  cache.set(key, { expires: now + TTL_MS, apiKey, promise });
  return promise;
};

/** Drops cached lists — all of them, or one provider's (e.g. after its credential changes). */
export const invalidateProviderOptions = (providerId?: string): void => {
  if (providerId === undefined) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${providerId}/`)) {
      cache.delete(key);
    }
  }
};
