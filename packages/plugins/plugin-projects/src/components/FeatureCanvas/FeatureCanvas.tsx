//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/reactivity/Atom';
import * as Schema from 'effect/Schema';
import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';

import {
  type CreateProps,
  DYNAMIC_SCENE_ID,
  type DynamicOptions,
  type FreehandProjectionOptions,
  type GraphModel,
  type Node,
  type NodeViewProps,
  type Overlay,
  type Point,
  SceneView,
  createDynamicProjection,
  createMemoryStore,
  createNodeRegistry,
  createSceneViewAtoms,
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

/** Node views get no host props, so the cards' data reaches them through context. */
const FeatureLookupContext = createContext<FeatureLookup>(() => undefined);

const FeatureNodeView = ({ node }: NodeViewProps) => {
  const lookup = useContext(FeatureLookupContext);
  const feature = lookup(node.id);
  return (
    // Inert, so a press anywhere on the card selects and drags the box rather than reaching the card.
    <Layout.Grid classNames='dx-cover overflow-hidden pointer-events-none' data-testid='feature-canvas-node'>
      {feature && <FeatureCard feature={feature} lookup={lookup} showDependencies={false} />}
    </Layout.Grid>
  );
};

const registry = createNodeRegistry(
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
      // The card draws its own frame.
      bare: true,
    },
  },
  defaultNodePrototypes,
);

const LAYOUT: DynamicOptions = {
  size: { width: 288, height: 192 },
  pitch: { width: 336, height: 272 },
  createNode: (_node, props) => createFeatureNode(props),
  link: { type: 'line', ends: { end: 'arrow' } },
};

/** Edges point from a feature to what it depends on, so rows read from dependents down to foundations. */
const toGraph = (features: readonly FeatureModel[]): GraphModel => {
  const ids = new Set(features.map((feature) => feature.id));
  return {
    nodes: features.map((feature) => ({ id: feature.id, label: feature.name })),
    edges: features.flatMap((feature) =>
      feature.dependsOn
        .filter((id) => ids.has(id))
        .map((id) => ({ id: `${feature.id}->${id}`, from: feature.id, to: id })),
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
};

/**
 * The canvas view of a feature map: each feature's card in a box, laid out by dependency rank with a
 * straight arrow per dependency. Moving a box is the only edit.
 */
export const FeatureCanvas = ({ features, positions = {}, onPositionsChange }: FeatureCanvasProps) => {
  const atomRegistry = useContext(RegistryContext);
  const lookup = useMemo(() => makeFeatureLookup(features), [features]);
  // Owned by this component: the projection's scene atom reads both, so they live while the canvas is mounted.
  const graph = useMemo(() => Atom.make<GraphModel>(toGraph(features)), []);
  const overlay = useMemo(() => Atom.make<Overlay>({ positions }), []);
  const store = useMemo(() => createMemoryStore([]), []);
  const atoms = useMemo(() => createSceneViewAtoms(DYNAMIC_SCENE_ID), []);

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
      createDynamicProjection({ registry, graph, overlay, options: LAYOUT, capabilities: { move: true } }),
    [graph, overlay],
  );

  return (
    <FeatureLookupContext.Provider value={lookup}>
      <SceneView.Root
        store={store}
        root={DYNAMIC_SCENE_ID}
        atoms={atoms}
        nodes={registry}
        createProjection={createProjection}
      >
        <SceneView.Canvas />
        <SceneView.Navigation />
      </SceneView.Root>
    </FeatureLookupContext.Provider>
  );
};
