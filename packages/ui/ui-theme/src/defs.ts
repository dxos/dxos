//
// Copyright 2022 DXOS.org
//

import { type ChromaticPalette } from '@dxos/ui-types';

/**
 * Translation namespace for OS-level translations.
 */
export const osTranslations = 'org.dxos.i18n.os';

/**
 * Available color hues for UI components.
 */
export const hues: ChromaticPalette[] = [
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

export const hueShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

// NOTE: These are the JS-side style-API role keys (see ColorStyles in util/hash-styles.ts), kept
// distinct from the renamed CSS custom-property suffixes (`-bg`/`-fg`).
export const roles = ['fill', 'surface', 'foreground', 'text', 'border'] as const;

/**
 * Card size constants (Tailwind spacing units).
 * Cards should be no larger than 320px per WCAG 2.1 SC 1.4.10.
 */
// TODO(burdon): Replace usage of these with semantic tokens.
export const cardMinInlineSize = 18;
export const cardDefaultInlineSize = 20; // 320px
export const cardMaxInlineSize = 22;
export const cardMinBlockSize = 18;
export const cardMaxBlockSize = 30;
