//
// Copyright 2023 DXOS.org
//

import {
  type ChromaticPalette,
  type ComponentFunction,
  type MessageValence,
  type NeutralPalette,
  type Theme,
} from '@dxos/ui-types';

import { mx } from '../../util';

export type TagStyleProps = {
  palette?: ChromaticPalette | NeutralPalette | MessageValence;
};

export const tagRoot: ComponentFunction<TagStyleProps> = ({ palette = 'neutral' }, ...etc) => mx('dx-tag', ...etc);

export const tagTheme: Theme<TagStyleProps> = {
  root: tagRoot,
};
