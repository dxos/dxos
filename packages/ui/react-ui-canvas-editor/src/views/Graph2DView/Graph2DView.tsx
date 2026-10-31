//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type Camera,
  type GraphLayoutOptions,
  type GraphModel,
  type NodeRegistry,
  type SlotsCache,
  graphDocument,
  graphLayout,
  graphPositions,
  splitGraphEdit,
} from '@dxos/react-ui-canvas';
import { type LayoutIntent, type Point, type Scene, applyIntent } from '@dxos/scene';

import { createConfig2D } from '../../dimensions/index.ts';
import { type EditorDisplay, SceneEditor, useSceneEditor } from '../../editor/index.ts';

/** The camera the camera bar resets to: the origin, where an arranged graph is centred, at 1:1. */
const AUTHORED_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

const samePositions = (left: Readonly<Record<string, Point>>, right: Readonly<Record<string, Point>>): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const sameIds = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((id) => right.includes(id));

export type Graph2DViewProps = PropsWithChildren<{
  graph: GraphModel;
  /** How the graph is laid out and drawn; read again only when the object changes. */
  layout: GraphLayoutOptions;
  /** The node types the viewport draws (a host's cards among them), which the routed arrangement routes by. */
  nodes?: NodeRegistry;
  /** Where a person placed shapes, by node id; the rest are arranged. */
  positions?: Readonly<Record<string, Point>>;
  onPositionsChange?: (positions: Record<string, Point>) => void;
  /** A link drawn between two shapes; without it links cannot be drawn. */
  onLink?: (from: string, to: string) => void;
  /** Shapes and links deleted; without it nothing can be deleted. */
  onDelete?: (ids: string[]) => void;
  /** The selection, set from outside (a shape just created, say). */
  selection?: readonly string[];
  onSelectionChange?: (ids: readonly string[]) => void;
  /** Whether the background grid is drawn; a lattice's guides are the structure, so it is off by default. */
  grid?: boolean;
  /** A new key frames the graph again (an asynchronous layout landing, say); edits never refit by themselves. */
  refitKey?: string | number;
}>;

/**
 * A generated graph in the shared scene editor (COMMON-CORE-PLAN R-50): the graph laid out as a dynamic 2D layout,
 * shapes moved and pinned by the layout's modes (snapped to its lattice), and the graph's own edits (drawn links,
 * deletes) handed to the host, which owns the graph. Children float over the viewport (a legend, say).
 */
export const Graph2DView = ({
  graph,
  layout: options,
  nodes,
  positions: positionsProp,
  onPositionsChange,
  onLink,
  onDelete,
  selection,
  onSelectionChange,
  grid = false,
  refitKey,
  children,
}: Graph2DViewProps) => {
  const positions = useMemo(() => positionsProp ?? {}, [positionsProp]);
  // Arranging is the costly part, so it is redone only for a new graph or new options, never for a drag.
  const cache = useMemo<SlotsCache>(() => new WeakMap(), [options, nodes]);
  const placed = useMemo(
    () => graphLayout(graph, { nodes, ...options }, positions, cache),
    [graph, options, nodes, cache, JSON.stringify(positions)],
  );

  // The layout as drawn: the arranged graph with the edits the layout keeps (moves, pins) applied over it.
  const [drawn, setDrawn] = useState({ placed, layout: placed });
  const layout = drawn.placed === placed ? drawn.layout : placed;
  const document = useMemo(() => graphDocument(layout), [layout]);

  const latest = useRef({ layout, positions, onPositionsChange, onLink, onDelete });
  latest.current = { layout, positions, onPositionsChange, onLink, onDelete };
  const handleIntent = useCallback(
    (_layout: string, intent: LayoutIntent) => {
      const { layout: current, positions: stored, ...handlers } = latest.current;
      const { deleted, linked, rest } = splitGraphEdit(current, intent);
      deleted.length > 0 && handlers.onDelete?.(deleted);
      linked.forEach(({ from, to }) => handlers.onLink?.(from, to));
      // A refused delete or link is drawn as stored again, since the viewport drew the gesture as made.
      const next: Scene.LayoutRecord2D = rest ? applyIntent(current, rest) : { ...current };
      setDrawn({ placed, layout: next });
      const moved = graphPositions(next);
      !samePositions(moved, stored) && handlers.onPositionsChange?.(moved);
    },
    [placed],
  );

  const editable = { link: !!onLink, delete: !!onDelete };
  const config = useMemo(
    () => createConfig2D({ nodes, capabilities: { move: true, ...editable } }),
    [nodes, editable.link, editable.delete],
  );

  const [display, setDisplay] = useState<EditorDisplay>({ theme: 'flat', grid, snap: true, guides: true });
  const handleDisplayChange = useCallback(
    (next: Partial<EditorDisplay>) => setDisplay((current) => ({ ...current, ...next })),
    [],
  );
  const [camera, setCamera] = useState<Camera>();

  return (
    <SceneEditor.Root
      config={config}
      document={document}
      scene={layout.id}
      onIntent={handleIntent}
      display={display}
      onDisplayChange={handleDisplayChange}
      camera={camera}
      authoredCamera={AUTHORED_CAMERA}
      onCameraChange={setCamera}
      refitKey={refitKey}
    >
      <SelectionSync selection={selection} onSelectionChange={onSelectionChange} />
      <SceneEditor.Viewport>
        <SceneEditor.Camera />
        {children}
      </SceneEditor.Viewport>
    </SceneEditor.Root>
  );
};

type SelectionSyncProps = Pick<Graph2DViewProps, 'selection' | 'onSelectionChange'>;

/** The editor's selection kept in step with the host's: set from outside, and reported when a person changes it. */
const SelectionSync = ({ selection, onSelectionChange }: SelectionSyncProps) => {
  const { store } = useSceneEditor('Graph2DView');
  const current = useAtomValue(store.atoms.selection);
  useEffect(() => {
    selection && !sameIds(selection, current) && store.select(selection);
  }, [store, selection]);
  // Reported on change only, so mounting reports nothing.
  const reported = useRef(current);
  useEffect(() => {
    if (!sameIds(reported.current, current)) {
      reported.current = current;
      onSelectionChange?.(current);
    }
  }, [current, onSelectionChange]);
  return null;
};
