//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';

import {
  type Arrangement,
  type CreateProps,
  type ForceOptions,
  type GraphLayoutOptions,
  type GraphModel,
  type LatticeSpec,
  type NodeViewProps,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
} from '@dxos/react-ui-canvas';
import { Graph2DView } from '@dxos/react-ui-canvas-editor';
import * as Layout from '@dxos/react-ui/Layout';
import { type Node, type Point, nodeBase } from '@dxos/scene';

import { FeatureCard, type FeatureLookup, type FeatureModel, makeFeatureLookup } from '../FeatureCard/index.ts';

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

const LAYOUT: GraphLayoutOptions = {
  shape: () => ({ type: FEATURE_NODE_TYPE }),
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
  /** How boxes take their lattice cells (see `Arrangement`); fewest crossing arrows by default. */
  arrange?: Arrangement;
  /** Strengths of the force arrangements. */
  force?: ForceOptions;
  /** False lays the boxes out freely, with no lattice cells to snap to or guides to draw; on by default. */
  lattice?: boolean;
};

/**
 * The canvas view of one level of a spec's features: each feature's card in a box, laid out by dependency rank with
 * a gutter-routed arrow per dependency. A click selects a box and a double-click zooms into it. Boxes always move;
 * drawing and deleting arrows and boxes are offered for each callback given, and change the model rather than the
 * picture, so a refused edit never appears.
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
  arrange = 'crossings',
  force,
  lattice = true,
}: FeatureCanvasProps) => {
  const lookup = useMemo(() => makeFeatureLookup(features), [features]);
  const nodeContext = useMemo(() => ({ lookup }), [lookup]);
  const graph = useMemo(() => toGraph(features), [features]);

  // Read through a ref so the registry, which the viewport does not expect to change, stays stable.
  const callbacks = useRef({ onSelect, onZoom, onLink, onUnlink, onRemove });
  callbacks.current = { onSelect, onZoom, onLink, onUnlink, onRemove };
  const nodes = useMemo(() => createRegistry((id) => callbacks.current.onZoom?.(id)), []);

  const layout = useMemo<GraphLayoutOptions>(
    () => ({
      ...LAYOUT,
      // Without a lattice the same slot sizes apply, so a free layout compares cell for cell with a snapped one.
      ...(lattice
        ? { lattice: LATTICE }
        : {
            size: { width: LATTICE.width, height: LATTICE.height },
            pitch: { width: LATTICE.width + LATTICE.gutterX, height: LATTICE.height + LATTICE.gutterY },
          }),
      arrange,
      force: { attraction: force?.attraction, repulsion: force?.repulsion, range: force?.range },
    }),
    [lattice, arrange, force?.attraction, force?.repulsion, force?.range],
  );

  // A single selected box is the selected feature; an arrow, several boxes or none select nothing.
  const handleSelectionChange = useCallback((ids: readonly string[]) => {
    const [id] = ids;
    callbacks.current.onSelect?.(ids.length === 1 && !id.includes(EDGE_SEPARATOR) ? id : undefined);
  }, []);
  const selection = useMemo(() => (selectedId && lookup(selectedId) ? [selectedId] : undefined), [selectedId, lookup]);

  const handleLink = useCallback((from: string, to: string) => callbacks.current.onLink?.(from, to), []);
  const handleDelete = useCallback((ids: string[]) => {
    for (const id of ids) {
      const [from, to] = id.split(EDGE_SEPARATOR);
      if (to !== undefined) {
        callbacks.current.onUnlink?.(from, to);
      } else {
        callbacks.current.onRemove?.(id);
      }
    }
  }, []);

  return (
    <FeatureNodeContext.Provider value={nodeContext}>
      <Graph2DView
        graph={graph}
        layout={layout}
        nodes={nodes}
        positions={positions}
        onPositionsChange={onPositionsChange}
        onLink={onLink ? handleLink : undefined}
        onDelete={onUnlink || onRemove ? handleDelete : undefined}
        selection={selection}
        onSelectionChange={handleSelectionChange}
      />
    </FeatureNodeContext.Provider>
  );
};
