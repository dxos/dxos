//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo } from 'react';

import { Entity, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { type History, type SceneChoice, createHistory, sessionHistory } from '@dxos/react-ui-canvas-editor';
import { type VersionedSource, combinedSource } from '@dxos/react-ui-canvas/headless';
import { type Layer, type LayoutIntent, type ModelIntent, Scene, reachedObjects } from '@dxos/scene';

import { applyLayoutIntent, canvasDocument, layoutSource, openScene, writeDocument, writeModelIntent } from '#model';
import { type Canvas } from '#types';

import { useSceneDocument } from '../SceneStage/index.ts';
import { useInspectorDock } from './use-inspector-dock.ts';
import { useRefitKey } from './use-refit-key.ts';
import { useSceneChoice } from './use-scene-choice.ts';
import { useSceneShots } from './use-scene-shots.ts';
import { canvasViewAspect } from './view-state.ts';

type StoredLayout = Scene.Layout2D | Scene.Layout3D;
type StoredScene = Scene.Scene2D | Scene.Scene3D;

const isLayoutOf =
  (dim: Scene.Dimension) =>
  (value: unknown): value is StoredLayout =>
    dim === '3d' ? Obj.instanceOf(Scene.Layout3D, value) : Obj.instanceOf(Scene.Layout2D, value);

const isSceneOf = (dim: Scene.Dimension, value: unknown): value is StoredScene =>
  dim === '3d' ? Obj.instanceOf(Scene.Scene3D, value) : Obj.instanceOf(Scene.Scene2D, value);

/** The key of the canvas's model when it is of `dim`, which a new layout of that dimension places from. */
const modelKeyOf = (canvas: Canvas.Canvas, dim: Scene.Dimension): string | undefined => {
  const model = canvas.model?.target;
  if (dim === '3d') {
    return Obj.instanceOf(Scene.Model3D, model) ? model.key : undefined;
  }
  return Obj.instanceOf(Scene.Model2D, model) ? model.key : undefined;
};

/** What the shared editor takes from a canvas, in either dimension, beside the dimension's own config and view. */
export type SceneEditorHost = {
  stored: StoredScene | undefined;
  document: Scene.SceneDocument | undefined;
  sceneChoice: SceneChoice | undefined;
  history: History;
  onIntent: (layout: string, intent: LayoutIntent) => void;
  onModelIntent: (intent: ModelIntent) => readonly string[];
  readDocument: () => Scene.SceneDocument;
  onLayersChange: (layout: string, layers: readonly Layer[]) => void;
  readonly: boolean;
  onReadonlyChange: (readonly: boolean) => void;
  refitKey: string | number | undefined;
  docked: boolean;
  onDockedChange: (docked: boolean) => void;
  shots: ReturnType<typeof useSceneShots>['shots'];
  onShotChange: ReturnType<typeof useSceneShots>['onShotChange'];
};

/**
 * The canvas's open scene of `dim` as the shared editor edits it: every edit is a `LayoutIntent` written to the layout
 * that owns the element (made, empty, when the 2D engine opens a View for a new one), recorded for undo over every
 * layout the scene reaches; model edits, layers, the lock, the dock and the shots are the same in both dimensions.
 */
export const useSceneEditor = (canvas: Canvas.Canvas, dim: Scene.Dimension): SceneEditorHost => {
  const [snapshot] = useObject(canvas);
  const { key: sceneKey, choice: sceneChoice } = useSceneChoice(canvas);
  const scene = openScene(canvas, sceneKey);
  const stored = isSceneOf(dim, scene) ? scene : undefined;
  const document = useSceneDocument(stored);
  const refitKey = useRefitKey(canvas);

  // Every layout of the dimension the scene reaches, by key, as the objects edits are written to.
  const layouts = useMemo(
    () => new Map((stored ? reachedObjects(stored) : []).filter(isLayoutOf(dim)).map((layout) => [layout.key, layout])),
    [stored, document, dim],
  );
  const source = useMemo<VersionedSource>(
    () =>
      combinedSource(Object.fromEntries([...layouts.entries()].map(([key, layout]) => [key, layoutSource(layout)]))),
    [layouts],
  );
  // The canvas's history for the session, so reopening the article keeps its steps.
  const history = useMemo(
    () =>
      createHistory({ steps: sessionHistory(canvas), source, writeDocument: (next) => writeDocument(canvas, next) }),
    [canvas, source],
  );
  const layoutFor = useCallback(
    (key: string): StoredLayout | undefined => {
      const listed = (): StoredLayout | undefined =>
        layouts.get(key) ??
        canvas.layouts.flatMap((ref) => (isLayoutOf(dim)(ref.target) && ref.target.key === key ? [ref.target] : []))[0];
      if (listed()) {
        return listed();
      }
      const before = canvasDocument(canvas);
      const model = modelKeyOf(canvas, dim);
      writeDocument(canvas, {
        ...before,
        layouts: [...before.layouts, { id: key, dim, ...(model ? { model } : {}), elements: {} }],
      });
      return listed();
    },
    [layouts, canvas, dim],
  );
  const onIntent = useCallback(
    (key: string, intent: LayoutIntent) => {
      const target = layoutFor(key);
      target && applyLayoutIntent(target, intent);
    },
    [layoutFor],
  );
  const onModelIntent = useCallback(
    (intent: ModelIntent) => writeModelIntent(canvas, intent).map(({ message }) => message),
    [canvas],
  );
  const readDocument = useCallback(() => canvasDocument(canvas), [canvas]);
  const onLayersChange = useCallback(
    (key: string, next: readonly Layer[]) => {
      const target = layouts.get(key);
      target &&
        Obj.update(target, (target) => {
          target.layers = Object.fromEntries(next.map((layer) => [layer.id, layer]));
        });
    },
    [layouts],
  );

  // One lock per canvas: this viewer's view state over the canvas's own setting.
  const contextId = Entity.getURI(canvas);
  const { readonly: viewReadonly } = useViewState(canvasViewAspect, contextId);
  const { update: updateViewState } = useViewStateActions(canvasViewAspect, contextId);
  const readonly = viewReadonly ?? snapshot.settings?.readonly ?? false;
  const onReadonlyChange = useCallback(
    (next: boolean) => updateViewState((state) => ({ ...state, readonly: next })),
    [updateViewState],
  );

  // Docked or floating as this viewer last left the canvas, in either dimension.
  const dock = useInspectorDock(canvas);
  const { shots, onShotChange } = useSceneShots(stored);

  return {
    stored,
    document,
    sceneChoice,
    history,
    onIntent,
    onModelIntent,
    readDocument,
    onLayersChange,
    readonly,
    onReadonlyChange,
    refitKey,
    docked: dock.docked,
    onDockedChange: dock.onDockedChange,
    shots,
    onShotChange,
  };
};
