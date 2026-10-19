//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/reactivity/Atom';
import * as Schema from 'effect/Schema';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import {
  Canvas,
  type CreateProps,
  DYNAMIC_SCENE_ID,
  type DynamicOptions,
  type FreehandProjectionOptions,
  type GraphModel,
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

const FEATURE_NODE_TYPE = 'feature';

/** A box that shows one feature's card; the node id is the feature id. */
const FeatureNode = Schema.Struct({ type: Schema.Literal(FEATURE_NODE_TYPE), ...nodeBase });

const createFeatureNode = (props: CreateProps): Node => ({ type: FEATURE_NODE_TYPE, ...props });

type FeatureNodeContextValue = Pick<FeatureCanvasProps, 'onRename' | 'onDescribe' | 'editingId' | 'onEditingChange'> & {
  lookup: FeatureLookup;
};

/** Node views get no host props, so the cards' data and edits reach them through context. */
const FeatureNodeContext = createContext<FeatureNodeContextValue>({ lookup: () => undefined });

const FeatureNodeView = ({ node }: NodeViewProps) => {
  const { lookup, onRename, onDescribe, editingId, onEditingChange } = useContext(FeatureNodeContext);
  const feature = lookup(node.id);
  return (
    // Inert but for its text fields, so a press anywhere else on the card selects and drags the box.
    <Layout.Grid classNames='dx-cover overflow-hidden pointer-events-none' data-testid='feature-canvas-node'>
      {feature && (
        <FeatureCard
          feature={feature}
          lookup={lookup}
          showDependencies={false}
          // A double-click on a box opens the feature, so a field opens only from its pencil.
          editActivation='none'
          onRename={onRename ? (feature, name) => onRename(feature.id, name) : undefined}
          onDescribe={onDescribe ? (feature, description) => onDescribe(feature.id, description) : undefined}
          editingName={feature.id === editingId}
          onEditingNameChange={(editing) => onEditingChange?.(editing ? feature.id : undefined)}
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

const LAYOUT: Omit<DynamicOptions, 'nodes'> = {
  size: { width: 288, height: 192 },
  pitch: { width: 336, height: 272 },
  createNode: (_node, props) => createFeatureNode(props),
  link: { type: 'line', ends: { end: 'arrow' } },
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
  /** A selected box deleted: the feature leaves the map and is kept. Without it, boxes cannot be deleted. */
  onRemove?: (id: string) => void;
  /** Make each box's name and description editable from their pencils. */
  onRename?: (id: string, name: string) => void;
  onDescribe?: (id: string, description: string) => void;
  /** The box whose name field is open, as for a feature just created; cleared when it closes. */
  editingId?: string;
  onEditingChange?: (id: string | undefined) => void;
};

/**
 * The canvas view of a feature map: each feature's card in a box, laid out by dependency rank with a
 * straight arrow per dependency. Boxes always move; drawing and deleting arrows and boxes are offered for
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
  const atoms = useMemo(() => createCanvasAtoms(DYNAMIC_SCENE_ID), []);

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
    ({ registry }: FreehandProjectionOptions) =>
      createDynamicProjection({
        registry,
        graph,
        overlay,
        options: { ...LAYOUT, nodes },
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
    [graph, overlay, nodes, editable.link, editable.delete],
  );

  return (
    <FeatureNodeContext.Provider value={nodeContext}>
      <Canvas.Root
        store={store}
        root={DYNAMIC_SCENE_ID}
        atoms={atoms}
        nodes={nodes}
        createProjection={createProjection}
      >
        <Canvas.Viewport />
        <Canvas.Navigation />
      </Canvas.Root>
    </FeatureNodeContext.Provider>
  );
};
