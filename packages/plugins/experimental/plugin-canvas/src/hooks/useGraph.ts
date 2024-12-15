//
// Copyright 2024 DXOS.org
//

import { useState } from 'react';

import { useSnap } from './useSnap';
import { GraphWrapper } from '../graph';
import { createGraph } from '../testing';

export const useGraph = () => {
  const snapPoint = useSnap();
  const [graph] = useState(() => new GraphWrapper(createGraph(snapPoint)));
  return graph;
};
