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
  palette?: ChromaticPalette | NeutralPalette | MessageValence;
};

const root: ComponentFunction<TagStyleProps> = (_, ...etc) => mx('dx-tag', ...etc);

export const tagTheme: Theme<TagStyleProps> = {
  root,
};
