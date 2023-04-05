//
// Copyright 2023 DXOS.org
//

import { HighlighterCircle as SketchIcon } from '@phosphor-icons/react';
import React from 'react';

import { Space } from '@dxos/client';
import { FrameRuntime } from '@dxos/kai-frames';
import { Sketch } from '@dxos/kai-types';

const SketchFrame = React.lazy(() => import('./SketchFrame'));

export const SketchFrameRuntime: FrameRuntime<Sketch> = {
  Icon: SketchIcon,
  Component: SketchFrame,
  title: 'title',
  filter: () => Sketch.filter(),
  onCreate: async (space: Space) => {
    return space.db.add(new Sketch());
  }
};
