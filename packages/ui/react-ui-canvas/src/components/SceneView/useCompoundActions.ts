//
// Copyright 2026 DXOS.org
//

import { type MutableRefObject, useCallback, useMemo } from 'react';

import { type useRegistry } from '../../hooks/index.ts';
import { type SceneViewAtoms } from '../../model/atoms.ts';
import { type Projection, reduceIntent } from '../../model/projection.ts';
import { type SceneStore, updateScene } from '../../model/store.ts';
import {
  type Camera,
  type Capabilities,
  type ElementId,
  type NodeId,
  type Scene,
  type SceneId,
  type Size,
  isFrameNode,
} from '../../model/types.ts';
import { NOMINAL_ZOOM, fitBounds } from '../../utils/camera.ts';
import { groupIntoScene, ungroupScene } from '../../utils/group.ts';
import { contentBounds } from '../../utils/hit.ts';
import { activeLayer } from '../../utils/layers.ts';
import { type CompoundEntry, frameCount } from '../../utils/scenes.ts';
import { nodeBounds } from '../../utils/shapes.ts';
import { recordScenes } from '../../utils/undo.ts';
import { type SceneNavigation } from './useSceneNavigation.ts';

/** What the Objects and Properties panels do to compound objects. */
export type CompoundActions = {
  /** The selection holds a node that may be grouped. */
  canGroup: boolean;
  /** The selection is one frame onto a scene of this drawing. */
  canUngroup: boolean;
  /** Moves the selection into a new compound object, which becomes the selection; its id, when made. */
  group: () => NodeId | undefined;
  /** Replaces the selected frame (or `id`) with its contents, which become the selection. */
  ungroup: (id?: NodeId) => void;
  /** Names the compound object (its child scene). */
  rename: (entry: CompoundEntry, name: string) => void;
  /** Shows or hides the compound object's frame. */
  toggleHidden: (entry: CompoundEntry) => void;
  /** Shows the scene the frame is in, selects the frame and fits it in view. */
  reveal: (entry: CompoundEntry) => void;
  /** Opens the compound object: the view moves into its child scene. */
  enter: (entry: CompoundEntry) => void;
};

export type UseCompoundActionsOptions = {
  registry: ReturnType<typeof useRegistry>;
  atoms: SceneViewAtoms;
  store: SceneStore;
  projection: Projection;
  capabilities: Capabilities;
  /** The current scene, as the projection emits it. */
  scene: Scene;
  path: SceneId[];
  selection: ReadonlySet<ElementId>;
  viewport: Size;
  inset: number;
  interactedRef: MutableRefObject<boolean>;
  createId: (prefix: string) => string;
  select: (ids: Iterable<ElementId>) => void;
  setCamera: (camera: Camera) => void;
  animateTo: (camera: Camera) => void;
  /** Leaves fit mode, so a jump to another scene is not refitted under the user. */
  exitFit: () => void;
} & Pick<SceneNavigation, 'drillIn' | 'pushHistory'>;

/**
 * Compound objects as one set of actions: grouping and ungrouping the current scene's selection (one undo step each,
 * the store's scenes with the model), and naming, hiding, revealing and entering a compound object anywhere in the
 * drawing. An edit in the current scene goes through the projection; one in another scene is written to the store.
 */
export const useCompoundActions = ({
  registry,
  atoms,
  store,
  projection,
  capabilities,
  scene,
  path,
  selection,
  viewport,
  inset,
  interactedRef,
  createId,
  select,
  setCamera,
  animateTo,
  exitFit,
  drillIn,
  pushHistory,
}: UseCompoundActionsOptions): CompoundActions => {
  const sceneId = path[path.length - 1];
  const editable = capabilities.create === true && capabilities.delete === true;

  /** The selected frame onto a scene of this drawing, when the selection is exactly one. */
  const selectedFrame = useCallback((): NodeId | undefined => {
    const [id] = selection.size === 1 ? [...selection] : [];
    const node = id !== undefined ? registry.get(projection.scene).nodes[id] : undefined;
    return node && isFrameNode(node) && registry.get(store.scenes)[node.scene] ? node.id : undefined;
  }, [selection, registry, projection, store.scenes]);

  const canGroup =
    editable && [...selection].some((id) => scene.nodes[id] !== undefined && scene.nodes[id].locked !== true);
  const canUngroup = editable && selectedFrame() !== undefined;

  const group = useCallback((): NodeId | undefined => {
    const id = createId('scene');
    const current = registry.get(projection.scene);
    const grouped = groupIntoScene(current, selection, id, activeLayer(current, registry.get(atoms.layer)));
    if (!grouped) {
      return undefined;
    }
    const before = registry.get(store.scenes);
    registry.set(store.scenes, { ...before, [id]: { ...grouped.child, name: 'Untitled' } });
    projection.apply({ kind: 'batch', intents: grouped.intents });
    // A projection may refuse the batch (`apply` reports nothing), so the shape's presence is the result: without
    // it the new scene would be an orphan, so it goes and the selection stays.
    if (!registry.get(projection.scene).nodes[id]) {
      const { [id]: _, ...scenes } = registry.get(store.scenes);
      registry.set(store.scenes, scenes);
      return undefined;
    }
    // One undo step takes the new scene away with the shape that opens it.
    recordScenes(registry, atoms.undo, sceneId, before);
    select([id]);
    return id;
  }, [createId, registry, projection, selection, atoms.layer, atoms.undo, store.scenes, sceneId, select]);

  const ungroup = useCallback(
    (id?: NodeId) => {
      const frameId = id ?? selectedFrame();
      const frame = frameId !== undefined ? registry.get(projection.scene).nodes[frameId] : undefined;
      const before = registry.get(store.scenes);
      const child = frame && isFrameNode(frame) ? before[frame.scene] : undefined;
      if (!frame || !isFrameNode(frame) || !child) {
        return;
      }
      const shared = frameCount(before, child.id) > 1;
      const intents = ungroupScene(registry.get(projection.scene), frame.id, child, { shared, createId });
      if (!intents) {
        return;
      }
      projection.apply({ kind: 'batch', intents });
      const current = registry.get(projection.scene);
      if (current.nodes[frame.id]) {
        return;
      }
      if (!shared) {
        const { [child.id]: _, ...scenes } = registry.get(store.scenes);
        registry.set(store.scenes, scenes);
      }
      // One undo step brings the child scene back with the frame.
      recordScenes(registry, atoms.undo, sceneId, before);
      select(intents.flatMap((intent) => (intent.kind === 'create' ? [intent.node.id] : [])));
    },
    [selectedFrame, registry, projection, store.scenes, createId, atoms.undo, sceneId, select],
  );

  const rename = useCallback(
    (entry: CompoundEntry, name: string) => {
      updateScene(registry, store, entry.child, (scene) => (scene.name === name ? scene : { ...scene, name }));
    },
    [registry, store],
  );

  const toggleHidden = useCallback(
    (entry: CompoundEntry) => {
      const intent = { kind: 'update', id: entry.frame.id, values: { hidden: !entry.hidden } } as const;
      if (entry.scene === sceneId) {
        projection.apply(intent);
      } else {
        updateScene(registry, store, entry.scene, (scene) => reduceIntent(scene, intent));
      }
    },
    [sceneId, projection, registry, store],
  );

  /** Moves the view to `scenePath` at `camera`, as one step of the history. */
  const jump = useCallback(
    (scenePath: SceneId[], camera: Camera) => {
      interactedRef.current = true;
      exitFit();
      registry.set(atoms.path, scenePath);
      select([]);
      setCamera(camera);
      pushHistory({ path: scenePath, camera });
    },
    [interactedRef, exitFit, registry, atoms.path, select, setCamera, pushHistory],
  );

  const reveal = useCallback(
    (entry: CompoundEntry) => {
      const camera = fitBounds(nodeBounds(entry.frame), viewport, inset, NOMINAL_ZOOM);
      if (entry.scene === sceneId) {
        interactedRef.current = true;
        exitFit();
        animateTo(camera);
      } else {
        jump(entry.scenePath, camera);
      }
      select([entry.frame.id]);
    },
    [viewport, inset, sceneId, interactedRef, exitFit, animateTo, jump, select],
  );

  const enter = useCallback(
    (entry: CompoundEntry) => {
      if (entry.scene === sceneId) {
        drillIn(entry.frame);
        return;
      }
      const child = registry.get(store.scenes)[entry.child];
      const bounds = child ? contentBounds(child, 0, 1) : undefined;
      if (child && bounds) {
        jump([...entry.scenePath, entry.child], fitBounds(bounds, viewport, inset, NOMINAL_ZOOM));
      } else if (child) {
        jump([...entry.scenePath, entry.child], { x: viewport.width / 2, y: viewport.height / 2, zoom: 1 });
      }
    },
    [sceneId, drillIn, registry, store.scenes, jump, viewport, inset],
  );

  return useMemo(
    () => ({ canGroup, canUngroup, group, ungroup, rename, toggleHidden, reveal, enter }),
    [canGroup, canUngroup, group, ungroup, rename, toggleHidden, reveal, enter],
  );
};
