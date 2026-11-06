//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useMemo } from 'react';

import { type Bounds, type Node, type Size, type ViewId, isViewNode } from '@dxos/scene';

import { type CanvasAtoms, type Drag, type NavigationCommands } from '../../engine/index.ts';
import { type Camera, type NodeRegistry, type RenderList2D, nodeDef } from '../../model/index.ts';
import { coverage, nodeBounds } from '../../utils/index.ts';
import { type useRegistry } from '../useRegistry.ts';
import { type SceneCamera } from './useSceneCamera.ts';

/** A portal covering this much of the viewport becomes the root; a root below this yields to its parent. */
const AUTO_ENTER = 0.85;
const AUTO_EXIT = 0.3;
const AUTO_DRILL_MS = 150;

export type UseSceneNavigationOptions = {
  registry: ReturnType<typeof useRegistry>;
  atoms: CanvasAtoms;
  navigation: NavigationCommands;
  nodeRegistry: NodeRegistry;
  scenes: Record<ViewId, RenderList2D>;
  scene: RenderList2D;
  path: ViewId[];
  camera: Camera;
  viewport: Size;
  drag: Drag | undefined;
} & Pick<SceneCamera, 'isAnimating'>;

export type SceneNavigation = {
  /** The current scene's frame, held for the visit rather than re-derived as its content changes. */
  bounds: Bounds;
};

/**
 * The current scene's frame and auto-drill: a portal filling the viewport becomes the root, and a root shrunk well
 * below its size on arrival yields to its parent — the controller's drill in and out, driven by how much of the
 * viewport a portal covers rather than by a gesture.
 */
export const useSceneNavigation = ({
  registry,
  atoms,
  navigation,
  nodeRegistry,
  scenes,
  scene,
  path,
  camera,
  viewport,
  drag,
  isAnimating,
}: UseSceneNavigationOptions): SceneNavigation => {
  // The scenes and the view's size are what the frame is derived from on entry, so a change to either reads it again.
  const bounds = useMemo(() => navigation.frame(path, scene), [navigation, path, scene, scenes, viewport]);

  const hostOpen = useCallback((node: Node) => nodeDef(nodeRegistry, node)?.hostOpen?.(node), [nodeRegistry]);

  // Arrival is the history entry for this path, so a child capped at 1:1 (or a frame that shrinks under a stationary
  // camera) is measured against itself rather than an absolute coverage.
  useEffect(() => {
    if (isAnimating() || drag || viewport.width === 0) {
      return;
    }
    const timer = setTimeout(() => {
      const portal = Object.values(scene.nodes).find(
        (node) => isViewNode(node) && !hostOpen(node) && coverage(camera, nodeBounds(node), viewport) >= AUTO_ENTER,
      );
      if (portal) {
        navigation.drillIn(portal, false);
      } else if (path.length > 1) {
        const history = registry.get(atoms.history);
        const arrival = history.entries[history.index];
        const arrived =
          arrival && arrival.path.length === path.length && arrival.path.every((id, index) => id === path[index]);
        const reference = arrived ? coverage(arrival.camera, bounds, viewport) : 1;
        if (coverage(camera, bounds, viewport) < AUTO_EXIT * reference) {
          navigation.drillOut(1, false);
        }
      }
    }, AUTO_DRILL_MS);
    return () => clearTimeout(timer);
  }, [camera, scene, bounds, path, viewport, drag, hostOpen, navigation, registry, atoms.history, isAnimating]);

  return { bounds };
};
