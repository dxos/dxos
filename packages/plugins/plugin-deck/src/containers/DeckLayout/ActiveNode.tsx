//
// Copyright 2024 DXOS.org
//

import React from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as GraphHooks from '@dxos/plugin-graph/Hooks';
import { useAttended } from '@dxos/react-ui-attention';

import { useNodeActionExpander, useUrlTitle } from '#hooks';

// TODO(burdon): Factor out to effect in plugin set document title.
export const ActiveNode = () => {
  const [id] = useAttended();
  const { graph } = Hooks.useAppGraph();
  const activeNode = GraphHooks.useNode(graph, id);
  useNodeActionExpander(activeNode);
  useUrlTitle(activeNode);

  return (
    <div className='sr-only'>
      {/* TODO(wittjosiah): Weird that this is a surface, feel like it's not really render logic.
            Probably this lives in React-land currently in order to access translations? */}
      <Surface.Surface
        type={AppSurface.DocumentTitle}
        data={{ subject: activeNode } satisfies AppSurface.DocumentTitleData}
        limit={1}
      />
    </div>
  );
};

ActiveNode.displayName = 'ActiveNode';
