//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { useGraph } from '@dxos/plugin-graph';
import { useAttended } from '@dxos/react-ui-attention';

import { useNode, useNodeActionExpander } from '../../hooks';

// TODO(burdon): Factor out to effect in plugin set document title.
export const ActiveNode = () => {
  const [id] = useAttended();
  const { graph } = useGraph();
  const activeNode = useNode(graph, id);
  useNodeActionExpander(activeNode);

  return (
    <div role='none' className='sr-only'>
      {/* TODO(wittjosiah): Weird that this is a surface, feel like it's not really render logic.
            Probably this lives in React-land currently in order to access translations? */}
      <Surface role='document-title' data={{ subject: activeNode }} limit={1} />
    </div>
  );
};
