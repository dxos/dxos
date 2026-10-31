//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { Entity, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { type SceneChoice } from '@dxos/react-ui-canvas-editor';
import { Scene } from '@dxos/scene';

import { addScene, deleteScene, openScene } from '#model';
import { type Canvas } from '#types';

import { canvasViewAspect } from './view-state.ts';

/**
 * The scene this viewer has open and the choice the Views inspector offers over the canvas's scenes, the same in both
 * dimensions: pick one, add one over the open scene's layout at its camera, or delete one while another remains.
 */
export const useSceneChoice = (canvas: Canvas.Canvas): { key: string | undefined; choice: SceneChoice | undefined } => {
  const contextId = Entity.getURI(canvas);
  const { scene: key } = useViewState(canvasViewAspect, contextId);
  const { update } = useViewStateActions(canvasViewAspect, contextId);
  const [snapshot] = useObject(canvas);
  const choice = useMemo<SceneChoice | undefined>(() => {
    const open = openScene(canvas, key);
    if (!open) {
      return undefined;
    }
    const setOpen = (scene: string | undefined) => update((state) => ({ ...state, scene }));
    return {
      scenes: canvas.scenes.flatMap((ref) => {
        const scene = ref.target;
        return Obj.instanceOf(Scene.Scene2D, scene) || Obj.instanceOf(Scene.Scene3D, scene)
          ? [{ id: scene.key, name: scene.name ?? scene.key }]
          : [];
      }),
      open: open.key,
      onOpen: setOpen,
      onAdd: () => {
        const added = Obj.instanceOf(Scene.Scene3D, open)
          ? addScene(canvas, open, open.camera)
          : Obj.instanceOf(Scene.Scene2D, open)
            ? addScene(canvas, open, open.camera)
            : undefined;
        added && setOpen(added.key);
      },
      onDelete: (id) => {
        const scene = openScene(canvas, id);
        if (scene && scene.key === id && canvas.scenes.length > 1) {
          deleteScene(canvas, scene);
          setOpen(undefined);
        }
      },
    };
  }, [canvas, snapshot, key, update]);
  return { key, choice };
};
