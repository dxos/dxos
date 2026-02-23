//
// Copyright 2022 DXOS.org
//

/**
 * Available color hues for UI components.
 */
export const hues = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
] as const;

/**
 * Card size constants (Tailwind spacing units).
 * Cards should be no larger than 320px per WCAG 2.1 SC 1.4.10.
 */
export const cardMinInlineSize = 18;
export const cardDefaultInlineSize = 20; // 320px
export const cardMaxInlineSize = 22;
export const cardMinBlockSize = 18;
export const cardMaxBlockSize = 30;
