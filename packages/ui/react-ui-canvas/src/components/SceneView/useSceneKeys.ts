//
// Copyright 2026 DXOS.org
//

import { type KeyboardEvent, useCallback } from 'react';

import { type useRegistry } from '../../hooks/index.ts';
import { type SceneViewAtoms } from '../../model/atoms.ts';
import { isToolKey, keyAction } from '../../model/keys.ts';
import { type Projection } from '../../model/projection.ts';
import { type LinkRegistry, type NodeRegistry, nodeDef } from '../../model/registry.ts';
import { type Bounds, type Capabilities, type ElementId, type Scene, type Size } from '../../model/types.ts';
import { fitBounds, zoomAt } from '../../utils/camera.ts';
import { unionBounds } from '../../utils/hit.ts';
import { nodeBounds } from '../../utils/shapes.ts';
import { toolForKey } from '../Palette/Palette.tsx';
import { type PointerMachine } from './usePointerMachine.ts';
import { type SceneCamera } from './useSceneCamera.ts';
import { type SceneClipboard } from './useSceneClipboard.ts';
import { type SceneNavigation } from './useSceneNavigation.ts';
import { type SceneSnap } from './useSceneSnap.ts';

export type UseSceneKeysOptions = {
  registry: ReturnType<typeof useRegistry>;
  atoms: SceneViewAtoms;
  scene: Scene;
  nodeRegistry: NodeRegistry;
  linkRegistry: LinkRegistry;
  projection: Projection;
  capabilities: Capabilities;
  viewport: Size;
  /** The current scene's frame, which `fit` frames. */
  bounds: Bounds;
  /** Least gap between that frame and a viewport edge when fitting, in scene units. */
  inset: number;
  /** Minor grid spacing in scene px; an arrow nudges by it. */
  grid: number;
  select: (ids: Iterable<ElementId>) => void;
  toggleSnap: () => void;
  toggleDebug: () => void;
  onUndo: () => void;
  onRedo: () => void;
} & Pick<SceneCamera, 'animateTo'> &
  Pick<SceneNavigation, 'drillIn' | 'drillOut' | 'goHistory'> &
  Pick<SceneSnap, 'major'> &
  Pick<SceneClipboard, 'copy' | 'cut' | 'paste'> &
  Pick<PointerMachine, 'cancelDrag' | 'removePoint' | 'setTool'>;

/**
 * What a chord does in the state the view is in. Every chord itself comes from `KEY_BINDINGS`, so this
 * decides only what the action means here — Escape backs out of whatever is innermost (a drag, then a
 * selected control point, then the selection, then the scene itself), and Delete reads the same way.
 */
export const useSceneKeys = ({
  registry,
  atoms,
  scene,
  nodeRegistry,
  linkRegistry,
  projection,
  capabilities,
  viewport,
  bounds,
  inset,
  grid,
  select,
  toggleSnap,
  toggleDebug,
  onUndo,
  onRedo,
  animateTo,
  drillIn,
  drillOut,
  goHistory,
  major,
  copy,
  cut,
  paste,
  cancelDrag,
  removePoint,
  setTool,
}: UseSceneKeysOptions): ((event: KeyboardEvent) => void) => {
  return useCallback(
    (event: KeyboardEvent) => {
      const selected = [...registry.get(atoms.selection)];
      const selectedNodes = selected.filter((id) => scene.nodes[id] !== undefined);
      const point = registry.get(atoms.point);
      const action = keyAction(event);
      switch (action) {
        case 'cancel':
          if (registry.get(atoms.drag)) {
            cancelDrag();
          } else if (point) {
            registry.set(atoms.point, undefined);
          } else if (selected.length > 0) {
            select([]);
          } else {
            drillOut();
          }
          break;
        case 'delete':
          if (point) {
            removePoint(point);
          } else if (selected.length > 0 && capabilities.delete) {
            projection.apply({ kind: 'delete', ids: selected });
            select([]);
          }
          break;
        case 'open': {
          const node = selected.length === 1 ? scene.nodes[selected[0]] : undefined;
          if (node && nodeDef(nodeRegistry, node)?.openable) {
            drillIn(node);
          }
          break;
        }
        case 'fit':
          animateTo(fitBounds(bounds, viewport, inset));
          event.preventDefault();
          break;
        case 'fitSelection': {
          const union = unionBounds(selectedNodes.map((id) => nodeBounds(scene.nodes[id])));
          if (union) {
            animateTo(fitBounds(union, viewport, inset));
          }
          break;
        }
        case 'zoomReset':
          animateTo(zoomAt(registry.get(atoms.camera), { x: viewport.width / 2, y: viewport.height / 2 }, 1));
          break;
        case 'back':
          goHistory(-1);
          break;
        case 'forward':
          goHistory(1);
          break;
        case 'nudge': {
          if (selectedNodes.length === 0 || !capabilities.move) {
            break;
          }
          // Shift moves by a major cell rather than a minor one.
          const step = event.shiftKey ? major : grid;
          const delta = {
            x: event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0,
            y: event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0,
          };
          projection.apply({ kind: 'move', ids: selectedNodes, delta });
          event.preventDefault();
          break;
        }
        case 'copy':
          copy();
          event.preventDefault();
          break;
        case 'cut':
          cut();
          event.preventDefault();
          break;
        case 'paste':
          paste();
          event.preventDefault();
          break;
        case 'undo':
          onUndo();
          event.preventDefault();
          break;
        case 'redo':
          onRedo();
          event.preventDefault();
          break;
        case 'selectAll':
          select([...Object.keys(scene.nodes), ...Object.keys(scene.links)]);
          event.preventDefault();
          break;
        case 'snap':
          toggleSnap();
          break;
        case 'debug':
          toggleDebug();
          break;
        case undefined:
          if (isToolKey(event)) {
            const next = toolForKey(nodeRegistry, linkRegistry, capabilities, event.key);
            if (next) {
              setTool(next);
            }
          }
          break;
      }
    },
    [
      registry,
      atoms.selection,
      atoms.drag,
      atoms.camera,
      atoms.point,
      removePoint,
      cancelDrag,
      select,
      drillOut,
      drillIn,
      capabilities,
      projection,
      scene,
      nodeRegistry,
      linkRegistry,
      animateTo,
      bounds,
      viewport,
      inset,
      goHistory,
      grid,
      major,
      setTool,
      toggleSnap,
      toggleDebug,
      onUndo,
      onRedo,
      copy,
      cut,
      paste,
    ],
  );
};
