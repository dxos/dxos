//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useGraph } from '@dxos/plugin-graph';
import { Surface } from '@dxos/app-framework';

import { useNode, useNodeActionExpander } from '../../hooks';

export const ActiveNode = ({ id }: { id?: string }) => {
  const { graph } = useGraph();
  const activeNode = useNode(graph, id);
  useNodeActionExpander(activeNode);

  return (
    <div role='none' className='sr-only'>
      {/* TODO(wittjosiah): Weird that this is a surface, feel like it's not really render logic.
            Probably this lives in React-land currently in order to access translations? */}
      <Surface role='document-title' data={{ activeNode }} limit={1} />
    </div>
  );
};
