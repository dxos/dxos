//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { Sketch } from '@dxos/plugin-sketch';
import { useQuery } from '@dxos/react-client/echo';
import { type ModuleProps } from '@dxos/story-modules';

export const SketchModule = ({ space }: ModuleProps) => {
  const objects = useQuery(space.db, Filter.type(Sketch.Sketch));
  const sketch = objects.at(-1);

  return <Surface.Surface type={AppSurface.Section} limit={1} data={{ subject: sketch, attendableId: 'story' }} />;
};
