//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useEffect, useMemo, useState } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { Scene, type StoredLayout, type StoredModel, fromEcho, reachedObjects } from '@dxos/scene';

import { type Canvas } from '#types';

const isStoredScene = (stage: unknown): stage is Scene.Scene2D | Scene.Scene3D =>
  Obj.instanceOf(Scene.Scene2D, stage) || Obj.instanceOf(Scene.Scene3D, stage);

const isStoredLayout = (value: unknown): value is StoredLayout =>
  Obj.instanceOf(Scene.Layout2D, value) || Obj.instanceOf(Scene.Layout3D, value);

const isStoredModel = (value: unknown): value is StoredModel =>
  Obj.instanceOf(Scene.Model2D, value) || Obj.instanceOf(Scene.Model3D, value);

type Reach = Obj.Unknown | Ref.Ref<Obj.Unknown> | undefined;

/**
 * How many of the objects `roots` reach (scenes, their layouts, the layouts' models, each composite's parts) have
 * loaded, read through atoms: a ref's `.target` never signals when it loads, so a view drawn before then stays empty.
 */
const countLoaded = (get: Atom.AtomContext, roots: readonly Reach[]): number => {
  const seen = new Set<Obj.Unknown>();
  const visit = (root: Reach) => {
    const object =
      root === undefined ? undefined : Ref.isRef(root) ? get(Obj.atomReactive(root)) : get(Obj.atomReactive(root));
    if (object === undefined || seen.has(object)) {
      return;
    }
    seen.add(object);
    if (isStoredScene(object)) {
      visit(object.layout);
    } else if (isStoredLayout(object)) {
      visit(object.model);
    } else if (isStoredModel(object)) {
      Object.values(object.objects).forEach((child) => visit(child.parts));
    }
  };
  roots.forEach(visit);
  return seen.size;
};

/** Re-renders as the canvas's scenes, layouts and models load; the count is only a dependency for what reads them. */
export const useCanvasLoaded = (canvas: Canvas.Canvas): number =>
  useAtomValue(
    useMemo(
      () =>
        Atom.make((get) => {
          const { scenes, layouts, model } = get(Obj.atomReactive(canvas));
          return countLoaded(get, [...scenes, ...layouts, model]);
        }),
      [canvas],
    ),
  );

/** A stage object as a scene document, or undefined when it is not a Scene2D or Scene3D. */
export const sceneDocumentOf = (stage: unknown): Scene.SceneDocument | undefined =>
  isStoredScene(stage) ? fromEcho(stage) : undefined;

/**
 * The stage object's scene document, read again whenever any object the scene draws from changes: the scene, its
 * layout, the layout's model, and every composite object's parts layout and model, since elements live in layouts.
 */
export const useSceneDocument = (stage: Obj.Unknown | undefined): Scene.SceneDocument | undefined => {
  const [version, setVersion] = useState(0);
  const loaded = useAtomValue(useMemo(() => Atom.make((get) => countLoaded(get, [stage])), [stage]));
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
  }, [stage, loaded]);
  return useMemo(() => sceneDocumentOf(stage), [stage, version, loaded]);
};
