//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import { Obj } from '@dxos/echo';
import * as GraphModel from '@dxos/graph/GraphModel';
import { createContext } from '@dxos/react-hooks';
import {
  type GraphLayout,
  type GraphLayoutNode,
  type GraphProjector,
  GraphSwarmProjector,
  type ModelPoint,
  SVG,
  type SVGContext,
  type TreeNode,
} from '@dxos/react-ui-graph';
import * as Util from '@dxos/react-ui/Util';
import { type SpaceGraphEdge, type SpaceGraphModel, type SpaceGraphNode } from '@dxos/schema';
import { mx } from '@dxos/ui-theme';
import { type SlottableProps } from '@dxos/ui-types';

import { getNodeFillForObject } from '../../util/index.ts';
import { type VisualizationVariant, type VisualizationVariantId, getVariant, shortTypename } from './variants.ts';

//
// Context
//

type VisualizationContextValue = {
  model: SpaceGraphModel;
  variant: VisualizationVariant;
  /** Externally-supplied focus (ego centre); overrides click-driven focus when set. */
  focus?: string;
  /** Types (see {@link getTypeKey}) whose nodes are filtered out of the graph. */
  hiddenTypes: ReadonlySet<string>;
  onToggleType: (type: string, visible: boolean) => void;
  /** Show only `type` among `types`; when it is already the only one shown, show them all. */
  onSoloType: (type: string, types: readonly string[]) => void;
};

/** Filter key for a node: its object's typename, or the node's own type for synthetic nodes. */
const getTypeKey = (node: SpaceGraphNode): string => {
  const object = node.data?.object;
  return object ? (Obj.getTypename(object) ?? '(untyped)') : (node.type ?? '(other)');
};

/**
 * Whether a node is shown at all: objects of system types (space properties, views, indexes) are left out,
 * using the same user-type rule as the navigator and object pickers. Synthetic nodes have no object and stay.
 */
const isListedNode = (node: SpaceGraphNode): boolean => {
  const object = node.data?.object;
  return !object || TypeOptions.isUserObject(object);
};

/** The model's current graph without system-type objects, re-read whenever the model changes. */
const useModelGraph = (model: SpaceGraphModel) => {
  const [graph, setGraph] = useState(() => model.graph);
  useEffect(() => {
    setGraph(model.graph);
    return model.subscribe((_, graph) => setGraph(graph));
  }, [model]);
  return useMemo(() => {
    const nodes = graph.nodes.filter(isListedNode);
    if (nodes.length === graph.nodes.length) {
      return graph;
    }
    const ids = new Set(nodes.map((node) => node.id));
    return { nodes, edges: graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)) };
  }, [graph]);
};

/**
 * The model with system types and hidden types removed (and every edge touching them). A derived model rather than a
 * query filter, so the toggles compose with the host's own filter on the source model.
 */
const useFilteredModel = (
  model: SpaceGraphModel,
  hiddenTypes: ReadonlySet<string>,
): GraphModel.GraphModel<SpaceGraphNode, SpaceGraphEdge> | SpaceGraphModel => {
  const graph = useModelGraph(model);
  return useMemo(() => {
    if (hiddenTypes.size === 0 && graph === model.graph) {
      return model;
    }

    const nodes = graph.nodes.filter((node) => !hiddenTypes.has(getTypeKey(node)));
    const ids = new Set(nodes.map((node) => node.id));
    const edges = graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
    return new GraphModel.GraphModel<SpaceGraphNode, SpaceGraphEdge>({
      registry: model.registry,
      graph: { nodes, edges },
    });
  }, [model, graph, hiddenTypes]);
};

const [VisualizationProvider, useVisualizationContext] = createContext<VisualizationContextValue>('Visualization.Root');

//
// Root
//

export type VisualizationRootProps = SlottableProps<{
  model: SpaceGraphModel;
  variant: VisualizationVariantId;
  /** Focus node id placed at the centre of ego/plexus layouts (e.g. the active node for the companion). */
  focus?: string;
  /** Called when the user clicks the visualization surface (e.g. to dismiss a node preview). */
  onSurfaceClick?: () => void;
}>;

/**
 * Surface for a visualization. Resolves the variant definition and shares it (plus the model and
 * focus) with the child `Visualization.Graph` via context, so the variant string is set in one
 * place. The surface element is slottable via `asChild` for composition into a host layout.
 */
const VisualizationRoot = Util.slottable<
  HTMLDivElement,
  { model: SpaceGraphModel; variant: VisualizationVariantId; focus?: string; onSurfaceClick?: () => void }
>(({ children, asChild, model, variant, focus, onSurfaceClick, ...props }, forwardedRef) => {
  const { className, ...rest } = Util.composableProps(props, { classNames: 'dx-expand relative' });
  const [hiddenTypes, setHiddenTypes] = useState<ReadonlySet<string>>(() => new Set());
  const handleToggleType = useCallback((type: string, visible: boolean) => {
    setHiddenTypes((current) => {
      const next = new Set(current);
      if (visible) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const handleSoloType = useCallback((type: string, types: readonly string[]) => {
    setHiddenTypes((current) => {
      const solo = types.every((other) => (other === type) !== current.has(other));
      return solo ? new Set() : new Set(types.filter((other) => other !== type));
    });
  }, []);

  return (
    <VisualizationProvider
      model={model}
      variant={getVariant(variant)}
      focus={focus}
      hiddenTypes={hiddenTypes}
      onToggleType={handleToggleType}
      onSoloType={handleSoloType}
    >
      <ark.div asChild={asChild} {...rest} className={className} onClick={onSurfaceClick} ref={forwardedRef}>
        {children}
      </ark.div>
    </VisualizationProvider>
  );
});

VisualizationRoot.displayName = 'Visualization.Root';

//
// Graph
//

export type VisualizationGraphProps = {
  debug?: boolean;
  onNodeHover?: (node: TreeNode | null, event?: MouseEvent) => void;
};

/**
 * Renders the active variant's projector + node renderer into a zoomable SVG surface. Reads the
 * model, variant definition, and focus from `Visualization.Root` context; owns the live projector,
 * click-driven focus, and the layout snapshot that lets each variant swap animate from prior positions.
 */
const VisualizationGraph = ({ debug = false, onNodeHover }: VisualizationGraphProps) => {
  const { model, variant, focus, hiddenTypes } = useVisualizationContext('Visualization.Graph');
  const filteredModel = useFilteredModel(model, hiddenTypes);

  const svgRef = useRef<SVGContext>(null);
  // The projector is paired with the variant that created it: the variant changes a render before its
  // projector exists, and rendering the new variant's props against the old layout flashes its edges.
  const [active, setActive] = useState<{ projector: GraphProjector<SpaceGraphNode>; variant: VisualizationVariant }>();
  const projector = active?.projector;
  const projectorRef = useRef<GraphProjector<SpaceGraphNode> | undefined>(undefined);
  projectorRef.current = projector;

  // Click-driven focus for focusable variants (plexus). `undefined` means "no node focused".
  const [clickFocusId, setClickFocusId] = useState<string | undefined>(undefined);

  // Externally-supplied focus (e.g. the active node for the neighborhood companion) wins; otherwise
  // the click-driven focus drives focusable variants.
  const focusId = focus ?? clickFocusId;

  // Latest layout we hand to the next SVG projector as `prev`. Captured from the live
  // projector when the variant changes so node x/y survive the swap.
  const lastLayoutRef = useRef<GraphLayout<SpaceGraphNode> | undefined>(undefined);

  // Subscribe to the graph atom - keeps it alive across child unmounts (effect-atom
  // disposes atoms with no subscribers) and triggers re-renders when query results land.
  useEffect(() => model?.subscribe(() => undefined), [model]);

  // Clear any click focus when leaving a focusable variant so returning starts from the bundle layout.
  useEffect(() => {
    if (!variant.focusable) {
      setClickFocusId(undefined);
    }
  }, [variant]);

  // Recreate the projector when the variant or focus changes; snapshot the live layout
  // first so the next projector animates from where the previous one left off.
  useEffect(() => {
    if (projectorRef.current?.layout) {
      lastLayoutRef.current = projectorRef.current.layout as GraphLayout<SpaceGraphNode>;
    }
    if (!svgRef.current) {
      return;
    }

    setActive({
      projector: variant.createProjector(svgRef.current, { focusId, prev: lastLayoutRef.current }),
      variant,
    });
  }, [variant, focusId]);

  // Focusable variants (plexus): clicking an object node re-focuses on it; clicking the current
  // focus clears it. Synthetic nodes carry no ECHO object, so their clicks are ignored.
  const handleSelect = useCallback(
    (node: GraphLayoutNode<SpaceGraphNode>) => {
      if (!variant.focusable || !node.data?.data?.object) {
        return;
      }
      setClickFocusId((current) => (current === node.id ? undefined : node.id));
    },
    [variant],
  );

  // Cursor avoidance for the SVG swarm. The Graph component hands us pre-transformed
  // SVG model coordinates - same space the boids live in.
  const handlePointerMove = useCallback(
    (point: ModelPoint) => {
      if (projector instanceof GraphSwarmProjector) {
        projector.setCursor(point.x, point.y);
      }
    },
    [projector],
  );

  const handlePointerLeave = useCallback(() => {
    if (projector instanceof GraphSwarmProjector) {
      projector.setCursor(null);
    }
  }, [projector]);

  const handleInspect = useCallback(
    (node: GraphLayoutNode<SpaceGraphNode> | null, event: MouseEvent) => {
      if (!variant.emitsHover) {
        return;
      }
      onNodeHover?.(node ? { id: node.id, data: node.data?.data?.object } : null, event);
    },
    [variant, onNodeHover],
  );

  // Only attach pointer handlers when the variant tracks the cursor - others don't need them
  // and we want to avoid the per-move CTM math when it'd be a no-op.
  const pointerProps = variant.trackPointer
    ? { onPointerMove: handlePointerMove, onPointerLeave: handlePointerLeave }
    : undefined;

  return (
    <SVG.Root ref={svgRef}>
      <SVG.Zoom extent={[1 / 2, 2]}>
        {/* Mount only once the variant's projector exists; otherwise SVG.Graph falls back to a
            force projector for a frame, flashing the wrong layout for non-force variants. */}
        {active && (
          <SVG.Graph<SpaceGraphNode, SpaceGraphEdge>
            model={filteredModel}
            projector={active.projector}
            renderNode={active.variant.renderNode}
            applyNode={active.variant.applyNode}
            edgeOpacity={active.variant.edgeOpacity}
            drag={active.variant.drag}
            highlightOnHover={active.variant.highlightOnHover}
            onSelect={handleSelect}
            onInspect={handleInspect}
            {...pointerProps}
          />
        )}
      </SVG.Zoom>
      {debug && <SVG.FPS />}
    </SVG.Root>
  );
};

VisualizationGraph.displayName = 'Visualization.Graph';

//
// TypeFilter
//

export type VisualizationTypeFilterProps = Util.ThemedClassName<{}>;

/**
 * Inset panel listing the model's object types; clicking a row hides or shows its nodes, and
 * cmd-clicking one shows only that type.
 * Positioned over the graph inside `Visualization.Root`.
 */
const VisualizationTypeFilter = ({ classNames }: VisualizationTypeFilterProps) => {
  const { model, hiddenTypes, onToggleType, onSoloType } = useVisualizationContext('Visualization.TypeFilter');
  const graph = useModelGraph(model);
  const types = useMemo(() => {
    const byType = new Map<string, { type: string; label: string; fill: string; count: number }>();
    for (const node of graph.nodes) {
      const type = getTypeKey(node);
      const entry = byType.get(type);
      if (entry) {
        entry.count++;
      } else {
        // Same fill the renderers use, so each swatch matches its nodes.
        byType.set(type, { type, label: shortTypename(type), fill: getNodeFillForObject(node.data?.object), count: 1 });
      }
    }
    return [...byType.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [graph]);

  if (types.length === 0) {
    return null;
  }

  return (
    <div
      role='group'
      aria-label='Types'
      className={mx(
        // Columns: swatch, label (start-aligned), count (end-aligned); each row is one toggle button.
        'absolute top-2 end-2 z-10 grid grid-cols-[auto_1fr_auto] gap-y-0.5 p-1 rounded-md border border-separator dx-base-surface text-sm',
        classNames,
      )}
      // Keep toggling from reaching the surface click handler, which dismisses previews.
      onClick={(event) => event.stopPropagation()}
    >
      {types.map(({ type, label, fill, count }) => {
        const visible = !hiddenTypes.has(type);
        return (
          <button
            key={type}
            type='button'
            aria-pressed={visible}
            className={mx(
              'col-span-3 grid grid-cols-subgrid items-center gap-x-2 px-1.5 py-0.5 rounded-sm text-start',
              'hover:bg-hover-surface dx-focus-ring',
              !visible && 'text-description',
            )}
            // Cmd-click (ctrl-click off macOS) shows only this type.
            onClick={(event) =>
              event.metaKey || event.ctrlKey
                ? onSoloType(
                    type,
                    types.map(({ type }) => type),
                  )
                : onToggleType(type, !visible)
            }
          >
            {/* Off reads as neutral rather than the type's color. */}
            <span
              className='size-2.5 rounded-full'
              style={{ backgroundColor: visible ? fill : 'var(--color-neutral-500)' }}
            />
            <span className='truncate'>{label}</span>
            <span className='text-end text-description tabular-nums'>{count}</span>
          </button>
        );
      })}
    </div>
  );
};

VisualizationTypeFilter.displayName = 'Visualization.TypeFilter';

//
// Visualization
//

export const Visualization = {
  Root: VisualizationRoot,
  Graph: VisualizationGraph,
  TypeFilter: VisualizationTypeFilter,
};
