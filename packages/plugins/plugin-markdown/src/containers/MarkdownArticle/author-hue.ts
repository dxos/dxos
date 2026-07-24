//
// Copyright 2026 DXOS.org
//

import { type Hue, toHue } from '@dxos/ui-theme';
import { hexToHue, stringToHue } from '@dxos/util';
import { type Branch } from '@dxos/versioning';

/** Minimal space-member shape needed to resolve an author's palette hue. */
export type MemberLike = {
  did?: string;
  identityKey?: string;
  data?: { readonly [key: string]: any };
};

/**
 * Resolve a suggestion branch's author palette hue: the identity's chosen hue when set, else a hue
 * derived from the (hex) identity key so it matches the awareness-cursor palette, else a stable hue
 * seeded from the creator DID. Non-suggestion branches (and creators we can't resolve) get `neutral`.
 * Shared by the version banner tag and the inline suggestion markers so a suggestion reads with one
 * consistent author colour across surfaces.
 */
export const authorHue = (branch: Branch.Branch, members: readonly MemberLike[]): Hue => {
  if (branch.kind !== 'suggestion' || !branch.creator) {
    return 'neutral';
  }
  const member = members.find((candidate) => candidate.did === branch.creator);
  const chosen = typeof member?.data?.hue === 'string' ? toHue(member.data.hue) : 'neutral';
  if (chosen !== 'neutral') {
    return chosen;
  }
  return member?.identityKey ? hexToHue(member.identityKey) : stringToHue(branch.creator);
};

/** The CSS text-colour token for a hue — the same colour the author's avatar/tag uses. */
export const hueColour = (hue: Hue): string => `var(--color-${hue}-text)`;
