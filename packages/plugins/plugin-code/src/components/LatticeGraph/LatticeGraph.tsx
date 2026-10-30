//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, type ReactNode, createContext, useContext, useMemo } from 'react';

import {
  type Arrangement,
  type CreateProps,
  type GraphModel,
  type LatticeSpec,
  type NodeViewProps,
  SCENE_OVERLAY_ATTRIBUTE,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
} from '@dxos/react-ui-canvas/scene';
import { Graph2DView, type GraphLayoutOptions } from '@dxos/react-ui-scene';
import * as Layout from '@dxos/react-ui/Layout';
import { type Node, nodeBase } from '@dxos/scene';

const LATTICE_NODE_TYPE = 'lattice-node';

const LatticeNode = Schema.Struct({ type: Schema.Literal(LATTICE_NODE_TYPE), ...nodeBase });

const createLatticeNode = (props: CreateProps): Node => ({ type: LATTICE_NODE_TYPE, ...props });

/** Node views get no host props, so the host's renderer reaches them through context. */
const RenderNodeContext = createContext<(id: string) => ReactNode>(() => null);

/** A card's body takes the wheel while it has more to scroll; otherwise the canvas pans. */
const wheelOverlay = { [SCENE_OVERLAY_ATTRIBUTE]: true };

const LatticeNodeView = ({ node }: NodeViewProps) => {
  const render = useContext(RenderNodeContext);
  return (
    // Presses on the card bubble to the box, which selects and drags it.
    <Layout.Grid classNames='dx-cover grid-rows-[minmax(0,1fr)] overflow-hidden' {...wheelOverlay}>
      {render(node.id)}
    </Layout.Grid>
  );
};

const nodes = createNodeRegistry(
  {
    ...defaultNodeTypes,
    [LATTICE_NODE_TYPE]: {
      name: 'Node',
      icon: 'ph--square--regular',
      schema: LatticeNode,
      component: LatticeNodeView,
      create: createLatticeNode,
      defaultSize: { width: 3, height: 2 },
      resizable: false,
      palette: false,
      // One port in the middle of each side, so an arrow leaves from whichever side faces its gutter.
      portsPerSide: 1,
      // The card draws its own frame.
      bare: true,
    },
  },
  defaultNodePrototypes,
);

export type LatticeGraphProps = PropsWithChildren<{
  graph: GraphModel;
  /** The card for a node id. */
  renderNode: (id: string) => ReactNode;
  /** Cell and gutter sizes; every node takes one cell. */
  lattice: LatticeSpec;
  /** How nodes take their cells; fewest crossing arrows by default. */
  arrange?: Arrangement;
}>;

/**
 * A read-only graph on a lattice, as `FeatureCanvas` lays out features: ranked along its edges, one card per
 * cell, with each arrow routed through the gutters so none crosses a card. Boxes can be dragged; children
 * float over the canvas (e.g. a legend).
 */
export const LatticeGraph = ({ graph, renderNode, lattice, arrange = 'crossings', children }: LatticeGraphProps) => {
  const layout = useMemo<GraphLayoutOptions>(
    () => ({ lattice, arrange, shape: () => ({ type: LATTICE_NODE_TYPE }), link: { ends: { end: 'arrow' } } }),
    [lattice, arrange],
  );
  return (
    <RenderNodeContext.Provider value={renderNode}>
      <Graph2DView graph={graph} layout={layout} nodes={nodes}>
        {children}
      </Graph2DView>
    </RenderNodeContext.Provider>
  );
};
