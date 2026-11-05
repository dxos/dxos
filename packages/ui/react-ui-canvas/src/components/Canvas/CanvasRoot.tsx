//
// Copyright 2026 DXOS.org
//

//
// Root view of the scene engine (§6–§8): owns the camera, the scene path, selection and the pointer
// state machine; renders the current scene through `SceneLayer` under one CSS transform and drills
// in and out of portals with a camera transition then a root swap. Every change is an edit of the draw state, which
// reaches the host as layout intents; the view never writes the document itself (decision 11).
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { type MouseEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useClock, useExposedClock } from '@dxos/react-ui-animation';
import { DEFAULT_GRID, MAJOR_GRID_RATIO, type ViewId, findLayout } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import { type DrawState, createCanvasAtoms, readonlyCapabilities } from '../../engine/index.ts';
import { type GeneratorSource } from '../../generator/index.ts';
import {
  SceneLookContext,
  type UseDrawSceneOptions,
  useCanvasController,
  useCanvasHistory,
  useCommandHeld,
  useDocumentCommands,
  useDocumentStore,
  useDrawScene,
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
} from '../../hooks/index.ts';
import { type ThemeChoice, chooseTheme, defaultThemeRegistry, keyAction, neuVars } from '../../model/index.ts';
import { fitFrame, visibleView } from '../../utils/index.ts';
import { defaultLinkRegistry, defaultNodeRegistry } from '../SceneLayer/index.ts';
import {
  CanvasEditingProvider,
  CanvasGestureProvider,
  CanvasLookProvider,
  CanvasServicesProvider,
  CanvasTimeProvider,
} from './CanvasContext.ts';
import { type CanvasRootProps, type CanvasShellProps } from './CanvasRootProps.ts';
import { DEFAULT_MARGIN, LIGHT_MODE } from './constants.ts';

/** The Neu tokens, for whichever look draws with them: a few inherited variables cost nothing to a look that does not. */
const NEU_STYLE = neuVars();

/** The view's own frame when the host gives no shell. */
const CanvasFrame = ({ classNames, transparent, children }: CanvasShellProps) => (
  // Clipped rather than hidden: a hidden box still scrolls, so focusing content embedded in the view (an editor's caret)
  // would scroll the whole frame to reveal it.
  <div className={mx('relative flex dx-fill overflow-clip', !transparent && 'bg-base-surface', classNames)}>
    {children}
  </div>
);

/** No generators: what a view given none reads. */
const NO_GENERATORS: Readonly<Record<string, GeneratorSource>> = {};

/**
 * The engine over a document: its scene's layouts drawn from the draw state, each edit sent to the host as intents
 * (COMMON-CORE C.2).
 */
export const CanvasRoot = ({
  document,
  scene,
  constrain,
  onIntent,
  onModelIntent,
  onTransaction,
  ...props
}: CanvasRootProps) => {
  const registry = useRegistry();
  // Read when a write is checked, so the view's snap toggle reaches the mode without rebuilding the store.
  const snapRef = useRef<() => boolean>(() => true);
  const {
    store,
    root,
    constrain: preview,
  } = useDocumentStore(registry, {
    document,
    scene,
    constrain,
    snap: () => snapRef.current(),
    onIntent,
    onModelIntent,
    onTransaction,
  });
  const lattice = (sceneId: ViewId) => {
    const layout = findLayout(document, sceneId);
    return layout?.dim === '2d' ? layout.lattice : undefined;
  };
  return (
    <CanvasEngine
      key={root}
      {...props}
      store={store}
      root={root}
      snapRef={snapRef}
      preview={preview}
      lattice={lattice}
    />
  );
};

CanvasRoot.displayName = 'Canvas.Root';

type CanvasEngineProps = Omit<
  CanvasRootProps,
  'document' | 'scene' | 'constrain' | 'onIntent' | 'onModelIntent' | 'onTransaction'
> & {
  store: DrawState;
  root: ViewId;
  snapRef: { current: () => boolean };
} & Pick<UseDrawSceneOptions, 'lattice'> & { preview: UseDrawSceneOptions['constrain'] };

const CanvasEngine = ({
  classNames,
  store,
  root,
  snapRef,
  preview,
  lattice,
  capabilities: capabilitiesProp,
  nodes: nodeRegistry = defaultNodeRegistry,
  links: linkRegistry = defaultLinkRegistry,
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
  shell: Shell = CanvasFrame,
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
  playback,
  generators = NO_GENERATORS,
  compileGenerator,
  createGeneratorWorker,
  hostKeys,
  onContextMenu: onHostContextMenu,
  children,
}: CanvasEngineProps) => {
  // A host that stores no theme choice still lets the viewer pick one, for this view alone.
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>();
  const shownTheme = chooseTheme(theme, themeChoice);
  const handleThemeChange = useCallback(
    (next: string | undefined) => (onThemeChange ? onThemeChange(next) : setThemeChoice({ theme: next })),
    [onThemeChange],
  );
  const { look, themeGrid } = useResolvedLook(themes, {
    theme: shownTheme,
    defaultTheme,
    styleSet,
    background,
    backgroundGrid,
  });
  const registry = useRegistry();
  const atoms = useMemo(() => atomsProp ?? createCanvasAtoms(root), [atomsProp, root]);
  const rootRef = useRef<HTMLDivElement>(null);
  const viewport = useViewport(rootRef);

  const path = useAtomValue(atoms.path);
  snapRef.current = () => registry.get(atoms.snap);
  const history = useCanvasHistory({ registry, atoms, store });
  const draw = useDrawScene({
    store,
    atoms,
    capabilities: capabilitiesProp,
    constrain: preview,
    lattice,
    history,
  });
  const scene = useAtomValue(draw.scene);
  const time = useAtomValue(atoms.clock.time);
  const generated = useGeneratorFrames({
    scene,
    time,
    sources: generators,
    compile: compileGenerator,
    createWorker: createGeneratorWorker,
  });
  useClock(atoms.clock, { duration: playback?.duration, loop: playback?.loop });
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

  // Every gesture, key and control is gated on these, so a read-only view is the scene with nothing allowed.
  const capabilities = readonly ? readonlyCapabilities : draw.capabilities;

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
  const { minor, major, detent, snap, snapMinor, isClick, moveDelta } = useSceneSnap(grid, camera.zoom, snapEnabled);
  const fitTarget = useMemo(() => frame ?? fitFrame(scene), [frame, scene]);
  const { fitting, enterFit, exitFit } = useSceneView({
    registry,
    atoms,
    rootRef,
    viewport,
    interactedRef,
    path,
    camera,
    drag,
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
      draw,
      nodeRegistry,
      readonly,
      grid: { major, snap },
      viewport,
      inset,
      frame,
      camera: { animateTo, target: cameraTarget, setOpening },
      fit: { enterFit, exitFit, takeOver: () => (interactedRef.current = true) },
      look: { onThemeChange: handleThemeChange, onBackgroundGridChange },
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

  useExposedClock(registry, atoms.clock, playback, exportable);

  useSceneWheel({
    rootRef,
    interactedRef,
    exitFit,
    cancelAnimation,
    touchNavigation,
    setCamera,
  });

  const objectActions = useObjectActions({
    registry,
    atoms,
    store,
    draw,
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
    draw,
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
    draw,
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
    draw,
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
    editNode,
    exitEdit,
  });

  // Shortcuts belong to the canvas itself: keys typed into a control the view hosts (the properties
  // panel, a toolbar) bubble here too, and must not toggle debug or delete the selection.
  const onKeyDown = useCallback<typeof onSceneKey>(
    (event) => {
      const action = keyAction(event);
      if (action !== undefined && hostKeys?.has(action)) {
        return;
      }
      if (event.target === event.currentTarget) {
        onSceneKey(event);
      } else if (keyAction(event) === 'cancel' && registry.get(atoms.active) !== undefined) {
        // Escape out of a node's live content leaves it inert and the node selected, as a click outside would not.
        registry.set(atoms.active, undefined);
        rootRef.current?.focus();
      }
    },
    [onSceneKey, registry, atoms.active, hostKeys],
  );

  // A host with its own context menu opens it where the view's would have, after the view picked what lies under the
  // pointer; the view's menu never shows.
  useLayoutEffect(() => {
    if (menu && onHostContextMenu) {
      onHostContextMenu(menu.at, menu.kind === 'canvas' ? 'canvas' : 'element');
      closeMenu();
    }
  }, [menu, onHostContextMenu, closeMenu]);

  const { displayScene, blocked, landing, createFrame } = useGesturePreview({
    scene,
    drag,
    draw,
    minor,
    detent,
    createdNode,
  });

  const { handlers, onDoubleClick: onElementDoubleClick } = useElementHandlers({
    registry,
    atoms,
    nodeRegistry,
    draw,
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
  const timeAtoms = useMemo(() => ({ time: atoms.clock.time, playing: atoms.clock.playing }), [atoms]);
  const editingAtoms = useMemo(
    () => ({ editing: atoms.editing, active: atoms.active, clipboard: atoms.clipboard }),
    [atoms],
  );

  return (
    <CanvasServicesProvider
      registry={registry}
      controller={controller}
      atoms={atoms}
      store={store}
      root={root}
      draw={draw}
      capabilities={capabilities}
      readonly={readonly}
      transparent={transparent}
      onReadonlyChange={onReadonlyChange}
      nodeRegistry={nodeRegistry}
      linkRegistry={linkRegistry}
      grid={grid}
      fitting={fitting}
      document={documentCommands}
      objectActions={objectActions}
    >
      <CanvasLookProvider
        look={look}
        themes={themes}
        themeOverride={shownTheme}
        themeGrid={themeGrid}
        // The grid picker shows only when the host takes its changes; the theme picker always works.
        setTheme={controller.look.setTheme}
        setBackgroundGrid={onBackgroundGridChange && controller.look.setBackgroundGrid}
      >
        <CanvasTimeProvider atoms={timeAtoms} generated={generated}>
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
                <Shell classNames={classNames} transparent={transparent}>
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
                    style={
                      look.tone === 'light'
                        ? { ...LIGHT_MODE, ...NEU_STYLE, contain: 'strict' }
                        : { ...NEU_STYLE, contain: 'strict' }
                    }
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
                </Shell>
              </SceneLookContext.Provider>
            </CanvasGestureProvider>
          </CanvasEditingProvider>
        </CanvasTimeProvider>
      </CanvasLookProvider>
    </CanvasServicesProvider>
  );
};

CanvasEngine.displayName = 'CanvasEngine';
