//
// Copyright 2026 DXOS.org
//

//
// Root view of the scene engine (§6–§8): owns the camera, the scene path, selection and the pointer
// state machine; renders the current scene through `SceneLayer` under one CSS transform and drills
// in and out of portals with a camera transition then a root swap. Every model change goes through
// the projection as an intent; the view never writes coordinates itself (decision 11).
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { type MouseEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { type Timeline } from '@dxos/animation';
import { useClock, useExposedClock } from '@dxos/react-ui-animation';
import { mx } from '@dxos/ui-theme';

import { animate, createCanvasAtoms, noHistory, readonlyCapabilities } from '../../engine/index.ts';
import { type GeneratorSource } from '../../generator/index.ts';
import {
  SceneLookContext,
  useCanvasController,
  useCanvasHistory,
  useCommandHeld,
  useDocumentCommands,
  useEditMode,
  useElementHandlers,
  useGeneratorFrames,
  useGesturePreview,
  useNodeDrop,
  useObjectActions,
  usePointerMachine,
  useRegistry,
  useResolvedLook,
  useSceneCamera,
  useSceneKeys,
  useSceneNavigation,
  useSceneSnap,
  useSceneView,
  useSceneWheel,
  useViewport,
  useViewProjection,
} from '../../hooks/index.ts';
import { DEFAULT_GRID, MAJOR_GRID_RATIO, defaultThemeRegistry, keyAction, nodeAnimatable } from '../../model/index.ts';
import { fitFrame, visibleView } from '../../utils/index.ts';
import { InspectorPanel } from '../panels/index.ts';
import { defaultLinkRegistry, defaultNodeRegistry } from '../SceneLayer/index.ts';
import {
  CanvasEditingProvider,
  CanvasGestureProvider,
  CanvasLookProvider,
  CanvasServicesProvider,
  CanvasTimeProvider,
} from './CanvasContext.ts';
import { useSelectionActions } from './CanvasInspectors.tsx';
import { type CanvasRootProps } from './CanvasRootProps.ts';
import { DEFAULT_MARGIN, LIGHT_MODE } from './constants.ts';

/** No generators: what a view given none reads. */
const NO_GENERATORS: Readonly<Record<string, GeneratorSource>> = {};

export const CanvasRoot = ({
  classNames,
  store,
  root,
  nodes: nodeRegistry = defaultNodeRegistry,
  links: linkRegistry = defaultLinkRegistry,
  createProjection,
  projection: projectionProp,
  history: historyProp,
  atoms: atomsProp,
  initialCamera,
  onCameraChange,
  initialDisplay,
  onDisplayChange,
  grid = DEFAULT_GRID,
  margin = DEFAULT_MARGIN,
  fitZoom,
  readonly = false,
  onReadonlyChange,
  transparent = false,
  inspectors = 'floating',
  onInspectorsChange,
  themes = defaultThemeRegistry,
  theme,
  defaultTheme,
  styleSet,
  background,
  backgroundGrid,
  refitKey,
  refitDuration,
  drift,
  onViewChange,
  onThemeChange,
  onBackgroundGridChange,
  frame,
  exportable,
  timeline,
  onTimelineChange,
  generators = NO_GENERATORS,
  compileGenerator,
  createGeneratorWorker,
  children,
}: CanvasRootProps) => {
  const { look, themeGrid } = useResolvedLook(themes, { theme, defaultTheme, styleSet, background, backgroundGrid });
  const registry = useRegistry();
  const atoms = useMemo(() => atomsProp ?? createCanvasAtoms(root), [atomsProp, root]);
  const rootRef = useRef<HTMLDivElement>(null);
  const viewport = useViewport(rootRef);

  const path = useAtomValue(atoms.path);
  // A host-owned projection given no history owns its side effects, so its edits are not undone here.
  const ownHistory = useCanvasHistory({
    registry,
    atoms,
    store,
    history: typeof historyProp === 'function' ? historyProp : projectionProp ? noHistory : undefined,
  });
  const history = historyProp === undefined || typeof historyProp === 'function' ? ownHistory : historyProp;
  const baseProjection = useViewProjection({ store, atoms, createProjection, projection: projectionProp, history });
  history.view.projection = baseProjection;
  // The host's timeline as an atom, so the animated projection follows it without being rebuilt.
  const timelineAtom = useMemo(() => Atom.keepAlive(Atom.make<Timeline | undefined>(undefined)), []);
  useLayoutEffect(() => registry.set(timelineAtom, timeline), [registry, timelineAtom, timeline]);
  // Read when an edit is made, so a new callback does not rebuild the projection.
  const onTimelineChangeRef = useRef(onTimelineChange);
  onTimelineChangeRef.current = onTimelineChange;
  const editable = onTimelineChange !== undefined;
  // Sampled at the view's clock; an edit away from the start becomes keys (ANIMATION.md §5.3, §5.4).
  const projection = useMemo(
    () =>
      animate(baseProjection, {
        registry,
        clock: atoms.clock,
        timeline: timelineAtom,
        onTimelineChange: editable ? (next) => onTimelineChangeRef.current?.(next) : undefined,
        autoKey: () => registry.get(atoms.autoKey),
        animatable: (node) => nodeAnimatable(nodeRegistry, node),
      }),
    [baseProjection, registry, atoms, nodeRegistry, timelineAtom, editable],
  );
  const scene = useAtomValue(projection.scene);
  const baseScene = useAtomValue(baseProjection.scene);
  const time = useAtomValue(atoms.clock.time);
  const generated = useGeneratorFrames({
    scene: baseScene,
    timeline,
    time,
    sources: generators,
    compile: compileGenerator,
    createWorker: createGeneratorWorker,
  });
  useClock(atoms.clock, { duration: timeline?.duration, loop: timeline?.loop });
  const visible = useMemo(() => visibleView(scene), [scene]);
  const scenes = useAtomValue(store.views);
  const camera = useAtomValue(atoms.camera);
  const selection = useAtomValue(atoms.selection);
  const tool = useAtomValue(atoms.tool);
  const commandHeld = useCommandHeld();
  const snapEnabled = useAtomValue(atoms.snap);
  // The margin is in major cells, taken from the model's grid rather than the level currently drawn,
  // so a fit puts the same gap around the scene whatever the zoom.
  const inset = margin * grid * MAJOR_GRID_RATIO;
  // A new node's default size is nominal: major cells of the model's grid, not of the level drawn at this zoom.
  const cell = grid * MAJOR_GRID_RATIO;

  const drag = useAtomValue(atoms.drag);
  const active = useAtomValue(atoms.active);
  // A node's content stays live only while the node is the selection; selecting anything else makes it inert again.
  useEffect(() => {
    if (active !== undefined && (selection.size !== 1 || !selection.has(active))) {
      registry.set(atoms.active, undefined);
    }
  }, [active, selection, registry, atoms.active]);
  const sceneId = path[path.length - 1];

  // Every gesture, key and control is gated on these, so a read-only view is the projection with nothing allowed.
  const capabilities = readonly ? readonlyCapabilities : projection.capabilities;

  const {
    setCamera,
    animateTo,
    cancelAnimation,
    navigating,
    isNavigating,
    isAnimating,
    cameraTarget,
    touchNavigation,
    opening,
    setOpening,
  } = useSceneCamera(registry, atoms, viewport);

  // Set once the user takes the camera over; a restored camera counts as taken over, so the fit leaves it where it was.
  const interactedRef = useRef(initialCamera !== undefined);
  const { minor, major, snap, snapMinor, isClick, moveDelta } = useSceneSnap(grid, camera.zoom, snapEnabled);
  const fitTarget = useMemo(() => frame ?? fitFrame(scene), [frame, scene]);
  const { fitting, enterFit, exitFit, hasCameraTrack } = useSceneView({
    registry,
    atoms,
    rootRef,
    viewport,
    interactedRef,
    path,
    camera,
    drag,
    timeline,
    time,
    fitTarget,
    inset,
    fitZoom,
    initialCamera,
    initialDisplay,
    onDisplayChange,
    onCameraChange,
    onViewChange,
    refitKey,
    refitDuration,
    drift,
    setCamera,
    animateTo,
    isAnimating,
  });

  const controller = useCanvasController({
    registry,
    atoms,
    store,
    live: {
      projection,
      baseProjection,
      timeline,
      onTimelineChange,
      nodeRegistry,
      readonly,
      grid: { major, snap },
      viewport,
      inset,
      frame,
      camera: { animateTo, target: cameraTarget, setOpening },
      fit: { enterFit, exitFit, takeOver: () => (interactedRef.current = true) },
      look: { onThemeChange, onBackgroundGridChange },
      history,
    },
  });
  const { navigation } = controller;
  // Undo and redo return to the View the edit was made in and select what is left of its selection.
  history.view.restore = ({ path, selection, isolate }) => {
    const view = registry.get(store.views)[path.at(-1) ?? ''];
    const select = selection.filter((id) => view?.nodes[id] !== undefined || view?.links[id] !== undefined);
    navigation.openPlace({ path, isolate }, { animate: false, select });
  };

  // Read-only, nothing is selected: a selection only exists to be edited.
  const select = controller.selection.select;
  useEffect(() => {
    if (readonly) {
      select([]);
    }
  }, [readonly, select]);

  const { bounds } = useSceneNavigation({
    registry,
    atoms,
    navigation,
    nodeRegistry,
    scenes,
    scene,
    path,
    camera,
    viewport,
    drag,
    isAnimating,
  });
  const measured = viewport.width > 0 && viewport.height > 0;

  useExposedClock(registry, atoms.clock, timeline, exportable);

  useSceneWheel({
    rootRef,
    registry,
    atoms,
    interactedRef,
    exitFit,
    cancelAnimation,
    touchNavigation,
    hasCameraTrack,
    setCamera,
  });

  const timelineKeys = useMemo(
    () => ({
      active: timeline !== undefined,
      togglePlay: controller.time.togglePlay,
      step: controller.time.step,
      jumpKey: controller.time.jumpKey,
      addKey: controller.time.addKey,
      removeKey: controller.time.removeKey,
    }),
    [timeline, controller],
  );

  const objectActions = useObjectActions({
    registry,
    atoms,
    store,
    baseProjection,
    commit: history.commit,
    select,
    navigation,
    viewport,
  });

  const { setTool, toggleSnap, toggleGuides, toggleDebug } = controller.tools;
  const { editNode, exitEdit } = useEditMode({ registry, atoms, nodeRegistry, capabilities, select });
  const {
    onBackgroundPointerDown,
    onPointerMove,
    onPointerUp,
    onContextMenu,
    cancelDrag,
    updateHover,
    onNodePointerDown,
    onLinkPointerDown,
    onLinkDoubleClick,
    onLinkContextMenu,
    onHandlePointerDown,
    onPortPointerDown,
    onEndPointerDown,
    onPointPointerDown,
    onMidpointPointerDown,
    onPointContextMenu,
    onVertexPointerDown,
    onVertexMidpointPointerDown,
    deleteVertex,
    setDrag,
    toScene,
    removePoint,
    finishVertices,
    removeVertex,
    createdNode,
    commitCreated,
    menu,
    closeMenu,
    menuAnchorRef,
  } = usePointerMachine({
    registry,
    atoms,
    setTool: controller.tools.setTool,
    duplicate: controller.document.duplicate,
    store,
    // A hidden layer's elements are not hit: gestures see the scene as drawn.
    scene: visible,
    nodeRegistry,
    projection,
    capabilities,
    camera,
    rootRef,
    interactedRef,
    select,
    setCamera,
    cancelAnimation,
    isNavigating,
    cell,
    minor,
    major,
    snap,
    snapMinor,
    isClick,
    moveDelta,
    exitEdit,
  });

  // A gesture begun before the view turned read-only is dropped, not committed on release, and a drawing tool gives way
  // to select, since read-only offers only select and pan.
  useEffect(() => {
    if (readonly) {
      cancelDrag();
      exitEdit();
      if (registry.get(atoms.tool).kind !== 'hand') {
        setTool({ kind: 'select' });
      }
    }
  }, [readonly, cancelDrag, exitEdit, registry, atoms.tool, setTool]);

  const { copy, cut, paste } = controller.editing;
  const documentCommands = useDocumentCommands({
    registry,
    atoms,
    projection,
    history,
    readonly,
    nodeRegistry,
    capabilities,
    cell,
    viewport,
    snapMinor,
    createdNode,
    commitCreated,
  });

  const onSceneKey = useSceneKeys({
    registry,
    atoms,
    scene,
    nodeRegistry,
    linkRegistry,
    projection,
    capabilities,
    navigation,
    grid,
    select,
    toggleSnap,
    toggleGuides,
    toggleDebug,
    onUndo: documentCommands.undo,
    onRedo: documentCommands.redo,
    duplicate: () => controller.document.duplicate(registry.get(atoms.selection), { x: major, y: major }),
    commit: history.commit,
    major,
    copy,
    cut,
    paste,
    delete: controller.selection.delete,
    group: controller.selection.group,
    ungroup: controller.selection.ungroup,
    cancelDrag,
    removePoint,
    finishVertices,
    removeVertex,
    deleteVertex,
    setTool,
    timeline: timelineKeys,
    editNode,
    exitEdit,
  });

  // Shortcuts belong to the canvas itself: keys typed into a control the view hosts (the properties
  // panel, a toolbar) bubble here too, and must not toggle debug or delete the selection.
  const onKeyDown = useCallback<typeof onSceneKey>(
    (event) => {
      if (event.target === event.currentTarget) {
        onSceneKey(event);
      } else if (keyAction(event) === 'cancel' && registry.get(atoms.active) !== undefined) {
        // Escape out of a node's live content leaves it inert and the node selected, as a click outside would not.
        registry.set(atoms.active, undefined);
        rootRef.current?.focus();
      }
    },
    [onSceneKey, registry, atoms.active],
  );

  const { displayScene, blocked, landing, createFrame } = useGesturePreview({
    scene,
    drag,
    projection,
    minor,
    createdNode,
  });

  const { handlers, onDoubleClick: onElementDoubleClick } = useElementHandlers({
    registry,
    atoms,
    nodeRegistry,
    projection,
    capabilities,
    navigation,
    scene,
    toScene,
    editNode,
    onNodePointerDown,
    onLinkPointerDown,
    onLinkDoubleClick,
    onLinkContextMenu,
  });

  // A double-click ends a line drawn vertex by vertex, rather than opening what lies under it.
  const onDoubleClick = useCallback(
    (event: MouseEvent) => {
      if (registry.get(atoms.drag)?.kind === 'vertices') {
        finishVertices(false);
      } else {
        onElementDoubleClick(event);
      }
    },
    [registry, atoms.drag, finishVertices, onElementDoubleClick],
  );

  useNodeDrop({ rootRef, capabilities, nodeRegistry, cell, toScene, snapMinor, setDrag, cancelDrag, onPointerUp });

  // Once per atoms, so the providers' values hold still while the root re-renders.
  const timeAtoms = useMemo(
    () => ({ time: atoms.clock.time, playing: atoms.clock.playing, autoKey: atoms.autoKey }),
    [atoms],
  );
  const editingAtoms = useMemo(
    () => ({ editing: atoms.editing, active: atoms.active, clipboard: atoms.clipboard }),
    [atoms],
  );

  const inspectorActions = useSelectionActions({ scene, selection, store, capabilities, readonly, controller });

  return (
    <CanvasServicesProvider
      registry={registry}
      controller={controller}
      atoms={atoms}
      store={store}
      root={root}
      projection={projection}
      baseProjection={baseProjection}
      capabilities={capabilities}
      readonly={readonly}
      transparent={transparent}
      onReadonlyChange={onReadonlyChange}
      nodeRegistry={nodeRegistry}
      linkRegistry={linkRegistry}
      grid={grid}
      fitting={fitting}
      timeline={timelineAtom}
      onTimelineChange={onTimelineChange}
      document={documentCommands}
      objectActions={objectActions}
    >
      <CanvasLookProvider
        look={look}
        themes={themes}
        themeOverride={theme}
        themeGrid={themeGrid}
        // The pickers show only when the host takes their changes.
        setTheme={onThemeChange && controller.look.setTheme}
        setBackgroundGrid={onBackgroundGridChange && controller.look.setBackgroundGrid}
      >
        <CanvasTimeProvider atoms={timeAtoms} commands={controller.time} timeline={timelineAtom} generated={generated}>
          <CanvasEditingProvider atoms={editingAtoms} commands={controller.editing}>
            <CanvasGestureProvider
              displayScene={displayScene}
              blocked={blocked}
              createFrame={createFrame}
              landing={landing}
              handlers={handlers}
              bounds={bounds}
              viewport={viewport}
              measured={measured}
              navigating={navigating}
              opening={opening}
              onHandlePointerDown={onHandlePointerDown}
              onPortPointerDown={onPortPointerDown}
              onEndPointerDown={onEndPointerDown}
              onPointPointerDown={onPointPointerDown}
              onMidpointPointerDown={onMidpointPointerDown}
              onPointContextMenu={onPointContextMenu}
              onVertexPointerDown={onVertexPointerDown}
              onVertexMidpointPointerDown={onVertexMidpointPointerDown}
              removePoint={removePoint}
              menu={menu}
              closeMenu={closeMenu}
              menuAnchorRef={menuAnchorRef}
            >
              <SceneLookContext.Provider value={look}>
                <InspectorPanel.Root
                  docked={!readonly && inspectors === 'docked'}
                  readonly={readonly}
                  actions={inspectorActions}
                  onDockedChange={
                    onInspectorsChange && ((docked) => onInspectorsChange(docked ? 'docked' : 'floating'))
                  }
                >
                  {/* The canvas beside the dock, which docked inspectors move into; with none docked, it takes no space. */}
                  <InspectorPanel.Frame classNames={classNames} transparent={transparent}>
                    <div
                      ref={rootRef}
                      tabIndex={0}
                      className={mx(
                        '@container/canvas relative grow h-full overflow-clip outline-none touch-none select-none',
                        !transparent && 'bg-base-surface',
                        // A theme with a mode takes it over the app's, for everything over the canvas.
                        look.tone === 'dark' && 'dark',
                        (tool.kind === 'hand' || commandHeld) && 'cursor-grab',
                        tool.kind === 'node' && !commandHeld && 'cursor-crosshair',
                      )}
                      style={look.tone === 'light' ? { ...LIGHT_MODE, contain: 'strict' } : { contain: 'strict' }}
                      data-testid='scene-view'
                      data-mode={look.tone === 'theme' ? undefined : look.tone}
                      onPointerDown={onBackgroundPointerDown}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      // A cancelled pointer (a touch the browser took over) abandons the gesture rather than landing it.
                      onPointerCancel={cancelDrag}
                      onPointerLeave={() => updateHover(undefined)}
                      onDoubleClick={onDoubleClick}
                      onContextMenu={onContextMenu}
                      onKeyDown={onKeyDown}
                    >
                      {children}
                    </div>
                  </InspectorPanel.Frame>
                </InspectorPanel.Root>
              </SceneLookContext.Provider>
            </CanvasGestureProvider>
          </CanvasEditingProvider>
        </CanvasTimeProvider>
      </CanvasLookProvider>
    </CanvasServicesProvider>
  );
};

CanvasRoot.displayName = 'Canvas.Root';
