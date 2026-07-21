//
// Copyright 2023 DXOS.org
//

import { type PublicKey } from '@dxos/keys';

/**
 * When changing this set, please check the result in a console or e.g. RunKit (https://runkit.com/thure/642214441dd6ae000855a8de)
 * Emoji sometimes use a combination of code points, and some code points aren't visible on their own, so by adding or deleting you may unintentionally create non-visible items.
 * This set was chosen from the characters in Unicode Emoji v15.0 based on the following criteria:
 * – not people or isolated anthropomorphic faces
 * – not flags
 * – more concrete than abstract
 * – less culturally specific
 * – less easily confused with another emoji in the set
 * – requires less special knowledge to identify
 * – less likely to evoke negative feelings (no meat, no drugs, no weapons, etc)
 * – less common as a signifier in UX
 * NOTE that this is intentionally an array of strings because of the way emoji graphemes work.
 */
// prettier-ignore
export const idEmoji = [
  '👻', '👹', '👽', '🤖', '🎃', '🦾', '🦿', '🦷', 
  '👣', '👁️', '🧶', '👑', '🐒', '🦆', '🦉', '🐴',
  '🦄', '🐝', '🦋', '🐞', '🪲', '🐢', '🦎', '🦕', 
  '🦑', '🦀', '🐠', '🐬', '🐋', '🦭', '🐅', '🐆', 
  '🦓', '🦍', '🦧', '🐘', '🐫', '🦒', '🦘', '🦬', 
  '🐖', '🐏', '🦌', '🐕', '🐈', '🐓', '🦚', '🦜', 
  '🦢', '🦩', '🦦', '🐁', '🐿️', '🌵', '🌲', '🌳',
  '🪵', '🌱', '🍁', '🪺', '🍄', '🐚', '🪸', '🪨',
  '🌾', '🌷', '🌻', '☀️', '🌙', '🪐', '⭐️', '⚡️',
  '☄️', '🔥', '🌈', '☁️', '💧', '⛱️', '🌊', '🍎',
  '🍋', '🍉', '🍇', '🫐', '🍈', '🍒', '🍑', '🥭',
  '🍍', '🥥', '🥝', '🥑', '🌶️', '🌽', '🥕', '🍬',
  '🥜', '🫖', '☕️', '🍵', '🧊', '🧂', '🏔️', '⚓️',
  '🛟', '🏝️', '🛶', '🚀', '🛰️', '⛲️', '🏰', '🚲',
  '⛺️', '🎙️', '🧲', '⚙️', '🔩', '🔮', '🔭', '🔬',
  '🧬', '🌡️', '🧺', '🛎️', '🔑', '🪑', '🧸', '🎈',
  '🎀', '🎊', '♻️', '🎵',
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

/**
 * Deterministic palette hue for an arbitrary id string that isn't hex-parseable (e.g. an identity
 * DID). Seeds the shared {@link idHue} palette via FNV-1a so the same id always maps to the same hue,
 * matching the colouring used for avatars/tags elsewhere. Prefer {@link hexToHue} when a hex
 * identity key is available (it aligns with the awareness-cursor palette).
 */
export const stringToHue = (id: string): (typeof idHue)[number] => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < id.length; index++) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return idHue[Math.abs(hash) % idHue.length];
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
