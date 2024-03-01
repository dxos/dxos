//
// Copyright 2023 DXOS.org
//

import { type PublicKey } from '@dxos/keys';

export const idEmoji = [
  // When changing this set, please check the result in a console or e.g. RunKit (https://runkit.com/thure/642214441dd6ae000855a8de)
  // Emoji sometimes use a combination of code points, and some code points aren't visible on their own, so by adding or deleting you may unintentionally create non-visible items.
  // This set was chosen from the characters in Unicode Emoji v15.0 based on the following criteria:
  // – not people or isolated anthropomorphic faces
  // – not flags
  // – more concrete than abstract
  // – less culturally specific
  // – less easily confused with another emoji in the set
  // – requires less special knowledge to identify
  // – less likely to evoke negative feelings (no meat, no drugs, no weapons, etc)
  // – less common as a signifier in UX
  // NOTE that this is intentionally an array of strings because of the way emoji graphemes work.
  '👹',
  '👻',
  '👽',
  '🤖',
  '🎃',
  '🦾',
  '🦿',
  '🦷',
  '👣',
  '👁️',
  '🧶',
  '👑',
  '🐒',
  '🦆',
  '🦉',
  '🐴',
  '🦄',
  '🐝',
  '🦋',
  '🐞',
  '🪲',
  '🐢',
  '🦎',
  '🦕',
  '🦑',
  '🦀',
  '🐠',
  '🐬',
  '🐋',
  '🦭',
  '🐅',
  '🐆',
  '🦓',
  '🦍',
  '🦧',
  '🐘',
  '🐫',
  '🦒',
  '🦘',
  '🦬',
  '🐖',
  '🐏',
  '🦌',
  '🐕',
  '🐈',
  '🐓',
  '🦚',
  '🦜',
  '🦢',
  '🦩',
  '🦦',
  '🐁',
  '🐿️',
  '🌵',
  '🌲',
  '🌳',
  '🪵',
  '🌱',
  '🍁',
  '🪺',
  '🍄',
  '🐚',
  '🪸',
  '🪨',
  '🌾',
  '🌷',
  '🌻',
  '☀️',
  '🌙',
  '🪐',
  '⭐️',
  '⚡️',
  '☄️',
  '🔥',
  '🌈',
  '☁️',
  '💧',
  '⛱️',
  '🌊',
  '🍎',
  '🍋',
  '🍉',
  '🍇',
  '🫐',
  '🍈',
  '🍒',
  '🍑',
  '🥭',
  '🍍',
  '🥥',
  '🥝',
  '🥑',
  '🌶️',
  '🌽',
  '🥕',
  '🍬',
  '🥜',
  '🫖',
  '☕️',
  '🍵',
  '🧊',
  '🧂',
  '🏔️',
  '⚓️',
  '🛟',
  '🏝️',
  '🛶',
  '🚀',
  '🛰️',
  '⛲️',
  '🏰',
  '🚲',
  '⛺️',
  '🎙️',
  '🧲',
  '⚙️',
  '🔩',
  '🔮',
  '🔭',
  '🔬',
  '🧬',
  '🌡️',
  '🧺',
  '🛎️',
  '🔑',
  '🪑',
  '🧸',
  '🎈',
  '🎀',
  '🎊',
  '♻️',
  '🎵',
];

export const idHue = [
  'red' as const,
  // 'orange' as const, /* More shades in these palettes are considered “ugly” */
  'amber' as const, // Amber arcs between red-orange and yellow as it gets lighter, so improves aesthetics.
  // 'yellow' as const, /* More shades in these palettes are considered “ugly” */
  'lime' as const,
  'green' as const,
  'emerald' as const,
  'teal' as const,
  'cyan' as const,
  // 'sky' as const, /* Omitted since it is quite similar to the primary accent palette */
  // 'blue' as const, /* Omitted since it is quite similar to the primary accent palette */
  // 'indigo' as const, /* Omitted since it is quite similar to the primary accent palette */
  'violet' as const,
  'purple' as const,
  'fuchsia' as const,
  'pink' as const,
  'rose' as const,
];

export const keyToEmoji = (key: PublicKey) => hexToEmoji(key.toHex());

export const hexToEmoji = (hex: string) => toEmoji(parseInt(hex, 16));

export const toEmoji = (hash: number) => idEmoji[hash % idEmoji.length];

export const keyToHue = (key: PublicKey) => hexToHue(key.toHex());

export const hexToHue = (hex: string) => toHue(parseInt(hex, 16));

export const toHue = (hash: number) => idHue[hash % idHue.length];

export type FallbackValue = {
  emoji: string;
  hue: (typeof idHue)[number];
};

export const keyToFallback = (key: PublicKey) => hexToFallback(key.toHex());

export const hexToFallback = (hex: string) => toFallback(parseInt(hex, 16));

export const toFallback = (hash: number): FallbackValue => ({ emoji: toEmoji(hash), hue: toHue(hash) });
