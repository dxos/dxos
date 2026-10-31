//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { Obj } from '@dxos/echo';
import { Scene, fromEcho, reachedObjects } from '@dxos/scene';

const isStoredScene = (stage: unknown): stage is Scene.Scene2D | Scene.Scene3D =>
  Obj.instanceOf(Scene.Scene2D, stage) || Obj.instanceOf(Scene.Scene3D, stage);

/** A stage object as a scene document, or undefined when it is not a Scene2D or Scene3D. */
export const sceneDocumentOf = (stage: unknown): Scene.SceneDocument | undefined =>
  isStoredScene(stage) ? fromEcho(stage) : undefined;

/**
 * The stage object's scene document, read again whenever any object the scene draws from changes: the scene, its
 * layout, the layout's model, and every composite object's parts layout and model, since elements live in layouts.
 */
export const useSceneDocument = (stage: Obj.Unknown | undefined): Scene.SceneDocument | undefined => {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!isStoredScene(stage)) {
      return;
    }
    const subscriptions = new Map<Obj.Any, () => void>();
    // An edit can reach new objects (a new composite's parts), so the set is read again on every change.
    const track = () => {
      const reached = new Set(reachedObjects(stage));
      for (const object of reached) {
        if (!subscriptions.has(object)) {
          subscriptions.set(
            object,
            Obj.subscribe(object, () => {
              track();
              setVersion((version) => version + 1);
            }),
          );
        }
      }
      for (const [object, unsubscribe] of subscriptions) {
        if (!reached.has(object)) {
          unsubscribe();
          subscriptions.delete(object);
        }
      }
    };
    track();
    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, [stage]);
  return useMemo(() => sceneDocumentOf(stage), [stage, version]);
};
