//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Pipeline } from '@dxos/types';

import { type ModuleProps } from './types';

export const ProjectModule = ({ space }: ModuleProps) => {
  const projects = useQuery(space.db, Filter.type(Pipeline.Pipeline));

  return (
    <Panel.Root>
      <Panel.Content>
        <Surface.Surface
          type={AppSurface.Article}
          limit={1}
          data={{ subject: projects.at(-1), attendableId: 'story' }}
        />
      </Panel.Content>
    </Panel.Root>
  );
};
