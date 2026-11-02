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
import { FeatureCanvasCells } from './FeatureCanvasCells.tsx';

const FEATURE_NODE_TYPE = 'feature';

/** A box that shows one feature's card; the node id is the feature id. */
const FeatureNode = Schema.Struct({ type: Schema.Literal(FEATURE_NODE_TYPE), ...nodeBase });

const createFeatureNode = (props: CreateProps): Node => ({ type: FEATURE_NODE_TYPE, ...props });

type FeatureNodeContextValue = {
  lookup: FeatureLookup;
};

/** Node views get no host props, so the cards' data reach them through context. */
const FeatureNodeContext = createContext<FeatureNodeContextValue>({ lookup: () => undefined });

const FeatureNodeView = ({ node }: NodeViewProps) => {
  const { lookup } = useContext(FeatureNodeContext);
  const feature = lookup(node.id);
  return (
    // One bounded row, so the card fits the box; it is a summary that never scrolls, so presses, the wheel and
    // double-clicks all reach the canvas, which selects, pans and zooms.
    <Layout.Grid classNames='dx-cover grid-rows-[minmax(0,1fr)] overflow-hidden' data-testid='feature-canvas-node'>
      {feature && (
        <FeatureCard.Root feature={feature} lookup={lookup} classNames='h-full'>
          <FeatureCard.Header>
            <FeatureCard.Status />
            <FeatureCard.Title />
            <FeatureCard.Marks />
          </FeatureCard.Header>
          {/* Dependencies are the canvas's arrows, and the rest is the companion's, so the card stays a summary. */}
          <FeatureCard.Body>
            <FeatureCard.Description lines={3} />
            <FeatureCard.Summary />
            <FeatureCard.External />
          </FeatureCard.Body>
        </FeatureCard.Root>
      )}
    </Layout.Grid>
  );
};

/** The node registry, with `hostOpen` so a double-click zooms the map into the feature instead of into the box. */
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

/**
 * Edges point from a feature to what it depends on, so rows read from dependents down to foundations; a dependency on
 * another spec's feature has no box here, and its card marks it instead.
 */
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
  /** The box selected by a click; a press on the background or Escape clears it. */
  onSelect?: (id: string | undefined) => void;
  /** Double-clicking a box zooms the map into the feature, to its subfeatures. */
  onZoom?: (id: string) => void;
  /** A dependency drawn from one box to another; without it, arrows cannot be drawn. */
  onLink?: (featureId: string, dependsOnId: string) => void;
  /** A selected arrow deleted; without it, arrows cannot be deleted. */
  onUnlink?: (featureId: string, dependsOnId: string) => void;
  /** A selected box deleted: the feature is deleted, with its breakdown. Without it, boxes cannot be deleted. */
  onRemove?: (id: string) => void;
  /** A box to select from outside, as for a feature just created. */
  selectedId?: string;
  /** A new feature in the empty cell centred on a point; without it and `onAdd`, empty cells offer nothing. */
  onCreate?: (position: Point) => void;
  /** An existing feature moved into the empty cell centred on a point. */
  onAdd?: (position: Point) => void;
  /** How boxes take their lattice cells (see `Arrangement`); fewest crossing arrows by default. */
  arrange?: Arrangement;
  /** Strengths of the force arrangements. */
  force?: ForceOptions;
  /** False lays the boxes out freely, with no lattice cells to snap to or guides to draw; on by default. */
  lattice?: boolean;
};

/**
 * The canvas view of one level of a spec's features: each feature's card in a box, laid out by dependency rank with
 * a gutter-routed arrow per dependency. A click selects a box and a double-click zooms into it; a `+` in an empty cell
 * next to the boxes adds a feature there. Boxes always move; drawing and deleting arrows and boxes are offered for each
 * callback given, and change the model rather than the picture, so a refused edit never appears.
 */
export const FeatureCanvas = ({
  features,
  positions = {},
  onPositionsChange,
  onSelect,
  onZoom,
  onLink,
  onUnlink,
  onRemove,
  selectedId,
  onCreate,
  onAdd,
  arrange = 'crossings',
  force,
  lattice = true,
}: FeatureCanvasProps) => {
  const atomRegistry = useContext(RegistryContext);
  const lookup = useMemo(() => makeFeatureLookup(features), [features]);
  const nodeContext = useMemo(() => ({ lookup }), [lookup]);
  // Owned by this component: the projection's scene atom reads both, so they live while the canvas is mounted.
  const graph = useMemo(() => Atom.make<GraphModel>(toGraph(features)), []);
  const overlay = useMemo(() => Atom.make<Overlay>({ positions }), []);
  const store = useMemo(() => createMemoryStore([]), []);
  const atoms = useMemo(() => createCanvasAtoms(DYNAMIC_VIEW_ID), []);

  // Read through a ref so the registry and projection, which the canvas does not expect to change, stay stable.
  const callbacks = useRef({ onSelect, onZoom, onLink, onUnlink, onRemove });
  callbacks.current = { onSelect, onZoom, onLink, onUnlink, onRemove };
  const nodes = useMemo(() => createRegistry((id) => callbacks.current.onZoom?.(id)), []);
  const editable = { link: !!onLink, delete: !!(onUnlink || onRemove) };

  useEffect(() => {
    atomRegistry.set(graph, toGraph(features));
  }, [atomRegistry, graph, features]);

  // A single selected box is the selected feature; an arrow, several boxes or none select nothing.
  useEffect(
    () =>
      atomRegistry.subscribe(atoms.selection, (selection) => {
        const [id] = selection;
        const feature = selection.size === 1 && !id.includes(EDGE_SEPARATOR) ? id : undefined;
        callbacks.current.onSelect?.(feature);
      }),
    [atomRegistry, atoms],
  );

  useEffect(() => {
    if (selectedId && lookup(selectedId)) {
      const current = atomRegistry.get(atoms.selection);
      if (current.size !== 1 || !current.has(selectedId)) {
        atomRegistry.set(atoms.selection, new Set([selectedId]));
      }
    }
  }, [atomRegistry, atoms, selectedId, lookup]);

  const handlePin = useCallback(
    (centers: Record<string, Point>) =>
      atomRegistry.set(overlay, { positions: { ...centers, ...atomRegistry.get(overlay).positions } }),
    [atomRegistry, overlay],
  );

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
        {/* No navigation bar: a feature map does not nest scenes, a double-click opens the feature's own level. */}
        <Canvas.Viewport overlay={<FeatureCanvasCells onCreate={onCreate} onAdd={onAdd} onPin={handlePin} />} />
      </Canvas.Root>
    </FeatureNodeContext.Provider>
  );
};
