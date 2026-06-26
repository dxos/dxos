//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { Slot } from '@radix-ui/react-slot';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { composableProps, slottable } from '@dxos/react-ui';
import {
  type GraphLayout,
  type GraphLayoutNode,
  type GraphProjector,
  GraphSwarmProjector,
  type ModelPoint,
  SVG,
  type SVGContext,
} from '@dxos/react-ui-graph';
import { type SpaceGraphEdge, type SpaceGraphModel, type SpaceGraphNode } from '@dxos/schema';
import { type SlottableProps } from '@dxos/ui-types';

import { type TreeNode } from '../Tree';

import { type VisualizationVariant, type VisualizationVariantId, getVariant } from './variants';

//
// Context
//

type VisualizationContextValue = {
  model: SpaceGraphModel;
  variant: VisualizationVariant;
  /** Externally-supplied focus (ego centre); overrides click-driven focus when set. */
  focus?: string;
};

const [VisualizationProvider, useVisualizationContext] =
  createContext<VisualizationContextValue>('Visualization.Root');

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
const VisualizationRoot = slottable<
  HTMLDivElement,
  { model: SpaceGraphModel; variant: VisualizationVariantId; focus?: string; onSurfaceClick?: () => void }
>(({ children, asChild, model, variant, focus, onSurfaceClick, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props, { classNames: 'dx-expander relative' });
  const Comp = asChild ? Slot : 'div';
  return (
    <VisualizationProvider model={model} variant={getVariant(variant)} focus={focus}>
      <Comp {...rest} className={className} onClick={onSurfaceClick} ref={forwardedRef}>
        {children}
      </Comp>
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
const VisualizationGraph = ({ debug = true, onNodeHover }: VisualizationGraphProps) => {
  const { model, variant, focus } = useVisualizationContext('Visualization.Graph');

  const svgRef = useRef<SVGContext>(null);
  const [projector, setProjector] = useState<GraphProjector<SpaceGraphNode> | undefined>();
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

  // Subscribe to the graph atom — keeps it alive across child unmounts (effect-atom
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

    setProjector(variant.createProjector(svgRef.current, { focusId, prev: lastLayoutRef.current }));
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
  // SVG model coordinates — same space the boids live in.
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

  // Only attach pointer handlers when the variant tracks the cursor — others don't need them
  // and we want to avoid the per-move CTM math when it'd be a no-op.
  const pointerProps = variant.trackPointer
    ? { onPointerMove: handlePointerMove, onPointerLeave: handlePointerLeave }
    : undefined;

  return (
    <SVG.Root ref={svgRef}>
      <SVG.Zoom extent={[1 / 2, 2]}>
        <SVG.Graph<SpaceGraphNode, SpaceGraphEdge>
          model={model}
          projector={projector}
          renderNode={variant.renderNode}
          applyNode={variant.applyNode}
          edgeOpacity={variant.edgeOpacity}
          drag={variant.drag}
          highlightOnHover={variant.highlightOnHover}
          onSelect={handleSelect}
          onInspect={handleInspect}
          {...pointerProps}
        />
      </SVG.Zoom>
      {debug && <SVG.FPS />}
    </SVG.Root>
  );
};

VisualizationGraph.displayName = 'Visualization.Graph';

//
// Visualization
//

export const Visualization = {
  Root: VisualizationRoot,
  Graph: VisualizationGraph,
};
