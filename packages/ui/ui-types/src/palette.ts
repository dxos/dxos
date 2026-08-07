//
// Copyright 2023 DXOS.org
//

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
