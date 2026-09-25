//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Organization, type Person } from '@dxos/types';

/**
 * Candidate image URLs for a contact, best first. Pure derivation — no network: the caller attempts
 * each candidate through the hardened attach-image path (which validates, size-caps, and re-hosts),
 * and the services are chosen so a miss is a clean failure rather than a placeholder:
 *
 * - Person: Gravatar by SHA-256 email hash with `d=404`, so an address without an avatar 404s
 *   instead of returning a generated identicon.
 * - Organization: Clearbit's logo endpoint 404s for unknown domains; the Google favicon service is
 *   the fallback (always answers, so it terminates the chain with at least a favicon).
 */

const sha256Hex = (value: string): Effect.Effect<string> =>
  Effect.promise(async () => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  });

/** Gravatar avatar URL for an email (SHA-256 form), 404 on a missing avatar. */
export const gravatarUrl = (email: string): Effect.Effect<string> =>
  Effect.map(sha256Hex(email.trim().toLowerCase()), (hash) => `https://gravatar.com/avatar/${hash}?s=256&d=404`);

/** The registrable domain of an organization's website, if parseable. */
const websiteDomain = (website: string | undefined): string | undefined => {
  if (!website) {
    return undefined;
  }
  try {
    return new URL(website.startsWith('http') ? website : `https://${website}`).hostname
      .toLowerCase()
      .replace(/^www\./, '');
  } catch {
    return undefined;
  }
};

/** Candidate avatar URLs for a Person (empty when they have no email). */
export const personImageCandidates = (person: Person.Person): Effect.Effect<string[]> => {
  const email = person.emails?.[0]?.value;
  return email ? Effect.map(gravatarUrl(email), (url) => [url]) : Effect.succeed([]);
};

/** Candidate logo URLs for an Organization (empty when its website yields no domain). */
export const organizationImageCandidates = (organization: Organization.Organization): string[] => {
  const domain = websiteDomain(organization.website);
  if (!domain) {
    return [];
  }
  return [`https://logo.clearbit.com/${domain}`, `https://www.google.com/s2/favicons?domain=${domain}&sz=128`];
};
