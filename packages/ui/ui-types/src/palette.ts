//
// Copyright 2023 DXOS.org
//

import { type MessageValence } from './message.ts';

export type ChromaticPalette =
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose';

export type PrimaryPalette = 'primary';
export type NeutralPalette = 'neutral';

export type Palette = ChromaticPalette | PrimaryPalette | NeutralPalette;

/** A color the theme names, each with its own `--color-<hue>-*` tokens. */
export type Hue = Palette | MessageValence;

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

/**
 * Marks a schema field whose value is one of {@link hues}, so a form renders it with the hue picker
 * rather than a select.
 */
export const HueAnnotationId = '@dxos/ui-types/annotation/Hue';
