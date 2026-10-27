//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as ObjectCombobox from '@dxos/app-toolkit/ObjectCombobox';
import { Entity, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import {
  type BackgroundGrid,
  type Camera,
  Canvas,
  type CanvasPropertiesProps,
  type Element,
  type InspectorMode,
  MAX_ZOOM,
  type Node,
  type SceneDisplay,
  type ViewId,
  createLatticeProjection,
  isLink,
  isViewNode,
  useRegistry,
} from '@dxos/react-ui-canvas/scene';
import * as Banner from '@dxos/react-ui/Banner';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';

import { meta } from '#meta';
import {
  canvasRecordOf,
  generatorCompiler,
  isCanvasDrawing,
  objectRef,
  objectUri,
  parseLinkedViewId,
  resolveDrawingLook,
  updateCanvasRecord,
} from '#model';
// Aliased: `Canvas` here is the scene engine's component namespace.
import { CanvasCapabilities, Canvas as CanvasFormat } from '#types';

import { CanvasEditCommands } from './CanvasEditCommands.tsx';
import { CanvasDatabaseContext } from './CanvasViewNodeView.tsx';
import { createTrackerHistory } from './tracker-history.ts';
import { createGeneratorWorker, useBoundCanvasStore, useCanvasGenerators, useCanvasNodes } from './use-canvas-scene.ts';
import { canvasViewAspect } from './view-state.ts';

export type CanvasArticleProps = IllustratorCapabilities.DrawingVariantSurfaceProps;

const NO_REFITS = Atom.make<Record<string, number>>({});

/** Why a canvas a newer plugin saved opens read-only, and what unlocks it. */
const NewerFormatBanner = () => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  return (
    <Banner.Root valence='warning' data-testid='canvas.newer-format'>
      <Banner.Title>{t('newer-format.title')}</Banner.Title>
      <Banner.Body>{t('newer-format.message')}</Banner.Body>
    </Banner.Root>
  );
};

/** The article surface of the canvas variant: the scene engine over the drawing's canvas. */
export const CanvasArticle = ({ role, canvas }: CanvasArticleProps) => {
  invariant(Obj.instanceOf(Drawing.Canvas, canvas));
  const registry = useRegistry();
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
  const [hovered, setHovered] = useState(false);
  const history = useMemo(
    () => (tracker ? createTrackerHistory({ tracker, invoker, canvas }) : undefined),
    [tracker, invoker, canvas],
  );
  const nodes = useCanvasNodes(openObject);
  const bound = useBoundCanvasStore(canvas);
  // An agent's drawing edit asks for a refit, so the view frames what changed rather than where the viewer left it.
  const [refitAtom] = Hooks.useCapabilities(IllustratorCapabilities.Refit);
  const refits = useAtomValue(refitAtom ?? NO_REFITS);
  const refitKey = refits[Obj.getURI(canvas)];
  const generators = useCanvasGenerators(db);

  // The drawing's settings, edited in the properties companion: the lattice picks the projection.
  const [snapshot, updateCanvas] = useObject(canvas);
  const record = canvasRecordOf(snapshot.content);
  const lattice = record?.lattice === true;
  // The drawing's look is shared with collaborators, so it wins over the viewer's own default.
  const look = resolveDrawingLook(record, settings);
  const handleThemeChange = useCallback(
    (theme: string | undefined) => updateCanvas((canvas) => updateCanvasRecord(canvas.content, { theme })),
    [updateCanvas],
  );
  const handleBackgroundGridChange = useCallback(
    (backgroundGrid: BackgroundGrid | undefined) =>
      updateCanvas((canvas) => updateCanvasRecord(canvas.content, { backgroundGrid })),
    [updateCanvas],
  );

  // Restores where the root scene was last left; read once per binding, since later values are our own writes.
  const contextId = Entity.getURI(canvas);
  const {
    camera: savedCamera,
    readonly: viewReadonly,
    floating = true,
    grid: snap,
    guides,
    fit,
    groups,
  } = useViewState(canvasViewAspect, contextId);
  const { update: updateViewState } = useViewStateActions(canvasViewAspect, contextId);
  // A section is a drawing shown inside another object (a document's embed), so it is only looked at, never edited,
  // and shows the drawing alone: no palette and no inspectors.
  const section = role === AppSurface.Section.role;
  // A slide shows the drawing as a picture: read-only like a section, and with no toolbar or panels at all.
  const slide = role === AppSurface.Slide.role;
  const embedded = section || slide;
  // Only the main article draws the canvas chrome (top edge, grid, guides); elsewhere it is the bare drawing.
  const article = role === AppSurface.Article.role;
  const newer = CanvasFormat.isNewerScene(canvas.schema);
  const readonly = (viewReadonly ?? record?.readonly ?? false) || embedded || newer;
  const handleInspectorsChange = useCallback(
    (mode: InspectorMode) => updateViewState((state) => ({ ...state, floating: mode === 'floating' })),
    [updateViewState],
  );
  const handleReadonlyChange = useCallback(
    (readonly: boolean) => updateViewState((state) => ({ ...state, readonly })),
    [updateViewState],
  );
  const handleGroupsChange = useCallback(
    (groups: Record<string, boolean>) => updateViewState((state) => ({ ...state, groups })),
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

  // A shape opens a scene of this drawing, never one bound from a linked drawing.
  const isLocalScene = useCallback((id: ViewId) => !parseLinkedViewId(id), []);

  // A frame may show any object listed in the navigator but this drawing itself.
  const { t } = UiHooks.useTranslation();
  const getOptions = useCallback<NonNullable<CanvasPropertiesProps['getOptions']>>(
    (results) =>
      ObjectCombobox.toOptions(results, {
        t,
        filter: (object) => !(Obj.instanceOf(Drawing.Drawing, object) && object.canvas.target === canvas),
      }),
    [canvas, t],
  );

  // A frame holds its own scene or an object, never both: it may take an object only while its own child scene is
  // empty, so linking never hides what was drawn there.
  const overrides = useCallback(
    (elements: readonly Element[]): ReturnType<NonNullable<CanvasPropertiesProps['overrides']>> => {
      const scenes = bound ? registry.get(bound.store.views) : {};
      const locked = elements.some((element) => {
        if (isLink(element) || !isViewNode(element) || objectUri(element) || parseLinkedViewId(element.scene)) {
          return false;
        }
        const child = scenes[element.scene];
        return child !== undefined && Object.keys(child.nodes).length > 0;
      });
      // A frame showing an object opens the object (or a canvas drawing's root), not a scene of this one.
      const linked = elements.some((element) => !isLink(element) && objectUri(element));
      // The role applies only to an object shown as a surface, not to a canvas drawing shown as a scene; an object
      // still loading is offered one, so the field appears as soon as the object is picked.
      const surfaced = elements.some(
        (element) =>
          !isLink(element) && objectUri(element) && isCanvasDrawing(objectRef(element, db)?.target) === false,
      );
      return {
        ...(locked ? { 'link.object': { readonly: true } } : {}),
        ...(linked ? { scene: { hidden: true } } : {}),
        ...(surfaced ? {} : { 'link.role': { hidden: true } }),
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registry, bound, db],
  );

  // Panel.Root takes no pointer handlers, so the section tracks the pointer on its element.
  useEffect(() => {
    if (!section || !element) {
      return;
    }
    const enter = () => setHovered(true);
    const leave = () => setHovered(false);
    element.addEventListener('pointerenter', enter);
    element.addEventListener('pointerleave', leave);
    return () => {
      element.removeEventListener('pointerenter', enter);
      element.removeEventListener('pointerleave', leave);
    };
  }, [section, element]);

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
              createProjection={lattice ? createLatticeProjection : undefined}
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
              initialDisplay={{ snap, guides: article && guides, fit }}
              // Outside the article the guides are forced off, so this view must not write that back as the setting.
              onDisplayChange={article ? handleDisplayChange : undefined}
              inspectors={floating ? 'floating' : 'docked'}
              onInspectorsChange={handleInspectorsChange}
              generators={generators}
              compileGenerator={generatorCompiler}
              createGeneratorWorker={createGeneratorWorker}
            >
              <Canvas.Viewport liveDepth={settings.liveDepth} />
              <CanvasEditCommands element={element} />
              {/* Unset means shown: settings saved before the default existed hold neither key. A section shows its bars
                  only under the pointer, so an embed in a document reads as a picture until it is used. */}
              {!slide && (!section || hovered) && (settings.showToolbar ?? true) && (
                <>
                  <Canvas.Navigation />
                  <Canvas.Actions />
                  <Canvas.Debug />
                  {!section && <Canvas.Theme />}
                </>
              )}
              {!embedded && (
                <>
                  {(settings.showPalette ?? true) && <Canvas.Tools />}
                  <Canvas.Properties
                    db={db}
                    getOptions={getOptions}
                    overrides={overrides}
                    groups={groups}
                    onGroupsChange={handleGroupsChange}
                    sceneFilter={isLocalScene}
                  />
                  <Canvas.Timeline />
                  <Canvas.Views />
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

CanvasArticle.displayName = 'CanvasArticle';
