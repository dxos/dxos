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

/** The stage object's scene document, read again whenever the stored root scene changes. */
export const useSceneDocument = (stage: Obj.Unknown | undefined): Scene.SceneDocument | undefined => {
  const [snapshot] = useObject(isStoredScene(stage) ? stage : undefined);
  return useMemo(() => sceneDocumentOf(stage), [stage, snapshot]);
};
