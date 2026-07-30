//
// Copyright 2023 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import {
  type ChromaticPalette,
  type ComponentFunction,
  type MessageValence,
  type NeutralPalette,
  type Theme,
} from '@dxos/ui-types';

export type TagStyleProps = {
  hue?: ChromaticPalette | NeutralPalette | MessageValence;
  /** `button` for a pill that acts when clicked (a reaction), rather than one that only labels. */
  variant?: 'default' | 'button';
};

const root: ComponentFunction<TagStyleProps> = ({ variant }, ...etc) =>
  mx('dx-tag', variant === 'button' && 'dx-tag--button', ...etc);

export const tagTheme: Theme<TagStyleProps> = {
  root,
};
