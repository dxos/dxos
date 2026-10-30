//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Entity, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { type VersionedSource, combinedSource } from '@dxos/react-ui-canvas/headless';
import {
  type BackgroundGrid,
  type Camera,
  Canvas,
  type CanvasServices,
  type ConstrainedModel,
  type EditorDisplay,
  type FreehandProjectionOptions,
  type GraphModel,
  MAX_ZOOM,
  type Overlay,
  type Projection,
  type SceneChoice,
  type SceneDisplay,
  SceneEditor,
  type ViewStore,
  createConstrainedProjection,
  createDynamicProjection,
  createHistory,
  createLatticeProjection,
  createLocalHistory,
  defaultNodeRegistry,
  sessionHistory,
  sessionStacks,
  useRegistry,
} from '@dxos/react-ui-canvas/scene';
import { createConfig2D } from '@dxos/react-ui-scene';
import * as Banner from '@dxos/react-ui/Banner';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import {
  type Layer,
  type LayoutIntent,
  type ModelIntent,
  type Node,
  Scene,
  type ViewId,
  isViewNode,
  reachedObjects,
} from '@dxos/scene';

import {
  applyLayoutIntent,
  canvasDocument,
  canvasModel2D,
  generatorCompiler,
  isCanvasDrawing,
  isConstrainedModel,
  isGraphModel,
  isOverlay,
  layoutModelAtom,
  layoutSource,
  objectRef,
  openScene,
  parseLinkedViewId,
  resolveDrawingLook,
  sceneClipboardCodec,
  writeDocument,
  writeModelIntent,
} from '#model';
// Aliased: `Canvas` here is the scene engine's component namespace.
import { CanvasCapabilities, Canvas as CanvasFormat } from '#types';

import { CanvasNamespace } from '../../namespace.ts';
import { CanvasEditCommands } from '../CanvasArticle/CanvasEditCommands.tsx';
import { CanvasDatabaseContext } from '../CanvasArticle/CanvasViewNodeView.tsx';
import { createTrackerHistory } from '../CanvasArticle/tracker-history.ts';
import {
  createGeneratorWorker,
  useCanvasGenerators,
  useCanvasNodes,
  useReconciledMigrations,
} from '../CanvasArticle/use-canvas-scene.ts';
import { useSceneDocument } from '../SceneStage/index.ts';
import { CanvasClipboardText } from './CanvasClipboardText.tsx';
import { display2D, sceneChrome } from './scene-chrome.ts';
import { SceneEditCommands } from './SceneEditCommands.tsx';
import { useCanvasProperties } from './use-canvas-properties.ts';
import { useInspectorDock } from './use-inspector-dock.ts';
import { useSceneChoice } from './use-scene-choice.ts';
import { useSceneShots } from './use-scene-shots.ts';
import { canvasViewAspect } from './view-state.ts';

/** What a drawing surface passes a scene view, beside the canvas it shows. */
export type SceneSurfaceProps = Omit<IllustratorCapabilities.DrawingVariantSurfaceProps<Obj.Unknown>, 'canvas'>;

const NO_REFITS = Atom.make<Record<string, number>>({});

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

/** The camera a 2D viewer's camera bar resets to: the scene's origin at 1:1. */
const AUTHORED_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

/** The theme a canvas draws when neither it nor the app names one. */
const FALLBACK_THEME = 'flat';

const isStoredLayout2D = (value: unknown): value is Scene.Layout2D => Obj.instanceOf(Scene.Layout2D, value);

/**
 * A 2D `Canvas`: its open `Scene2D` in the shared scene editor with the 2D config (react-ui-canvas's engine as the
 * viewport, in the mode the canvas's settings name). Every edit is a `LayoutIntent` written to the layout that owns the
 * element, recorded for undo over every 2D layout the scene reaches. Outside an article it is a picture.
 */
export const SceneView2D = ({ canvas, ...props }: SceneSurfaceProps & { canvas: CanvasFormat.Canvas }) => {
  const { role } = props;
  const registry = useRegistry();
  const { key: sceneKey, choice: sceneChoice } = useSceneChoice(canvas);
  useReconciledMigrations(props.drawing, canvas, role === AppSurface.Article.role);
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
  const scene = openScene(canvas, sceneKey);
  const stored = Obj.instanceOf(Scene.Scene2D, scene) ? scene : undefined;
  const document = useSceneDocument(stored);
  const mode = CanvasFormat.projectionOf(settings);
  const layout = stored?.layout.target;
  // The projection's own model lives in the layout, so it persists with the arrangement; its atoms follow the layout
  // until the mode or layout changes, then let it go.
  const models = useMemo(() => {
    if (!Obj.instanceOf(Scene.Layout2D, layout)) {
      return undefined;
    }
    if (mode === 'constrained') {
      return {
        mode,
        model: layoutModelAtom(registry, layout, ['constrained'], isConstrainedModel, EMPTY_CONSTRAINED),
      } as const;
    }
    if (mode === 'dynamic') {
      return {
        mode,
        graph: layoutModelAtom(registry, layout, ['dynamic', 'graph'], isGraphModel, EMPTY_GRAPH),
        overlay: layoutModelAtom(registry, layout, ['dynamic', 'overlay'], isOverlay, EMPTY_OVERLAY),
      } as const;
    }
    return undefined;
  }, [registry, mode, layout]);
  useEffect(
    () => () => {
      if (models?.mode === 'constrained') {
        models.model.dispose();
      } else if (models?.mode === 'dynamic') {
        models.graph.dispose();
        models.overlay.dispose();
      }
    },
    [models],
  );
  const createProjection = useMemo<CreateProjection | undefined>(() => {
    if (mode === 'lattice') {
      return createLatticeProjection;
    }
    if (models?.mode === 'constrained') {
      return ({ registry }) =>
        createConstrainedProjection({ registry, model: models.model.atom, options: { nodes: defaultNodeRegistry } });
    }
    if (models?.mode === 'dynamic') {
      return ({ registry }) =>
        createDynamicProjection({
          registry,
          graph: models.graph.atom,
          overlay: models.overlay.atom,
          options: { nodes: defaultNodeRegistry },
        });
    }
    return undefined;
  }, [mode, models]);

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
        createProjection,
        generators,
        compileGenerator: generatorCompiler,
        createGeneratorWorker,
        liveDepth: appSettings.liveDepth,
      }),
    [useProperties, nodes, createProjection, generators, appSettings.liveDepth],
  );

  // Every 2D layout the scene reaches, by key, as the objects edits are written to.
  const layouts = useMemo(
    () =>
      new Map((stored ? reachedObjects(stored) : []).filter(isStoredLayout2D).map((layout) => [layout.key, layout])),
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
  /** The canvas's 2D layout `key`, made (empty, on the canvas's model) when the engine opened a new View for it. */
  const layoutFor = useCallback(
    (key: string): Scene.Layout2D | undefined => {
      const listed = (): Scene.Layout2D | undefined =>
        layouts.get(key) ??
        canvas.layouts.flatMap((ref) =>
          isStoredLayout2D(ref.target) && ref.target.key === key ? [ref.target] : [],
        )[0];
      if (listed()) {
        return listed();
      }
      const before = canvasDocument(canvas);
      const model = canvasModel2D(canvas)?.key;
      writeDocument(canvas, {
        ...before,
        layouts: [...before.layouts, { id: key, dim: '2d', ...(model ? { model } : {}), elements: {} }],
      });
      return listed();
    },
    [layouts, canvas],
  );
  const handleIntent = useCallback(
    (key: string, intent: LayoutIntent) => {
      const target = layoutFor(key);
      target && applyLayoutIntent(target, intent);
    },
    [layoutFor],
  );
  const handleModelIntent = useCallback(
    (intent: ModelIntent) => writeModelIntent(canvas, intent).map(({ message }) => message),
    [canvas],
  );
  const readDocument = useCallback(() => canvasDocument(canvas), [canvas]);
  const handleLayersChange = useCallback(
    (key: string, next: readonly Layer[]) => {
      const target = layouts.get(key);
      target &&
        Obj.update(target, (target) => {
          target.layers = Object.fromEntries(next.map((layer) => [layer.id, layer]));
        });
    },
    [layouts],
  );

  // The look and grid are the drawing's, shared with collaborators; snapping, guides, axes and the camera are this
  // viewer's own.
  const contextId = Entity.getURI(canvas);
  const { camera, readonly: viewReadonly, grid: snap, guides, axes } = useViewState(canvasViewAspect, contextId);
  const { update: updateViewState } = useViewStateActions(canvasViewAspect, contextId);
  const readonly = viewReadonly ?? settings?.readonly ?? false;
  const handleReadonlyChange = useCallback(
    (next: boolean) => updateViewState((state) => ({ ...state, readonly: next })),
    [updateViewState],
  );
  const handleCameraChange = useCallback(
    (next: Camera) => updateViewState((state) => ({ ...state, camera: next })),
    [updateViewState],
  );
  const display = useMemo<EditorDisplay>(
    () => ({
      theme: settings?.theme ?? appSettings.theme ?? FALLBACK_THEME,
      themeOverride: settings?.theme,
      grid: (settings?.backgroundGrid ?? 'none') !== 'none',
      snap: snap ?? true,
      guides: guides ?? true,
      axes: axes ?? false,
    }),
    [settings?.theme, settings?.backgroundGrid, appSettings.theme, snap, guides, axes],
  );
  const handleDisplayChange = useCallback(
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

  // Docked or floating as this viewer last left the canvas, in either dimension.
  const dock = useInspectorDock(canvas);
  const { shots, onShotChange } = useSceneShots(stored);

  const [element, setElement] = useState<HTMLElement | null>(null);
  if (!stored || !document) {
    return null;
  }

  return (
    <Panel.Root role={role} ref={setElement}>
      <Panel.Body>
        <CanvasDatabaseContext.Provider value={db}>
          <SceneEditor.Root
            config={config}
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
            camera={camera}
            authoredCamera={AUTHORED_CAMERA}
            onCameraChange={handleCameraChange}
            docked={dock.docked}
            onDockedChange={dock.onDockedChange}
            sceneChoice={sceneChoice}
            shots={shots}
            onShotChange={onShotChange}
          >
            <SceneEditCommands element={element} />
            <SceneEditor.Viewport>
              <SceneEditor.Tools />
              <SceneEditor.Actions />
              <SceneEditor.Camera />
              <SceneEditor.Display />
              <SceneEditor.ContextMenu />
              <SceneEditor.Notice />
              <SceneEditor.Timeline />
            </SceneEditor.Viewport>
            <SceneEditor.Inspector />
          </SceneEditor.Root>
        </CanvasDatabaseContext.Provider>
      </Panel.Body>
    </Panel.Root>
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

const EMPTY_CONSTRAINED: ConstrainedModel = { nodes: [], constraints: [] };
const EMPTY_GRAPH: GraphModel = { nodes: [], edges: [] };
const EMPTY_OVERLAY: Overlay = { positions: {} };

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
  // An agent's drawing edit asks for a refit, so the view frames what changed rather than where the viewer left it.
  const [refitAtom] = Hooks.useCapabilities(IllustratorCapabilities.Refit);
  const refits = useAtomValue(refitAtom ?? NO_REFITS);
  const refitKey = refits[Obj.getURI(canvas)];
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
