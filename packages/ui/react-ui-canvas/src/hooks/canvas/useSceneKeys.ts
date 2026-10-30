//
// Copyright 2026 DXOS.org
//

import { type KeyboardEvent, useCallback } from 'react';

import { type ElementId } from '@dxos/scene';

import {
  type CanvasAtoms,
  type CanvasHistory,
  type EditingCommands,
  type NavigationCommands,
  type Projection,
  type SelectionCommands,
  type ToolsCommands,
} from '../../engine/index.ts';
import {
  type Capabilities,
  type LinkRegistry,
  type NodeRegistry,
  type View,
  isToolKey,
  keyAction,
  nodeDef,
} from '../../model/index.ts';
import { toolForKey } from '../../utils/index.ts';
import { type useRegistry } from '../useRegistry.ts';
import { type EditMode } from './useEditMode.ts';
import { type PointerMachine } from './usePointerMachine.ts';
import { type SceneSnap } from './useSceneSnap.ts';

export type UseSceneKeysOptions = {
  registry: ReturnType<typeof useRegistry>;
  atoms: CanvasAtoms;
  scene: View;
  nodeRegistry: NodeRegistry;
  linkRegistry: LinkRegistry;
  projection: Projection;
  capabilities: Capabilities;
  navigation: NavigationCommands;
  /** Minor grid spacing in scene px; an arrow nudges by it. */
  grid: number;
  select: (ids: Iterable<ElementId>) => void;
  toggleSnap: () => void;
  toggleGuides: () => void;
  toggleDebug: () => void;
  onUndo: () => void;
  onRedo: () => void;
  /** Copies the selection one step aside, as one undo step, and selects the copy. */
  duplicate: () => void;
  /** Runs an edit as an undo step; a run of nudges of one selection is one step. */
  commit: CanvasHistory['commit'];
} & Pick<SceneSnap, 'major'> &
  Pick<EditingCommands, 'copy' | 'cut' | 'paste'> &
  Pick<SelectionCommands, 'delete' | 'group' | 'ungroup'> &
  Pick<PointerMachine, 'cancelDrag' | 'removePoint' | 'finishVertices' | 'removeVertex' | 'deleteVertex'> &
  Pick<ToolsCommands, 'setTool'> &
  EditMode;

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
  navigation,
  grid,
  select,
  toggleSnap,
  toggleGuides,
  toggleDebug,
  onUndo,
  onRedo,
  duplicate,
  commit,
  major,
  copy,
  cut,
  paste,
  delete: deleteSelection,
  group,
  ungroup,
  cancelDrag,
  removePoint,
  finishVertices,
  removeVertex,
  deleteVertex,
  setTool,
  editNode,
  exitEdit,
}: UseSceneKeysOptions): ((event: KeyboardEvent) => void) => {
  return useCallback(
    (event: KeyboardEvent) => {
      const selected = [...registry.get(atoms.selection)];
      const selectedNodes = selected.filter((id) => scene.nodes[id] !== undefined);
      const point = registry.get(atoms.point);
      const action = keyAction(event);
      // A line drawn vertex by vertex: Enter ends it open, Delete takes back its last vertex, Escape drops it.
      if (registry.get(atoms.drag)?.kind === 'vertices') {
        if (action === 'open') {
          finishVertices(false);
          event.preventDefault();
          return;
        }
        if (action === 'delete') {
          removeVertex();
          event.preventDefault();
          return;
        }
      }
      // A node in vertex edit mode: Enter or Escape leaves it, each drag having landed already, and Delete removes the
      // vertex last pressed rather than the node.
      const editing = registry.get(atoms.editing);
      // An undo, Select All, a lock or the inspector can take the node away or select others; then the mode is stale.
      const editable =
        editing?.kind === 'vertices' &&
        scene.nodes[editing.id] !== undefined &&
        !scene.nodes[editing.id]?.locked &&
        selected.length === 1 &&
        selected[0] === editing.id;
      if (editing?.kind === 'vertices' && !editable) {
        exitEdit();
      }
      if (editing?.kind === 'vertices' && editable && !registry.get(atoms.drag)) {
        if (action === 'open' || action === 'cancel') {
          exitEdit();
          event.preventDefault();
          return;
        }
        if (action === 'delete') {
          if (editing.vertex !== undefined) {
            deleteVertex(editing.id, editing.vertex);
          }
          event.preventDefault();
          return;
        }
      }
      switch (action) {
        case 'cancel':
          if (registry.get(atoms.drag)) {
            cancelDrag();
          } else if (point) {
            registry.set(atoms.point, undefined);
          } else if (selected.length > 0) {
            select([]);
          } else {
            navigation.back();
          }
          break;
        case 'delete':
          if (point) {
            removePoint(point);
          } else {
            deleteSelection();
          }
          break;
        case 'open': {
          const node = selected.length === 1 ? scene.nodes[selected[0]] : undefined;
          if (node && nodeDef(nodeRegistry, node)?.openable) {
            navigation.drillIn(node);
          } else if (node && editNode(node)) {
            // The Enter that entered edit mode must not reach the editor it opens.
            event.preventDefault();
          }
          break;
        }
        case 'fit':
          navigation.fit();
          event.preventDefault();
          break;
        case 'fitSelection':
          navigation.fitSelection();
          break;
        case 'zoomReset':
          navigation.resetZoom();
          break;
        case 'back':
          navigation.goHistory(-1);
          break;
        case 'forward':
          navigation.goHistory(1);
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
          commit(() => projection.apply({ kind: 'move', ids: selectedNodes, delta }), {
            mergeKey: `nudge:${[...selectedNodes].sort().join(',')}`,
          });
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
        case 'duplicate':
          duplicate();
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
        // ⌘G is the browser's find-next, which a canvas with the focus takes for itself.
        case 'group':
          group();
          event.preventDefault();
          break;
        case 'ungroup':
          ungroup();
          event.preventDefault();
          break;
        case 'selectAll':
          select([...Object.keys(scene.nodes), ...Object.keys(scene.links)]);
          event.preventDefault();
          break;
        case 'snap':
          toggleSnap();
          break;
        case 'guides':
          toggleGuides();
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
      atoms.point,
      atoms.editing,
      removePoint,
      cancelDrag,
      finishVertices,
      removeVertex,
      deleteVertex,
      editNode,
      exitEdit,
      select,
      navigation,
      capabilities,
      projection,
      scene,
      nodeRegistry,
      linkRegistry,
      grid,
      major,
      setTool,
      toggleSnap,
      toggleGuides,
      toggleDebug,
      onUndo,
      onRedo,
      duplicate,
      commit,
      copy,
      cut,
      paste,
      deleteSelection,
      group,
      ungroup,
    ],
  );
};
