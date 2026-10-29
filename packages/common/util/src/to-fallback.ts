//
// Copyright 2023 DXOS.org
//

import { type PublicKey } from '@dxos/keys';

/**
 * When changing this set, please check the result in a console or e.g. RunKit (https://runkit.com/thure/642214441dd6ae000855a8de)
 * Emoji sometimes use a combination of code points, and some code points aren't visible on their own, so by adding or deleting you may unintentionally create non-visible items.
 * This set was chosen from the characters in Unicode Emoji v15.0 based on the following criteria:
 * - not people or isolated anthropomorphic faces
 * - not flags
 * - more concrete than abstract
 * - less culturally specific
 * - less easily confused with another emoji in the set
 * - requires less special knowledge to identify
 * - less likely to evoke negative feelings (no meat, no drugs, no weapons, etc)
 * - less common as a signifier in UX
 * NOTE that this is intentionally an array of strings because of the way emoji graphemes work.
 */
// prettier-ignore
export const idEmoji = [
  '\u{1F47B}', '\u{1F479}', '\u{1F47D}', '\u{1F916}', '\u{1F383}', '\u{1F9BE}', '\u{1F9BF}', '\u{1F9B7}', 
  '\u{1F463}', '\u{1F441}\uFE0F', '\u{1F9F6}', '\u{1F451}', '\u{1F412}', '\u{1F986}', '\u{1F989}', '\u{1F434}',
  '\u{1F984}', '\u{1F41D}', '\u{1F98B}', '\u{1F41E}', '\u{1FAB2}', '\u{1F422}', '\u{1F98E}', '\u{1F995}', 
  '\u{1F991}', '\u{1F980}', '\u{1F420}', '\u{1F42C}', '\u{1F40B}', '\u{1F9AD}', '\u{1F405}', '\u{1F406}', 
  '\u{1F993}', '\u{1F98D}', '\u{1F9A7}', '\u{1F418}', '\u{1F42B}', '\u{1F992}', '\u{1F998}', '\u{1F9AC}', 
  '\u{1F416}', '\u{1F40F}', '\u{1F98C}', '\u{1F415}', '\u{1F408}', '\u{1F413}', '\u{1F99A}', '\u{1F99C}', 
  '\u{1F9A2}', '\u{1F9A9}', '\u{1F9A6}', '\u{1F401}', '\u{1F43F}\uFE0F', '\u{1F335}', '\u{1F332}', '\u{1F333}',
  '\u{1FAB5}', '\u{1F331}', '\u{1F341}', '\u{1FABA}', '\u{1F344}', '\u{1F41A}', '\u{1FAB8}', '\u{1FAA8}',
  '\u{1F33E}', '\u{1F337}', '\u{1F33B}', '\u2600\uFE0F', '\u{1F319}', '\u{1FA90}', '\u2B50\uFE0F', '\u26A1\uFE0F',
  '\u2604\uFE0F', '\u{1F525}', '\u{1F308}', '\u2601\uFE0F', '\u{1F4A7}', '\u26F1\uFE0F', '\u{1F30A}', '\u{1F34E}',
  '\u{1F34B}', '\u{1F349}', '\u{1F347}', '\u{1FAD0}', '\u{1F348}', '\u{1F352}', '\u{1F351}', '\u{1F96D}',
  '\u{1F34D}', '\u{1F965}', '\u{1F95D}', '\u{1F951}', '\u{1F336}\uFE0F', '\u{1F33D}', '\u{1F955}', '\u{1F36C}',
  '\u{1F95C}', '\u{1FAD6}', '\u2615\uFE0F', '\u{1F375}', '\u{1F9CA}', '\u{1F9C2}', '\u{1F3D4}\uFE0F', '\u2693\uFE0F',
  '\u{1F6DF}', '\u{1F3DD}\uFE0F', '\u{1F6F6}', '\u{1F680}', '\u{1F6F0}\uFE0F', '\u26F2\uFE0F', '\u{1F3F0}', '\u{1F6B2}',
  '\u26FA\uFE0F', '\u{1F399}\uFE0F', '\u{1F9F2}', '\u2699\uFE0F', '\u{1F529}', '\u{1F52E}', '\u{1F52D}', '\u{1F52C}',
  '\u{1F9EC}', '\u{1F321}\uFE0F', '\u{1F9FA}', '\u{1F6CE}\uFE0F', '\u{1F511}', '\u{1FA91}', '\u{1F9F8}', '\u{1F388}',
  '\u{1F380}', '\u{1F38A}', '\u267B\uFE0F', '\u{1F3B5}',
];

export const idHue = [
  'red' as const,
  'orange' as const,
  'amber' as const,
  'yellow' as const,
  'lime' as const,
  'green' as const,
  'emerald' as const,
  'teal' as const,
  'cyan' as const,
  // Omit colors similar to primary accent.
  // 'sky' as const,
  // 'blue' as const,
  // 'indigo' as const,
  'violet' as const,
  'purple' as const,
  'fuchsia' as const,
  'pink' as const,
  'rose' as const,
];

/** FNV-1a hash of an arbitrary string, as an unsigned 32-bit integer. */
const fnv1a = (id: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < id.length; index++) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash);
};

/**
 * Deterministic palette hue for an arbitrary id string that isn't hex-parseable (e.g. an identity
 * DID). Seeds the shared {@link idHue} palette via FNV-1a so the same id always maps to the same hue,
 * matching the colouring used for avatars/tags elsewhere. Prefer {@link hexToHue} when a hex
 * identity key is available (it aligns with the awareness-cursor palette).
 */
export const stringToHue = (id: string): (typeof idHue)[number] => idHue[fnv1a(id) % idHue.length];

/**
 * Deterministic avatar fallback (emoji + hue) for an arbitrary id string (e.g. an identity DID).
 * Shares {@link stringToHue}'s FNV-1a seed, so `stringToFallback(id).hue === stringToHue(id)` - an
 * avatar seeded from an id and a tag coloured by {@link stringToHue} for the same id agree.
 */
export const stringToFallback = (id: string): FallbackValue => {
  const hash = fnv1a(id);
  return {
    emoji: idEmoji[Math.floor(hash / idHue.length) % idEmoji.length],
    hue: idHue[hash % idHue.length],
  };
};

export const keyToEmoji = (key: PublicKey) => keyToFallback(key).emoji;
export const hexToEmoji = (hex: string) => hexToFallback(hex).emoji;
export const toEmoji = (hash: number) => toFallback(hash).emoji;
export const keyToHue = (key: PublicKey) => keyToFallback(key).hue;
export const hexToHue = (hex: string) => hexToFallback(hex).hue;
export const toHue = (hash: number) => toFallback(hash).hue;

export type FallbackValue = {
  emoji: string;
  hue: (typeof idHue)[number];
};

export const keyToFallback = (key: PublicKey) => hexToFallback(key.toHex());

// TODO(wittjosiah): Support non-hex strings (e.g. DIDs, UUIDs, etc.)
export const hexToFallback = (hex: string) => toFallback(parseInt(hex, 16));

// TODO(burdon): Rename?
export const toFallback = (hash: number): FallbackValue => {
  // Calculate total possible combinations of emoji and hue pairs.
  const totalCombinations = idEmoji.length * idHue.length;

  // Get a deterministic index within the range of all possible combinations.
  const combinationIndex = hash % totalCombinations;

  // Calculate which emoji to use based on the combination index.
  const emojiIndex = Math.floor(combinationIndex / idHue.length);

  // Calculate which hue to use based on the combination index.
  const hueIndex = combinationIndex % idHue.length;

  return {
    emoji: idEmoji[emojiIndex],
    hue: idHue[hueIndex],
  };
};
