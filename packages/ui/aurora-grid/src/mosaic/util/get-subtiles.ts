//
// Copyright 2023 DXOS.org
//

import { sortByIndex } from '@tldraw/indices';

import { MosaicState } from '../types';

export const getSubtiles = (relation: Set<string>, tiles: MosaicState['tiles']) =>
  Array.from(relation)
    .map((id) => tiles[id])
    .sort(sortByIndex);
