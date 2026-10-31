//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Entity, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { type Camera, type CanvasServices, currentLookId } from '@dxos/react-ui-canvas';
import { type EditorDisplay, createConfig2D } from '@dxos/react-ui-canvas-editor';
import { type Node, isViewNode } from '@dxos/scene';

import { generatorCompiler, isCanvasDrawing, objectRef, parseLinkedViewId } from '#model';
import { CanvasCapabilities, Canvas as CanvasFormat } from '#types';

import {
  createGeneratorWorker,
  useCanvasGenerators,
  useCanvasKinds,
  useCanvasNodes,
} from '../CanvasArticle/use-canvas-scene.ts';
import { type SceneDimension } from './dimension.ts';
import { useCanvasProperties } from './use-canvas-properties.ts';
import { canvasViewAspect } from './view-state.ts';

/** The camera a 2D viewer's camera bar resets to: the scene's origin at 1:1. */
const AUTHORED_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

/** The theme a canvas draws when neither it nor the app names one. */
const FALLBACK_THEME = 'flat';

/**
 * A 2D canvas's dimension: react-ui-canvas's engine as the viewport, each layout in the mode its own fields name
 * (`constrain2D`), with the canvas's node types and generators; the look and grid are the drawing's, snapping, guides, axes and the camera this
 * viewer's own.
 */
export const useDimension2D = (canvas: CanvasFormat.Canvas): SceneDimension<Camera> => {
  const [snapshot] = useObject(canvas);
  const settings = snapshot.settings;
  const handleSettingsChange = useCallback(
    (values: Partial<CanvasFormat.CanvasSettings>) =>
      Obj.update(canvas, (canvas) => {
        // ECHO stores no `undefined`, so an unset value removes its key.
        canvas.settings = Object.fromEntries(
          Object.entries({ ...canvas.settings, ...values }).filter(([, value]) => value !== undefined),
        );
      }),
    [canvas],
  );

  // A frame showing an object (not a canvas drawing) opens it in the app.
  const { invokePromise } = Hooks.useOperationInvoker();
  const db = Obj.getDatabase(canvas);
  const openObject = useCallback(
    (node: Node) => {
      const object = objectRef(node, db)?.target;
      if (!object || !isViewNode(node) || parseLinkedViewId(node.scene) || isCanvasDrawing(object) !== false) {
        return undefined;
      }
      return () => {
        void invokePromise(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(object)] });
      };
    },
    [invokePromise, db],
  );
  const nodes = useCanvasNodes(openObject);
  const kinds = useCanvasKinds();
  const generators = useCanvasGenerators(db);
  const appSettings = useAtomValue(Hooks.useCapability(CanvasCapabilities.Settings));
  // The Properties form's host additions, over the views the 2D viewport's canvas holds.
  const useProperties = useCallback(
    (services: CanvasServices | undefined) =>
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useCanvasProperties(canvas, () => (services ? services.registry.get(services.store.views) : {})),
    [canvas],
  );
  const config = useMemo(
    () =>
      createConfig2D({
        useProperties,
        nodes,
        kinds,
        generators,
        compileGenerator: generatorCompiler,
        createGeneratorWorker,
        liveDepth: appSettings.liveDepth,
      }),
    [useProperties, nodes, kinds, generators, appSettings.liveDepth],
  );

  const contextId = Entity.getURI(canvas);
  const { camera, grid: snap, guides, axes } = useViewState(canvasViewAspect, contextId);
  const { update: updateViewState } = useViewStateActions(canvasViewAspect, contextId);
  const onCameraChange = useCallback(
    (next: Camera) => updateViewState((state) => ({ ...state, camera: next })),
    [updateViewState],
  );
  // A drawing may name a theme by an id since renamed; the picker marks it by its current one.
  const theme = currentLookId('themes', settings?.theme);
  const display = useMemo<EditorDisplay>(
    () => ({
      theme: theme ?? appSettings.theme ?? FALLBACK_THEME,
      themeOverride: theme,
      grid: (settings?.backgroundGrid ?? 'none') !== 'none',
      snap: snap ?? true,
      guides: guides ?? true,
      axes: axes ?? false,
    }),
    [theme, settings?.backgroundGrid, appSettings.theme, snap, guides, axes],
  );
  const onDisplayChange = useCallback(
    (next: Partial<EditorDisplay>) => {
      'themeOverride' in next && handleSettingsChange({ theme: next.themeOverride });
      next.grid !== undefined && handleSettingsChange({ backgroundGrid: next.grid ? 'lines' : 'none' });
      (next.snap !== undefined || next.guides !== undefined || next.axes !== undefined) &&
        updateViewState((state) => ({
          ...state,
          ...(next.snap !== undefined ? { grid: next.snap } : {}),
          ...(next.guides !== undefined ? { guides: next.guides } : {}),
          ...(next.axes !== undefined ? { axes: next.axes } : {}),
        }));
    },
    [handleSettingsChange, updateViewState],
  );

  return { config, display, onDisplayChange, camera, authoredCamera: AUTHORED_CAMERA, onCameraChange };
};
