//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { type ModuleProps } from '@dxos/story-modules';
import { Pipeline } from '@dxos/types';

export const ProjectModule = ({ space }: ModuleProps) => {
  const projects = useQuery(space.db, Filter.type(Pipeline.Pipeline));

  return (
    <Surface.Surface type={AppSurface.Article} limit={1} data={{ subject: projects.at(-1), attendableId: 'story' }} />
  );
};
