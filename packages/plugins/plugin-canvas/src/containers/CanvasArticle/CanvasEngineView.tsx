//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import type * as Registry from 'effect/reactivity/AtomRegistry';
import React, { useCallback, useMemo, useState } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Entity, Obj } from '@dxos/echo';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import {
  type BackgroundGrid,
  type Camera,
  Canvas,
  type FreehandProjectionOptions,
  MAX_ZOOM,
  type Projection,
  type SceneChoice,
  type SceneDisplay,
  type ViewStore,
  createLocalHistory,
  sessionStacks,
} from '@dxos/react-ui-canvas/scene';
import * as Banner from '@dxos/react-ui/Banner';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import { type Node, type ViewId, isViewNode } from '@dxos/scene';

import { generatorCompiler, isCanvasDrawing, objectRef, parseLinkedViewId, resolveDrawingLook } from '#model';
// Aliased: `Canvas` here is the scene engine's component namespace.
import { CanvasCapabilities, type Canvas as CanvasFormat } from '#types';

import { CanvasNamespace } from '../../namespace.ts';
import { type SceneSurfaceProps } from '../SceneArticle/SceneArticle.tsx';
import { useCanvasProperties } from '../SceneArticle/use-canvas-properties.ts';
import { useInspectorDock } from '../SceneArticle/use-inspector-dock.ts';
import { useRefitKey } from '../SceneArticle/use-refit-key.ts';
import { canvasViewAspect } from '../SceneArticle/view-state.ts';
import { CanvasClipboardText } from './CanvasClipboardText.tsx';
import { CanvasEditCommands } from './CanvasEditCommands.tsx';
import { CanvasDatabaseContext } from './CanvasViewNodeView.tsx';
import { display2D, sceneChrome } from './scene-chrome.ts';
import { createTrackerHistory } from './tracker-history.ts';
import { createGeneratorWorker, useCanvasGenerators, useCanvasNodes } from './use-canvas-scene.ts';

/** Why a canvas a newer plugin saved opens read-only, and what unlocks it. */
const NewerFormatBanner = () => {
  const { t } = UiHooks.useTranslation(CanvasNamespace.key);
  return (
    <Banner.Root valence='warning' data-testid='canvas.newer-format'>
      <Banner.Title>{t('newer-format.title')}</Banner.Title>
      <Banner.Body>{t('newer-format.message')}</Banner.Body>
    </Banner.Root>
  );
};

export type CanvasEngineViewProps = SceneSurfaceProps & {
  canvas: Obj.Unknown;
  registry: Registry.AtomRegistry;
  bound: { store: ViewStore; root: ViewId } | undefined;
  settings: Partial<CanvasFormat.CanvasSettings> | undefined;
  onSettingsChange: (values: Partial<CanvasFormat.CanvasSettings>) => void;
  createProjection: CreateProjection | undefined;
  /** A legacy canvas a newer plugin saved: read-only here. */
  newer: boolean;
  /** The canvas's scenes, for the Views inspector; a legacy canvas has none. */
  sceneChoice?: SceneChoice;
};

/** How the engine makes a canvas's projection over its store. */
export type CreateProjection = (options: FreehandProjectionOptions) => Projection;

/** The 2D scene engine over a canvas's store, with its settings: what both a `Canvas` and a legacy canvas show. */
export const CanvasEngineView = ({
  role,
  canvas,
  registry,
  bound,
  settings: record,
  onSettingsChange,
  createProjection,
  newer,
  sceneChoice,
}: CanvasEngineViewProps) => {
  const settings = useAtomValue(Hooks.useCapability(CanvasCapabilities.Settings));
  // A frame showing an object (not a canvas drawing) opens it in the app; the frame's view shows the frame's own
  // scene until the object loads, so opening drills into that scene until then too.
  const invoker = Hooks.useOperationInvoker();
  const { invokePromise } = invoker;
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
  // In Composer the canvas's edits join the app's history, scoped to this canvas; without a tracker it keeps its own.
  const tracker = Hooks.useOptionalCapability(Capabilities.HistoryTracker);
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const history = useMemo(
    () =>
      tracker
        ? createTrackerHistory({ tracker, invoker, canvas })
        : // Without the app's history, the canvas keeps its own for the session, so reopening keeps the steps.
          createLocalHistory({ stacks: sessionStacks(canvas) }),
    [tracker, invoker, canvas],
  );
  const nodes = useCanvasNodes(openObject);
  const refitKey = useRefitKey(canvas);
  const generators = useCanvasGenerators(db);

  // The drawing's look is shared with collaborators, so it wins over the viewer's own default.
  const look = resolveDrawingLook(record, settings);
  const handleThemeChange = useCallback((theme: string | undefined) => onSettingsChange({ theme }), [onSettingsChange]);
  const handleBackgroundGridChange = useCallback(
    (backgroundGrid: BackgroundGrid | undefined) => onSettingsChange({ backgroundGrid }),
    [onSettingsChange],
  );

  // Restores where the root scene was last left; read once per binding, since later values are our own writes.
  const contextId = Entity.getURI(canvas);
  const {
    camera: savedCamera,
    readonly: viewReadonly,
    grid: snap,
    guides,
    fit,
  } = useViewState(canvasViewAspect, contextId);
  const { update: updateViewState } = useViewStateActions(canvasViewAspect, contextId);
  // A section is a drawing shown inside another object (a document's embed), so it is only looked at, never edited,
  // and shows the drawing alone: no palette and no inspectors.
  const section = role === AppSurface.Section.role;
  // A slide shows the drawing as a picture: read-only like a section, and with no toolbar or panels at all.
  const slide = role === AppSurface.Slide.role;
  const embedded = section || slide;
  // Only the main article draws the canvas chrome (top edge, bars, panels, grid, guides); elsewhere it is the bare drawing.
  const { editing: article } = sceneChrome(role);
  const readonly = (viewReadonly ?? record?.readonly ?? false) || embedded || newer;
  // Docked or floating as this viewer last left the canvas, in either dimension.
  const dock = useInspectorDock(canvas);
  const handleReadonlyChange = useCallback(
    (readonly: boolean) => updateViewState((state) => ({ ...state, readonly })),
    [updateViewState],
  );
  const handleCameraChange = useCallback(
    (camera: Camera) => updateViewState((state) => ({ ...state, camera })),
    [updateViewState],
  );
  const handleDisplayChange = useCallback(
    // The engine's snap toggle is what draws the grid, so the view state calls it the grid.
    ({ snap, guides, fit }: SceneDisplay) => updateViewState((state) => ({ ...state, grid: snap, guides, fit })),
    [updateViewState],
  );

  const readViews = useCallback(() => (bound ? registry.get(bound.store.views) : {}), [registry, bound]);
  const properties = useCanvasProperties(canvas, readViews);

  return (
    // A section takes the document's width and has no height of its own (read-only, it has no dock), so its height
    // follows from the drawing's 3:2 frame.
    <Panel.Root
      role={role}
      classNames={section ? 'w-full aspect-[3/2]' : slide ? 'bg-transparent' : undefined}
      ref={setElement}
    >
      {newer && !embedded && (
        <Panel.Header>
          <NewerFormatBanner />
        </Panel.Header>
      )}
      <Panel.Body>
        {bound && (
          // An unset preference leaves the engine's own default in place.
          <CanvasDatabaseContext.Provider value={db}>
            <Canvas.Root
              key={bound.root}
              classNames={article ? 'border-t border-separator-subtle' : undefined}
              store={bound.store}
              root={bound.root}
              nodes={nodes}
              createProjection={createProjection}
              history={history}
              grid={record?.grid}
              theme={look.theme}
              defaultTheme={look.defaultTheme}
              styleSet={look.styleSet}
              background={look.background}
              backgroundGrid={article ? look.backgroundGrid : 'none'}
              // Both write the canvas record, which a newer plugin's format keeps read-only here.
              onThemeChange={embedded || newer ? undefined : handleThemeChange}
              onBackgroundGridChange={embedded || newer ? undefined : handleBackgroundGridChange}
              readonly={readonly}
              transparent={slide}
              // A slide lays the picture out itself, so the drawing fills its box: no fit margin, and a small drawing is
              // enlarged rather than kept at 1:1.
              margin={slide ? 0 : undefined}
              fitZoom={slide ? MAX_ZOOM : undefined}
              refitKey={refitKey}
              // A newer plugin's format stays read-only here, so the toggle that would unlock it is not offered.
              onReadonlyChange={embedded || newer ? undefined : handleReadonlyChange}
              initialCamera={savedCamera}
              onCameraChange={handleCameraChange}
              initialDisplay={display2D(role, { snap, guides, fit })}
              // Outside the article the grid and guides are forced off, so this view must not write that back as the setting.
              onDisplayChange={article ? handleDisplayChange : undefined}
              inspectors={dock.docked ? 'docked' : 'floating'}
              onInspectorsChange={(mode) => dock.onDockedChange(mode === 'docked')}
              generators={generators}
              compileGenerator={generatorCompiler}
              createGeneratorWorker={createGeneratorWorker}
            >
              <Canvas.Viewport liveDepth={settings.liveDepth} />
              <CanvasEditCommands element={element} />
              <CanvasClipboardText element={element} />
              {/* Unset means shown: settings saved before the default existed hold neither key. */}
              {article && (settings.showToolbar ?? true) && (
                <>
                  <Canvas.Navigation />
                  <Canvas.Actions />
                  <Canvas.Camera />
                  <Canvas.Display />
                </>
              )}
              {!embedded && (
                <>
                  {(settings.showPalette ?? true) && <Canvas.Tools />}
                  <Canvas.Properties {...properties} />
                  <Canvas.Views sceneChoice={sceneChoice} />
                  <Canvas.Layers />
                  <Canvas.Objects />
                </>
              )}
            </Canvas.Root>
          </CanvasDatabaseContext.Provider>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};
