//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import {
  Diagram,
  GROUP,
  type Node,
  type Overlay,
  type Projection,
} from '@dxos/react-ui-diagram';

// #region diagram
/** Ports a link can attach to, as fractions along each side. */
const PORTS: Node['ports'] = [
  { id: 'n', side: 'top', offset: 0.5 },
  { id: 's', side: 'bottom', offset: 0.5 },
];

const node = (id: string, label: string, parent?: string): Node => ({
  id,
  type: 'node',
  label,
  ports: PORTS,
  parent,
});

const link = (source: string, target: string) => ({
  id: `${source}->${target}`,
  type: 'link',
  source,
  target,
  sourcePort: 's',
  targetPort: 'n',
});

/** Boxes and links with no positions: the diagram lays them out, and a group is sized to hold its children. */
const ARCHITECTURE: Projection = {
  graph: {
    nodes: [
      node('app', 'App'),
      { id: 'client', type: GROUP, label: 'Client' },
      node('echo', 'ECHO', 'client'),
      node('halo', 'HALO', 'client'),
      node('mesh', 'MESH'),
    ],
    edges: [
      link('app', 'echo'),
      link('app', 'halo'),
      link('echo', 'mesh'),
      link('halo', 'mesh'),
    ],
  },
};

/** Drag a box to pin it; the overlay keeps the pinned positions apart from the model. */
export const ArchitectureDiagram = () => {
  const [overlay, setOverlay] = useState<Overlay>({});

  return (
    <Diagram.Root
      diagram={ARCHITECTURE}
      overlay={overlay}
      onNodeMove={(id, origin) =>
        setOverlay((current) => ({
          ...current,
          positions: { ...current.positions, [id]: origin },
        }))
      }
    >
      <Diagram.Canvas>
        <Diagram.Background variant='dots' />
      </Diagram.Canvas>
    </Diagram.Root>
  );
};
// #endregion
