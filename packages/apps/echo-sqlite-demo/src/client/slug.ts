//
// Copyright 2026 DXOS.org
//

import { SpaceId } from '@dxos/keys';

/** Slugs name a graph in a URL, so keep them short and safe to type. */
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{2,31}$/;

/** Mixed into the slug's digest so this app's spaces never collide with another's. */
const SOURCE = 'echo-sqlite-demo';

const randomSlug = (): string => {
  const alphabet = 'abcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('');
};

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
 * One space per slug, derived so the same link reaches the same space on every device and on the
 * server, which keys its authority by the space id.
 */
export const spaceIdForSlug = async (slug: string): Promise<SpaceId> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${SOURCE}:${slug}`));
  return SpaceId.encode(new Uint8Array(digest).slice(0, SpaceId.byteLength));
};
