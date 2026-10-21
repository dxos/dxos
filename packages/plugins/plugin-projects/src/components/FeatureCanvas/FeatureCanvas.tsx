//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/reactivity/Atom';
import * as Schema from 'effect/Schema';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import {
  type Arrangement,
  Canvas,
  type CreateProps,
  DYNAMIC_VIEW_ID,
  type DynamicOptions,
  type ForceOptions,
  type FreehandProjectionOptions,
  type GraphModel,
  type LatticeSpec,
  type Node,
  type NodeViewProps,
  type Overlay,
  type Point,
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

import { FeatureCard, type FeatureLookup, type FeatureModel, makeFeatureLookup } from '../FeatureCard/index.ts';

const FEATURE_NODE_TYPE = 'feature';

/** A box that shows one feature's card; the node id is the feature id. */
const FeatureNode = Schema.Struct({ type: Schema.Literal(FEATURE_NODE_TYPE), ...nodeBase });

const createFeatureNode = (props: CreateProps): Node => ({ type: FEATURE_NODE_TYPE, ...props });

type FeatureNodeContextValue = Pick<FeatureCanvasProps, 'onRename' | 'onDescribe' | 'editingId' | 'onEditingChange'> & {
  lookup: FeatureLookup;
};

/** Node views get no host props, so the cards' data and edits reach them through context. */
const FeatureNodeContext = createContext<FeatureNodeContextValue>({ lookup: () => undefined });

/** The card's body takes the wheel while it has more to scroll; otherwise the canvas pans. */
const wheelOverlay = { [SCENE_OVERLAY_ATTRIBUTE]: true };

const FeatureNodeView = ({ node }: NodeViewProps) => {
  const { lookup, onRename, onDescribe, editingId, onEditingChange } = useContext(FeatureNodeContext);
  const feature = lookup(node.id);
  return (
    // One bounded row, so the card fits the box and its body scrolls; presses on the card bubble to the box, which
    // selects and drags it.
    <Layout.Grid
      classNames='dx-cover grid-rows-[minmax(0,1fr)] overflow-hidden'
      data-testid='feature-canvas-node'
      {...wheelOverlay}
    >
      {feature && (
        <FeatureCard
          feature={feature}
          lookup={lookup}
          showDependencies={false}
          scroll
          onRename={onRename ? (feature, name) => onRename(feature.id, name) : undefined}
          onDescribe={onDescribe ? (feature, description) => onDescribe(feature.id, description) : undefined}
          // Controlled only for a host that tracks it; otherwise the edit button's toggle would be overridden.
          editing={onEditingChange ? feature.id === editingId : undefined}
          onEditingChange={(editing) => onEditingChange?.(editing ? feature.id : undefined)}
        />
      )}
    </Layout.Grid>
  );
};

/** The node registry, with `hostOpen` so a double-click opens the feature instead of drilling into the box. */
const createRegistry = (open: (id: string) => void) =>
  createNodeRegistry(
    {
      ...defaultNodeTypes,
      [FEATURE_NODE_TYPE]: {
        name: 'Feature',
        icon: 'ph--puzzle-piece--regular',
        schema: FeatureNode,
        component: FeatureNodeView,
        create: createFeatureNode,
        defaultSize: { width: 3, height: 2 },
        resizable: false,
        palette: false,
        // One port in the middle of each side, so a dependency is drawn from any edge of the box.
        portsPerSide: 1,
        openable: true,
        hostOpen: (node) => () => open(node.id),
        // The card draws its own frame.
        bare: true,
      },
    },
    defaultNodePrototypes,
  );

/**
 * One card per lattice cell. Cells are centred on whole pitches, so a card's edges sit half its size from a pitch
 * point: both sizes are multiples of twice the major grid, so the edges land on the coarsest dots.
 */
const LATTICE: LatticeSpec = { width: 256, height: 256, gutterX: 64, gutterY: 64 };

const LAYOUT: Omit<DynamicOptions, 'nodes'> = {
  createNode: (_node, props) => createFeatureNode(props),
  // Smart links route through the lattice's gutters (or round the boxes without one), so arrows never cross a card.
  link: { type: 'smart', ends: { end: 'arrow' } },
};

const EDGE_SEPARATOR = '->';

/** Edges point from a feature to what it depends on, so rows read from dependents down to foundations. */
const toGraph = (features: readonly FeatureModel[]): GraphModel => {
  const ids = new Set(features.map((feature) => feature.id));
  return {
    nodes: features.map((feature) => ({ id: feature.id, label: feature.name })),
    edges: features.flatMap((feature) =>
      feature.dependsOn
        .filter((id) => ids.has(id))
        .map((id) => ({ id: `${feature.id}${EDGE_SEPARATOR}${id}`, from: feature.id, to: id })),
    ),
  };
};

const samePositions = (left: Record<string, Point>, right: Record<string, Point>) =>
  JSON.stringify(left) === JSON.stringify(right);

export type FeatureCanvasProps = {
  features: readonly FeatureModel[];
  /** Positions the user dragged, by feature id; the rest are laid out by dependency rank. */
  positions?: Record<string, Point>;
  onPositionsChange?: (positions: Record<string, Point>) => void;
  /** Double-clicking a box opens its feature. */
  onOpen?: (id: string) => void;
  /** A dependency drawn from one box to another; without it, arrows cannot be drawn. */
  onLink?: (featureId: string, dependsOnId: string) => void;
  /** A selected arrow deleted; without it, arrows cannot be deleted. */
  onUnlink?: (featureId: string, dependsOnId: string) => void;
  /** A selected box deleted: the feature leaves its project and is kept. Without it, boxes cannot be deleted. */
  onRemove?: (id: string) => void;
  /** Add each box's edit button, whose edit mode changes the name and description. */
  onRename?: (id: string, name: string) => void;
  onDescribe?: (id: string, description: string) => void;
  /** The box whose name field is open, as for a feature just created; cleared when it closes. */
  editingId?: string;
  onEditingChange?: (id: string | undefined) => void;
  /** How boxes take their lattice cells (see `Arrangement`); fewest crossing arrows by default. */
  arrange?: Arrangement;
  /** Strengths of the force arrangements. */
  force?: ForceOptions;
  /** False lays the boxes out freely, with no lattice cells to snap to or guides to draw; on by default. */
  lattice?: boolean;
};

/**
 * The canvas view of a project's features: each feature's card in a box, laid out by dependency rank with a
 * gutter-routed arrow per dependency. Boxes always move; drawing and deleting arrows and boxes are offered for
 * each callback given, and change the model rather than the picture, so a refused edit never appears.
 */
export const FeatureCanvas = ({
  features,
  positions = {},
  onPositionsChange,
  onOpen,
  onLink,
  onUnlink,
  onRemove,
  onRename,
  onDescribe,
  editingId,
  onEditingChange,
  arrange = 'crossings',
  force,
  lattice = true,
}: FeatureCanvasProps) => {
  const atomRegistry = useContext(RegistryContext);
  const lookup = useMemo(() => makeFeatureLookup(features), [features]);
  const nodeContext = useMemo(
    () => ({ lookup, onRename, onDescribe, editingId, onEditingChange }),
    [lookup, onRename, onDescribe, editingId, onEditingChange],
  );
  // Owned by this component: the projection's scene atom reads both, so they live while the canvas is mounted.
  const graph = useMemo(() => Atom.make<GraphModel>(toGraph(features)), []);
  const overlay = useMemo(() => Atom.make<Overlay>({ positions }), []);
  const store = useMemo(() => createMemoryStore([]), []);
  const atoms = useMemo(() => createCanvasAtoms(DYNAMIC_VIEW_ID), []);

  // Read through a ref so the registry and projection, which the canvas does not expect to change, stay stable.
  const callbacks = useRef({ onOpen, onLink, onUnlink, onRemove });
  callbacks.current = { onOpen, onLink, onUnlink, onRemove };
  const nodes = useMemo(() => createRegistry((id) => callbacks.current.onOpen?.(id)), []);
  const editable = { link: !!onLink, delete: !!(onUnlink || onRemove) };

  useEffect(() => {
    atomRegistry.set(graph, toGraph(features));
  }, [atomRegistry, graph, features]);

  // Positions come back from the database after every drag and from other peers; only a real change re-lays out.
  useEffect(() => {
    if (!samePositions(atomRegistry.get(overlay).positions, positions)) {
      atomRegistry.set(overlay, { positions });
    }
  }, [atomRegistry, overlay, positions]);

  useEffect(
    () =>
      atomRegistry.subscribe(overlay, ({ positions: next }) => {
        if (!samePositions(next, positions)) {
          onPositionsChange?.(next);
        }
      }),
    [atomRegistry, overlay, positions, onPositionsChange],
  );

  const createProjection = useCallback(
    ({ registry, constrained }: FreehandProjectionOptions) =>
      createDynamicProjection({
        registry,
        constrained,
        graph,
        overlay,
        options: {
          ...LAYOUT,
          // Without a lattice the same slot sizes apply, so a free layout compares cell for cell with a snapped one.
          ...(lattice
            ? { lattice: LATTICE }
            : {
                size: { width: LATTICE.width, height: LATTICE.height },
                pitch: { width: LATTICE.width + LATTICE.gutterX, height: LATTICE.height + LATTICE.gutterY },
              }),
          nodes,
          arrange,
          force: { attraction: force?.attraction, repulsion: force?.repulsion, range: force?.range },
        },
        capabilities: { move: true, ...editable },
        onLink: ({ from, to }) => callbacks.current.onLink?.(from, to),
        onDelete: (ids) => {
          for (const id of ids) {
            const [from, to] = id.split(EDGE_SEPARATOR);
            if (to !== undefined) {
              callbacks.current.onUnlink?.(from, to);
            } else {
              callbacks.current.onRemove?.(id);
            }
          }
        },
      }),
    [
      graph,
      overlay,
      nodes,
      arrange,
      force?.attraction,
      force?.repulsion,
      force?.range,
      lattice,
      editable.link,
      editable.delete,
    ],
  );

  return (
    <FeatureNodeContext.Provider value={nodeContext}>
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
    </FeatureNodeContext.Provider>
  );
};
