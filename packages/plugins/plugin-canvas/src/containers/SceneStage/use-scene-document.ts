//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Scene, fromEcho } from '@dxos/scene';

const isStoredScene = (stage: unknown): stage is Scene.Scene2D | Scene.Scene3D =>
  Obj.instanceOf(Scene.Scene2D, stage) || Obj.instanceOf(Scene.Scene3D, stage);

/** A stage object as a scene document, or undefined when it is not a Scene2D or Scene3D. */
export const sceneDocumentOf = (stage: unknown): Scene.SceneDocument | undefined =>
  isStoredScene(stage) ? fromEcho(stage) : undefined;

/**
 * The stage object's scene document, read again whenever the stored scene, its layout or the layout's model changes;
 * the elements live in the layout, so following the scene alone would miss every element edit.
 */
export const useSceneDocument = (stage: Obj.Unknown | undefined): Scene.SceneDocument | undefined => {
  const scene = isStoredScene(stage) ? stage : undefined;
  const [sceneSnapshot] = useObject(scene);
  const layout = scene?.layout.target;
  const [layoutSnapshot] = useObject(layout);
  const model = layout?.model?.target;
  const [modelSnapshot] = useObject(model);
  return useMemo(() => sceneDocumentOf(stage), [stage, sceneSnapshot, layoutSnapshot, modelSnapshot]);
};
