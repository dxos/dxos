//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/reactivity/Atom';
import * as Schema from 'effect/Schema';
import React, {
  type PropsWithChildren,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';

import {
  type Arrangement,
  Canvas,
  type CreateProps,
  DYNAMIC_VIEW_ID,
  type FreehandProjectionOptions,
  type GraphModel,
  type LatticeSpec,
  type Node,
  type NodeViewProps,
  type Overlay,
  SCENE_OVERLAY_ATTRIBUTE,
  createCanvasAtoms,
  createDynamicProjection,
  createMemoryStore,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
  nodeBase,
} from '@dxos/react-ui-canvas/scene';
import * as Layout from '@dxos/react-ui/Layout';

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
export const LatticeGraph = ({
  graph: graphModel,
  renderNode,
  lattice,
  arrange = 'crossings',
  children,
}: LatticeGraphProps) => {
  const atomRegistry = useContext(RegistryContext);

  // Owned by this component: the projection's scene atom reads both, so they live while the canvas is mounted.
  const graph = useMemo(() => Atom.make<GraphModel>(graphModel), []);
  const overlay = useMemo(() => Atom.make<Overlay>({ positions: {} }), []);
  const store = useMemo(() => createMemoryStore([]), []);
  const atoms = useMemo(() => createCanvasAtoms(DYNAMIC_VIEW_ID), []);

  useEffect(() => {
    // The atoms start with the first model, so setting it again on mount would only lay out and route twice.
    if (atomRegistry.get(graph) === graphModel) {
      return;
    }
    atomRegistry.set(graph, graphModel);
    atomRegistry.set(overlay, { positions: {} });
  }, [atomRegistry, graph, overlay, graphModel]);

  const createProjection = useCallback(
    ({ registry, constrained }: FreehandProjectionOptions) =>
      createDynamicProjection({
        registry,
        constrained,
        graph,
        overlay,
        options: {
          nodes,
          lattice,
          arrange,
          createNode: (_node, props) => createLatticeNode(props),
          link: { type: 'smart', ends: { end: 'arrow' } },
        },
        capabilities: { move: true },
      }),
    [graph, overlay, lattice, arrange],
  );

  return (
    <RenderNodeContext.Provider value={renderNode}>
      {/* The positioning context overlays float in over the canvas. */}
      <div className='dx-fill relative'>
        {children}
        <Canvas.Root
          store={store}
          root={DYNAMIC_VIEW_ID}
          atoms={atoms}
          nodes={nodes}
          createProjection={createProjection}
          // The lattice guides are the board's structure; dots between them would only add noise.
          backgroundGrid='none'
        >
          <Canvas.Viewport />
          <Canvas.Navigation />
        </Canvas.Root>
      </div>
    </RenderNodeContext.Provider>
  );
};
