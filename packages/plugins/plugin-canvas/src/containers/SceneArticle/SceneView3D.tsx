//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as AppNode from '@dxos/app-toolkit/AppNode';
import { Entity, Obj } from '@dxos/echo';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { type VersionedSource, combinedSource } from '@dxos/react-ui-canvas/headless';
import {
  type EditorDisplay,
  SceneEditor,
  createHistory,
  sessionHistory,
  useEditorCommands,
} from '@dxos/react-ui-canvas/scene';
import { CATALOGS_3D, config3d, isTheme3D } from '@dxos/react-ui-scene';
import * as Panel from '@dxos/react-ui/Panel';
import { type Layer, type LayoutIntent, type ModelIntent, Scene, reachedObjects } from '@dxos/scene';

import {
  applyLayoutIntent,
  canvasDocument,
  layoutSource,
  openScene,
  sceneClipboardCodec,
  writeDocument,
  writeModelIntent,
} from '#model';
import { type Canvas } from '#types';

import { useSceneDocument } from '../SceneStage/index.ts';
import { useInspectorDock } from './use-inspector-dock.ts';
import { useSceneChoice } from './use-scene-choice.ts';
import { useScene3DView } from './use-scene3d-view.ts';
import { canvasViewAspect } from './view-state.ts';

export type SceneView3DProps = {
  canvas: Canvas.Canvas;
  role?: string;
  attendableId?: string;
};

const isLayout3D = (value: unknown): value is Scene.Layout3D => Obj.instanceOf(Scene.Layout3D, value);

/** The app's edit commands (undo, redo, cut, copy, paste) on the article, from the editor's command table. */
const SceneEditCommands = ({ element }: { element: HTMLElement | null }) => {
  const commands = useEditorCommands('SceneEditCommands');
  useEffect(() => {
    if (!element) {
      return;
    }
    const editCommand = (id: 'undo' | 'redo' | 'cut' | 'copy' | 'paste') => ({
      run: () => commands.get(id)?.run(),
      enabled: () => commands.get(id)?.enabled ?? false,
    });
    return AppNode.registerEditCommands(element, {
      undo: editCommand('undo'),
      redo: editCommand('redo'),
      cut: editCommand('cut'),
      copy: editCommand('copy'),
      paste: editCommand('paste'),
    });
  }, [element, commands]);
  return null;
};

/**
 * A 3D canvas: its open `Scene3D` in the shared scene editor with the 3D config. Every edit is a `LayoutIntent`
 * written to the layout that owns the element, recorded for undo over every 3D layout the scene reaches. Outside an
 * article it is a picture.
 */
export const SceneView3D = ({ canvas, role }: SceneView3DProps) => {
  const { key: sceneKey, choice: sceneChoice } = useSceneChoice(canvas);
  const scene = openScene(canvas, sceneKey);
  const stored = Obj.instanceOf(Scene.Scene3D, scene) ? scene : undefined;
  const document = useSceneDocument(stored);

  // Every 3D layout the scene reaches, by key, as the objects edits are written to.
  const layouts = useMemo(
    () => new Map((stored ? reachedObjects(stored) : []).filter(isLayout3D).map((layout) => [layout.key, layout])),
    [stored, document],
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
  const handleIntent = useCallback(
    (layout: string, intent: LayoutIntent) => {
      const target = layouts.get(layout);
      target && applyLayoutIntent(target, intent);
    },
    [layouts],
  );
  const handleModelIntent = useCallback(
    (intent: ModelIntent) => writeModelIntent(canvas, intent).map(({ message }) => message),
    [canvas],
  );
  const readDocument = useCallback(() => canvasDocument(canvas), [canvas]);
  const handleLayersChange = useCallback(
    (layout: string, next: readonly Layer[]) => {
      const target = layouts.get(layout);
      target &&
        Obj.update(target, (target) => {
          target.layers = Object.fromEntries(next.map((layer) => [layer.id, layer]));
        });
    },
    [layouts],
  );

  // The orbit, grid, snapping and look are this viewer's own view; the scene's camera and theme are the authored ones.
  const view = useScene3DView(canvas);
  // Docked or floating as this viewer last left the canvas, in either dimension.
  const dock = useInspectorDock(canvas);
  // One lock per canvas, the 2D canvas's: this viewer's view state over the canvas's own setting.
  const contextId = Entity.getURI(canvas);
  const { readonly: viewReadonly } = useViewState(canvasViewAspect, contextId);
  const { update: updateCanvasView } = useViewStateActions(canvasViewAspect, contextId);
  const readonly = viewReadonly ?? canvas.settings.readonly ?? false;
  const handleReadonlyChange = useCallback(
    (next: boolean) => updateCanvasView((state) => ({ ...state, readonly: next })),
    [updateCanvasView],
  );
  const authoredTheme = document?.scenes[0]?.theme;
  const display = useMemo<EditorDisplay>(
    () => ({
      theme: view.theme ?? (isTheme3D(authoredTheme) ? authoredTheme : 'cad'),
      themeOverride: view.theme,
      grid: view.grid,
      snap: view.snap,
    }),
    [view.theme, view.grid, view.snap, authoredTheme],
  );
  const handleDisplayChange = useCallback(
    (next: Partial<EditorDisplay>) => {
      'themeOverride' in next && view.onThemeChange(isTheme3D(next.themeOverride) ? next.themeOverride : undefined);
      next.grid !== undefined && view.onGridChange(next.grid);
      next.snap !== undefined && view.onSnapChange(next.snap);
    },
    [view],
  );

  const [element, setElement] = useState<HTMLElement | null>(null);
  if (!stored || !document) {
    return null;
  }

  return (
    <Panel.Root role={role} ref={setElement}>
      <Panel.Body>
        <SceneEditor.Root
          config={config3d}
          document={document}
          scene={stored.key}
          role={role}
          readonly={readonly}
          onReadonlyChange={handleReadonlyChange}
          onIntent={handleIntent}
          history={history}
          onModelIntent={handleModelIntent}
          readDocument={readDocument}
          onLayersChange={handleLayersChange}
          codec={sceneClipboardCodec}
          display={display}
          onDisplayChange={handleDisplayChange}
          camera={view.camera}
          authoredCamera={stored.camera}
          onCameraChange={view.onCameraChange}
          docked={dock.docked}
          onDockedChange={dock.onDockedChange}
          sceneChoice={sceneChoice}
        >
          <SceneEditCommands element={element} />
          <SceneEditor.Viewport>
            <SceneEditor.Tools />
            <SceneEditor.Actions />
            <SceneEditor.Camera />
            <SceneEditor.Display />
            <SceneEditor.ContextMenu />
            <SceneEditor.Notice />
          </SceneEditor.Viewport>
          <SceneEditor.Inspector catalogs={CATALOGS_3D} />
        </SceneEditor.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

SceneView3D.displayName = 'SceneView3D';
