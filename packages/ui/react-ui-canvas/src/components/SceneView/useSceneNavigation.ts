//
// Copyright 2026 DXOS.org
//

import { type MutableRefObject, useCallback, useEffect, useMemo, useRef } from 'react';

import { type useRegistry } from '../../hooks/index.ts';
import { type Drag, type HistoryEntry, type SceneViewAtoms } from '../../model/atoms.ts';
import { type SceneStore } from '../../model/store.ts';
import {
  type Bounds,
  type Camera,
  type ElementId,
  type Node,
  type Scene,
  type SceneId,
  type Size,
  isPortalNode,
} from '../../model/types.ts';
import { coverage, enterPortal, exitPortal, fitBounds, portalFrame, portalScale } from '../../utils/camera.ts';
import { contentBounds, sceneBounds } from '../../utils/hit.ts';
import { nodeBounds } from '../../utils/shapes.ts';
import { type SceneCamera } from './useSceneCamera.ts';

/** A portal covering this much of the viewport becomes the root; a root below this yields to its parent. */
const AUTO_ENTER = 0.85;
const AUTO_EXIT = 0.3;
const AUTO_DRILL_MS = 150;

export type UseSceneNavigationOptions = {
  registry: ReturnType<typeof useRegistry>;
  atoms: SceneViewAtoms;
  store: SceneStore;
  scenes: Record<SceneId, Scene>;
  scene: Scene;
  path: SceneId[];
  camera: Camera;
  viewport: Size;
  /** Least gap between the scene's frame and a viewport edge when fitting, in scene units. */
  inset: number;
  drag: Drag | undefined;
  /** Set once the user takes the camera over, which stops the view re-fitting itself. */
  interactedRef: MutableRefObject<boolean>;
  select: (ids: Iterable<ElementId>) => void;
} & Pick<SceneCamera, 'animateTo' | 'setCamera' | 'setOpening' | 'isAnimating'>;

export type SceneNavigation = {
  nameOf: (id: SceneId) => string;
  /** The portal in `parent` that shows `childId`, if any. */
  portalTo: (parentId: SceneId | undefined, childId: SceneId) => Node | undefined;
  /** The frame of the scene at the head of `path`: its parent portal's frame, or its derived bounds. */
  frameOf: (path: SceneId[], scene: Scene) => Bounds;
  /** The current scene's frame, held for the visit rather than re-derived as its content changes. */
  bounds: Bounds;
  /** The zoom against this level's own 1:1 rather than the root's; display only. */
  nominalZoom: number;
  pushHistory: (entry: HistoryEntry) => void;
  drillIn: (portal: Node, animate?: boolean) => void;
  drillOut: (levels?: number, animate?: boolean) => void;
  goHistory: (offset: number) => void;
};

/**
 * Moving between scenes: the path, the frame each level is seen through, and the drill in and out that
 * swap the root under a camera transition. Auto-drill lives here too, since it is the same two moves
 * driven by how much of the viewport a portal covers rather than by a gesture.
 */
export const useSceneNavigation = ({
  registry,
  atoms,
  scenes,
  scene,
  path,
  camera,
  viewport,
  inset,
  drag,
  interactedRef,
  select,
  animateTo,
  setCamera,
  setOpening,
  isAnimating,
}: UseSceneNavigationOptions): SceneNavigation => {
  const nameOf = useCallback((id: SceneId) => scenes[id]?.name ?? id, [scenes]);

  const portalTo = useCallback(
    (parentId: SceneId | undefined, childId: SceneId): Node | undefined => {
      const parent = parentId ? scenes[parentId] : undefined;
      return parent
        ? Object.values(parent.nodes).find((node) => isPortalNode(node) && node.scene === childId)
        : undefined;
    },
    [scenes],
  );

  const frameOf = useCallback(
    (scenePath: SceneId[], current: Scene): Bounds => {
      const portal = portalTo(scenePath[scenePath.length - 2], current.id);
      return portal ? portalFrame(portal, contentBounds(current)) : sceneBounds(current);
    },
    [portalTo],
  );

  // A scene entered through a portal keeps the frame it arrived with. Deriving it from the content on
  // every edit moves the child under the user as they work, and maps a drill-out differently from the
  // drill-in that opened it; the root has no portal to sit in, so its bounds stay derived.
  const frameRef = useRef<{ key: string; frame: Bounds } | undefined>(undefined);
  const bounds = useMemo(() => {
    if (path.length < 2) {
      frameRef.current = undefined;
      return frameOf(path, scene);
    }
    const key = path.join(' ');
    if (frameRef.current?.key !== key) {
      frameRef.current = { key, frame: frameOf(path, scene) };
    }
    return frameRef.current.frame;
  }, [frameOf, path, scene]);

  /**
   * A portal frame is the portal's box times a power of the grid ratio, so entering one divides the
   * camera by that factor; reported raw, the number would drop fourfold on a drill-in that changed
   * nothing the user can see. Display only — nothing derives geometry from it, so the frame growing
   * with its content cannot feed back.
   */
  const nominalZoom = useMemo(() => {
    const scale = path.slice(1).reduce((accumulated, sceneId, index) => {
      const parent = scenes[path[index]];
      const child = scenes[sceneId];
      const portal = parent && child ? portalTo(parent.id, sceneId) : undefined;
      return portal && child
        ? accumulated * portalScale(portal, portalFrame(portal, contentBounds(child)))
        : accumulated;
    }, 1);
    return camera.zoom / scale;
  }, [path, scenes, portalTo, camera.zoom]);

  const pushHistory = useCallback(
    (entry: HistoryEntry) => {
      const history = registry.get(atoms.history);
      const entries = [...history.entries.slice(0, history.index + 1), entry];
      registry.set(atoms.history, { entries, index: entries.length - 1 });
    },
    [registry, atoms.history],
  );

  const drillIn = useCallback(
    (portal: Node, animate = true) => {
      const child = isPortalNode(portal) ? scenes[portal.scene] : undefined;
      if (!child) {
        return;
      }
      interactedRef.current = true;
      // The zoom is into the child, so the portal's selection outline and ports go before it starts.
      select([]);
      registry.set(atoms.hover, undefined);
      registry.set(atoms.editing, undefined);
      const childBounds = portalFrame(portal, contentBounds(child));
      const swap = (next: Camera) => {
        const entered = enterPortal(next, portal, childBounds);
        registry.set(atoms.path, [...registry.get(atoms.path), child.id]);
        setCamera(entered);
        setOpening(undefined);
        pushHistory({ path: registry.get(atoms.path), camera: entered });
      };
      if (animate) {
        // Land the child where fitting it would, margin and all, but never past 1:1, so its text lands at
        // its natural size rather than magnified to fill the view. Expressed in the child's own space and
        // mapped back out, so the zoom ends exactly where the swap puts the camera.
        const target = exitPortal(fitBounds(childBounds, viewport, inset, 1), portal, childBounds);
        animateTo(target, () => swap(target));
        setOpening(portal.id);
      } else {
        swap(registry.get(atoms.camera));
      }
    },
    [
      scenes,
      registry,
      atoms.path,
      atoms.camera,
      atoms.hover,
      atoms.editing,
      viewport,
      inset,
      interactedRef,
      animateTo,
      setCamera,
      setOpening,
      select,
      pushHistory,
    ],
  );

  const drillOut = useCallback(
    (levels = 1, animate = true) => {
      const current = registry.get(atoms.path);
      if (current.length < 2 || levels < 1) {
        return;
      }
      let next = current;
      let exited = registry.get(atoms.camera);
      for (let level = 0; level < levels && next.length > 1; level++) {
        const child = scenes[next[next.length - 1]];
        const parent = scenes[next[next.length - 2]];
        const portal = parent
          ? Object.values(parent.nodes).find((node) => isPortalNode(node) && node.scene === child?.id)
          : undefined;
        if (!child || !portal) {
          break;
        }
        // The level being left exits through the frame it was entered with, so the camera lands where
        // the drill-in took it from however the child was edited in between.
        exited = exitPortal(exited, portal, level === 0 ? bounds : portalFrame(portal, contentBounds(child)));
        next = next.slice(0, -1);
      }
      registry.set(atoms.path, next);
      select([]);
      setCamera(exited);
      const parent = scenes[next[next.length - 1]];
      if (animate && parent) {
        animateTo(fitBounds(frameOf(next, parent), viewport, inset));
      }
      pushHistory({ path: next, camera: exited });
    },
    [
      registry,
      atoms.path,
      atoms.camera,
      scenes,
      viewport,
      inset,
      animateTo,
      setCamera,
      select,
      pushHistory,
      frameOf,
      bounds,
    ],
  );

  const goHistory = useCallback(
    (offset: number) => {
      const history = registry.get(atoms.history);
      const index = history.index + offset;
      const entry = history.entries[index];
      if (!entry) {
        return;
      }
      registry.set(atoms.history, { ...history, index });
      registry.set(atoms.path, entry.path);
      select([]);
      animateTo(entry.camera);
    },
    [registry, atoms.history, atoms.path, select, animateTo],
  );

  // Auto drill: a portal filling the viewport becomes the root; a root shrunk well below its size on
  // arrival yields to its parent. Arrival is the history entry for this path, so a child capped at 1:1
  // (or a frame that shrinks under a stationary camera) is measured against itself rather than an
  // absolute coverage.
  useEffect(() => {
    if (isAnimating() || drag || viewport.width === 0) {
      return;
    }
    const timer = setTimeout(() => {
      const portal = Object.values(scene.nodes).find(
        (node) => isPortalNode(node) && coverage(camera, nodeBounds(node), viewport) >= AUTO_ENTER,
      );
      if (portal) {
        drillIn(portal, false);
      } else if (path.length > 1) {
        const history = registry.get(atoms.history);
        const arrival = history.entries[history.index];
        const arrived =
          arrival && arrival.path.length === path.length && arrival.path.every((id, index) => id === path[index]);
        const reference = arrived ? coverage(arrival.camera, bounds, viewport) : 1;
        if (coverage(camera, bounds, viewport) < AUTO_EXIT * reference) {
          drillOut(1, false);
        }
      }
    }, AUTO_DRILL_MS);
    return () => clearTimeout(timer);
  }, [camera, scene, bounds, path, viewport, drag, drillIn, drillOut, registry, atoms.history, isAnimating]);

  return { nameOf, portalTo, frameOf, bounds, nominalZoom, pushHistory, drillIn, drillOut, goHistory };
};
