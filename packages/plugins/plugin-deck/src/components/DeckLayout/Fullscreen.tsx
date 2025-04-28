//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Surface, useAppGraph } from '@dxos/app-framework';
import { useNode } from '@dxos/plugin-graph';
import { fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { Fallback } from './Fallback';
import { SURFACE_PREFIX } from './constants';

export const Fullscreen = ({ id }: { id?: string }) => {
  const { graph } = useAppGraph();
  const fullScreenNode = useNode(graph, id);

  return (
    <div role='none' className={fixedInsetFlexLayout}>
      <Surface
        role='main'
        limit={1}
        fallback={Fallback}
        data={{
          subject: fullScreenNode?.data,
          component: id?.startsWith(SURFACE_PREFIX) ? id.slice(SURFACE_PREFIX.length) : undefined,
        }}
      />
    </div>
  );
};
