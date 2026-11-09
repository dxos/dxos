//
// Copyright 2026 DXOS.org
//

import { SpaceId } from '@dxos/keys';

import { SLUG_PATTERN, SOURCE, randomSlug } from './protocol.ts';

/**
 * The slug in the URL names the graph, and a graph exists as soon as it is addressed — there is no
 * create step on either side. `/` mints one and rewrites the URL so the address is shareable.
 */
export const resolveSlug = (): string => {
  const [, prefix, slug] = window.location.pathname.split('/');
  if (prefix === 'g' && slug && SLUG_PATTERN.test(slug)) {
    return slug;
  }
  const minted = randomSlug();
  window.history.replaceState(null, '', `/g/${minted}`);
  return minted;
};

/**
 * One local space per slug, derived so the same link always reopens the same local database. One
 * SQLite file holds them all, which is what echo-sqlite's space column is for.
 */
export const spaceIdForSlug = async (slug: string): Promise<SpaceId> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${SOURCE}:${slug}`));
  return SpaceId.encode(new Uint8Array(digest).slice(0, SpaceId.byteLength));
};
