//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, {
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { type Timeline, keyTimes, timelineFps } from '@dxos/animation';
import { TimelineBar } from '@dxos/react-ui-animation';
import * as Button from '@dxos/react-ui/Button';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { type Layer, type LayoutIntent, type ModelIntent, type Scene, findLayout, resolveLayout } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import {
  CameraToolbar,
  DisplayPanel,
  InspectorPanel,
  ReadonlyToggle,
  type SceneChoice,
  SceneContextMenu,
  ToolRail,
} from '../components/index.ts';
import { CREATE_GROUP, FLOATING_BAR, type ToolGroup, TOOLS_GROUP } from '../utils/index.ts';
import { copyFragment, getSessionClipboard, pasteInto, setSessionClipboard } from './clipboard.ts';
import { SHARED_COMMANDS, buildCommands } from './commands.ts';
import { type ClipboardCodec, type DimensionConfig, type ToolCategory, type ToolDef } from './config.ts';
import { type EditorDisplay, SceneEditorProvider, useSceneEditor } from './context.ts';
import { type History } from './history.ts';
import { withoutHidden } from './scene-rows.ts';
import { SceneEditorInspector } from './sections.tsx';
import { type ActiveTool, createEditorStore } from './store.ts';
import { type EditorShot, keySelection, placementFields, sampleDocument } from './timeline.ts';

/** The rail's group for each tool category, as 2D's rail names them. */
const CATEGORY_GROUPS: Readonly<Record<ToolCategory, string>> = {
  select: TOOLS_GROUP,
  transform: 'Transform',
  create: CREATE_GROUP,
};

/** A new shot's length, in seconds, before the animator changes it. */
const DEFAULT_SHOT_SECONDS = 5;

/** How far one camera-bar zoom step moves the camera, in both dimensions. */
const ZOOM_STEP = 1.25;

/**
 * Whether a role edits the scene: only the article (`article`, or a namespaced `….article`), or no role (a story); a
 * card, section or slide is a picture.
 */
export const editsInRole = (role: string | undefined): boolean =>
  role === undefined || role.split('.').at(-1) === 'article';

export type SceneEditorRootProps<C> = PropsWithChildren<{
  config: DimensionConfig<C>;
  document: Scene.SceneDocument;
  scene: string;
  role?: string;
  readonly?: boolean;
  onReadonlyChange?: (readonly: boolean) => void;
  /** Writes an edit to the document; the root records it in `history`. */
  onIntent: (layout: string, intent: LayoutIntent) => void;
  history?: History;
  /** Writes a model edit; returns its problems. Recorded as one step when `readDocument` is given. */
  onModelIntent?: (intent: ModelIntent) => readonly string[];
  /** The document as stored now, read either side of a model edit for its undo step. */
  readDocument?: () => Scene.SceneDocument;
  onLayersChange?: (layout: string, layers: readonly Layer[]) => void;
  /** The `.dx` text a copy writes and a paste reads. */
  codec?: ClipboardCodec;
  display: EditorDisplay;
  onDisplayChange?: (display: Partial<EditorDisplay>) => void;
  /** This viewer's camera, undefined until they move it; `authoredCamera` is the scene's own. */
  camera?: C;
  authoredCamera?: C;
  onCameraChange?: (camera: C) => void;
  docked?: boolean;
  onDockedChange?: (docked: boolean) => void;
  sceneChoice?: SceneChoice;
  /** The shots staging the scene, for the Timeline panel. */
  shots?: readonly EditorShot[];
  /** Writes a shot's timeline; an undefined shot id makes a new shot staging the scene. */
  onShotChange?: (shot: string | undefined, timeline: Timeline) => void;
}>;

/**
 * The shared scene editor (decision 2): one store, command table, history, clipboard, lock and role handling for both
 * dimensions, with the dimension's viewport, tools, geometry, camera, display and property form from `config`. In a
 * card, section or slide it draws the viewport alone, as a picture.
 */
const SceneEditorRoot = <C,>({
  config,
  document,
  scene,
  role,
  readonly: readonlyProp = false,
  onReadonlyChange,
  onIntent: write,
  history,
  onModelIntent: writeModel,
  readDocument,
  onLayersChange,
  codec,
  display,
  onDisplayChange,
  camera: viewerCamera,
  authoredCamera,
  onCameraChange,
  docked = false,
  onDockedChange,
  sceneChoice,
  shots,
  onShotChange,
  children,
}: SceneEditorRootProps<C>) => {
  const registry = useContext(RegistryContext);
  const editing = editsInRole(role);
  const readonly = readonlyProp || !editing;
  const onIntent = useCallback(
    (layout: string, intent: LayoutIntent) =>
      history ? history.record(() => write(layout, intent)) : write(layout, intent),
    [history, write],
  );
  const store = useMemo(() => createEditorStore(registry, { onIntent }), [registry, onIntent]);
  const selection = useAtomValue(store.atoms.selection);
  const path = useAtomValue(store.atoms.editing);
  const tool = useAtomValue(store.atoms.tool);
  const face = useAtomValue(store.atoms.face);

  const sceneRecord = document.scenes.find((record) => record.id === scene);
  const rootLayout = sceneRecord?.layout;
  const layout = path.at(-1) ?? rootLayout;
  // While the Timeline panel's playhead is off the start (or it plays), the viewport draws the shot sampled there.
  const shotId = useAtomValue(store.atoms.shot);
  const time = useAtomValue(store.atoms.time);
  const playing = useAtomValue(store.atoms.playing);
  const shotTimeline = (shots?.find((shot) => shot.id === shotId) ?? shots?.[0])?.timeline;
  const shown = useMemo(() => {
    const visible = withoutHidden(document);
    return shotTimeline && layout !== undefined && (playing || time > 0)
      ? sampleDocument(visible, layout, shotTimeline, time)
      : visible;
  }, [document, shotTimeline, layout, playing, time]);
  const model = document.models[0]?.id;
  const record = layout === undefined ? undefined : findLayout(document, layout);
  const selected = selection.length === 1 ? record?.elements[selection[0]] : undefined;
  const selectedType = selected && record ? resolveLayout(document, record)[selected.id]?.type : undefined;

  const onModelIntent = useCallback(
    (intent: ModelIntent): readonly string[] => {
      if (!writeModel) {
        return [];
      }
      const before = readDocument?.();
      const problems = writeModel(intent);
      problems.length === 0 && before && readDocument && history?.recordDocument(before, readDocument());
      store.setNotice(problems.length > 0 ? problems.join(' ') : undefined);
      return problems;
    },
    [writeModel, readDocument, history, store],
  );

  // The clipboard: the selection as a fragment kept for this session, and as `.dx` text on the system clipboard.
  const copy = useCallback((): boolean => {
    const copied = codec && layout && copyFragment(codec, document, layout, selection);
    if (!copied) {
      return false;
    }
    setSessionClipboard(copied);
    void globalThis.navigator?.clipboard?.writeText(copied.text).catch(() => undefined);
    return true;
  }, [codec, document, layout, selection]);
  const pasteFrom = useCallback(
    (text: string | undefined) => {
      if (!codec || !layout) {
        return;
      }
      const result = pasteInto({
        codec,
        document,
        layout,
        copied: getSessionClipboard(),
        text,
        offset: config.geometry.pasteOffset,
      });
      if (result.kind === 'refused') {
        store.setNotice('An object cannot be pasted inside its own parts.');
      } else if (result.kind === 'paste') {
        setSessionClipboard(result.clipboard);
        onIntent(layout, result.intent);
        store.select(result.ids);
      }
    },
    [codec, layout, document, config.geometry, onIntent, store],
  );

  // Undo and redo change the history's stacks, which the command states read.
  const [historyVersion, setHistoryVersion] = useState(0);
  const commands = useMemo(() => {
    const deleteSelection = () => {
      if (layout) {
        onIntent(layout, { kind: 'delete', ids: selection });
        store.select([]);
      }
    };
    return buildCommands({
      state: {
        readonly,
        selection,
        canUndo: history?.canUndo ?? false,
        canRedo: history?.canRedo ?? false,
        canUngroup: selectedType === 'group',
        canMakeObject: model !== undefined && writeModel !== undefined,
      },
      run: {
        'undo': () => {
          history?.undo();
          setHistoryVersion((version) => version + 1);
        },
        'redo': () => {
          history?.redo();
          setHistoryVersion((version) => version + 1);
        },
        'cut': () => copy() && deleteSelection(),
        'copy': () => void copy(),
        'paste': () => {
          // The system clipboard first, so text copied elsewhere pastes; the session's copy otherwise.
          const read = globalThis.navigator?.clipboard?.readText?.() ?? Promise.resolve(undefined);
          void read.then(
            (text) => pasteFrom(text),
            () => pasteFrom(undefined),
          );
        },
        'duplicate': () => copy() && pasteFrom(undefined),
        'delete': deleteSelection,
        'group': () => {
          if (layout && model !== undefined) {
            const id = `group-${Date.now().toString(36)}`;
            onModelIntent({ kind: 'group', model, layout, id, members: selection }).length === 0 && store.select([id]);
          }
        },
        'ungroup': () => {
          if (layout && model !== undefined && selected) {
            onModelIntent({ kind: 'ungroup', model, layout, id: selected.id }).length === 0 && store.select([]);
          }
        },
        'make-object': () => {
          const objects = document.models[0]?.objects ?? {};
          let index = 1;
          while (objects[`object-${index}`]) {
            index++;
          }
          if (layout && model !== undefined) {
            onModelIntent({
              kind: 'extract',
              model,
              layout,
              ids: selection,
              object: { id: `object-${index}`, type: config.dim === '3d' ? 'sphere' : 'rect' },
            }).length === 0 && store.select([]);
          }
        },
      },
      extras: (config.commands ?? []).map((extra) => ({
        id: extra.id,
        label: extra.label,
        icon: extra.icon,
        enabled: (state) => extra.enabled(state),
        run: () => {
          if (!layout) {
            return;
          }
          void Promise.resolve(
            extra.run({
              document,
              layout,
              selection,
              onIntent,
              onModelIntent,
              select: store.select,
              setTool: store.setTool,
              notify: store.setNotice,
            }),
          ).catch((error) => store.setNotice(String(error)));
        },
      })),
    });
  }, [
    readonly,
    selection,
    history,
    historyVersion,
    selected,
    selectedType,
    layout,
    model,
    writeModel,
    copy,
    pasteFrom,
    onIntent,
    onModelIntent,
    store,
    document,
    config,
  ]);

  // The camera bar moves only this viewer's view, never the scene's authored camera.
  const [size, setSize] = useState({ width: 0, height: 0 });
  const current = viewerCamera ?? authoredCamera;
  const camera = useMemo(
    () =>
      current !== undefined && authoredCamera !== undefined && onCameraChange
        ? {
            actions: {
              fit: () => layout && onCameraChange(config.camera.fit(current, document, layout, size)),
              fitting: false,
              zoomReset: () =>
                onCameraChange(layout ? config.camera.reset(authoredCamera, document, layout, size) : authoredCamera),
              zoomIn: () => onCameraChange(config.camera.zoom(current, 1 / ZOOM_STEP)),
              zoomOut: () => onCameraChange(config.camera.zoom(current, ZOOM_STEP)),
            },
            percent: config.camera.percent(current, authoredCamera),
          }
        : undefined,
    [current, authoredCamera, onCameraChange, config.camera, layout, document, size],
  );

  const Viewport = config.viewport;
  const renderViewport = useCallback(
    (overlay: ReactNode) => (
      <Viewport
        document={shown}
        scene={scene}
        editing={path.at(-1)}
        selection={selection}
        tool={tool}
        readonly={readonly}
        picture={!editing}
        grid={editing && display.grid}
        snap={editing && display.snap}
        axes={editing && (display.axes ?? false)}
        guides={editing && (display.guides ?? false)}
        theme={display.theme}
        face={face}
        camera={viewerCamera}
        onSelect={store.select}
        onToolChange={store.setTool}
        onIntent={onIntent}
        onModelIntent={writeModel ? onModelIntent : undefined}
        onPreview={store.preview}
        onEdit={(next) => store.open(next === undefined || next === rootLayout ? [] : [rootLayout ?? '', next])}
        onContextMenu={(at, kind) => store.setMenu({ at, kind })}
        onFaceChange={store.setFace}
        onCameraChange={onCameraChange}
        onResize={setSize}
      >
        {overlay}
      </Viewport>
    ),
    [
      Viewport,
      shown,
      scene,
      path,
      selection,
      tool,
      readonly,
      editing,
      display,
      face,
      viewerCamera,
      store,
      onIntent,
      writeModel,
      onModelIntent,
      rootLayout,
      onCameraChange,
    ],
  );

  const { viewport: _viewport, camera: _camera, ...editorConfig } = config;
  return (
    <SceneEditorProvider
      config={editorConfig}
      document={document}
      shown={shown}
      scene={scene}
      rootLayout={rootLayout}
      layout={layout}
      store={store}
      readonly={readonly}
      onReadonlyChange={editing ? onReadonlyChange : undefined}
      commands={commands}
      history={history}
      onIntent={onIntent}
      onModelIntent={writeModel ? onModelIntent : undefined}
      onLayersChange={onLayersChange}
      display={display}
      onDisplayChange={onDisplayChange}
      camera={camera}
      docked={!readonly && docked}
      onDockedChange={onDockedChange}
      sceneChoice={sceneChoice}
      shots={shots}
      onShotChange={onShotChange}
      renderViewport={renderViewport}
    >
      {editing ? (
        <InspectorPanel.Root docked={!readonly && docked} readonly={readonly} onDockedChange={onDockedChange}>
          <EditorShortcuts />
          {children}
        </InspectorPanel.Root>
      ) : (
        renderViewport(null)
      )}
    </SceneEditorProvider>
  );
};

SceneEditorRoot.displayName = 'SceneEditor.Root';

/**
 * The editor's command shortcuts, on the whole window while the last press was inside the editor, so they still work
 * once a clicked control drops focus to the page; typing in a field keeps its own keys.
 */
const EditorShortcuts = () => {
  const { commands } = useSceneEditor('SceneEditor.Shortcuts');
  const [frame, setFrame] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const element = frame?.parentElement;
    if (!element) {
      return;
    }
    let inside = false;
    const onPointerDown = (event: PointerEvent) => {
      inside = event.target instanceof Node && element.contains(event.target);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const focus = globalThis.document.activeElement;
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (!inside || typing || !(focus === null || focus === globalThis.document.body || element.contains(focus))) {
        return;
      }
      // Delete is the viewport's own (it knows a face from an element); the chorded commands are the table's.
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }
      const command = commands.keyCommand(event);
      if (command) {
        event.preventDefault();
        command.run();
      }
    };
    window.addEventListener('pointerdown', onPointerDown, { capture: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, { capture: true });
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [frame, commands]);
  return <span ref={setFrame} hidden />;
};

/** The dimension's viewport, framed with the inspector panel; its children are the floating panels drawn over it. */
const SceneEditorViewport = ({ children }: PropsWithChildren) => {
  const { renderViewport } = useSceneEditor('SceneEditor.Viewport');
  return <InspectorPanel.Frame>{renderViewport(children)}</InspectorPanel.Frame>;
};

SceneEditorViewport.displayName = 'SceneEditor.Viewport';

const sameTool = (left: ActiveTool, right: ActiveTool): boolean => left.id === right.id && left.object === right.object;

/** The tool rail: the config's tools by category; locked, only the select-category tools stay. */
const SceneEditorTools = ({ classNames = 'top-2 bottom-14 left-2' }: { classNames?: string }) => {
  const { config, store, readonly, onReadonlyChange } = useSceneEditor('SceneEditor.Tools');
  const tool = useAtomValue(store.atoms.tool);
  const groups = useMemo<ToolGroup<ActiveTool>[]>(() => {
    // By rail group, in the order the tools first name them.
    const byGroup = new Map<string, { category: ToolCategory; defs: ToolDef[] }>();
    for (const def of config.tools) {
      const name = def.group ?? CATEGORY_GROUPS[def.category];
      if (!readonly || def.category === 'select') {
        const group = byGroup.get(name) ?? { category: def.category, defs: [] };
        byGroup.set(name, { ...group, defs: [...group.defs, def] });
      }
    }
    return [...byGroup.entries()].map(([name, { category, defs }]) => ({
      name,
      collapsible: category === 'create',
      entries: defs.map((def) => ({
        tool: { id: def.id },
        icon: def.icon,
        label: def.label,
        ...(def.key ? { key: def.key } : {}),
      })),
    }));
  }, [config.tools, readonly]);
  const dragData = useMemo(() => {
    const { toolDragData } = config;
    if (!toolDragData) {
      return undefined;
    }
    return (tool: ActiveTool) => {
      const def = config.tools.find((candidate) => candidate.id === tool.id);
      return def && toolDragData(def);
    };
  }, [config]);
  return (
    <div className={mx('absolute pointer-events-none', classNames)}>
      <ToolRail
        groups={groups}
        dragData={dragData}
        tool={tool}
        same={sameTool}
        testId={(entry) => `${config.dim === '3d' ? 'canvas3d' : 'canvas'}.tool.${entry.tool.id}`}
        groupEnd={
          onReadonlyChange
            ? { [TOOLS_GROUP]: <ReadonlyToggle readonly={readonly} onReadonlyChange={onReadonlyChange} /> }
            : undefined
        }
        onToolChange={store.setTool}
      />
    </div>
  );
};

SceneEditorTools.displayName = 'SceneEditor.Tools';

/** The actions bar: the command table's commands; locked, it hides, as every one edits the scene but Copy. */
const SceneEditorActions = ({ classNames = 'bottom-2 left-1/2 -translate-x-1/2' }: { classNames?: string }) => {
  const { commands, readonly } = useSceneEditor('SceneEditor.Actions');
  if (readonly) {
    return null;
  }
  const shared = new Set<string>(SHARED_COMMANDS);
  const groups = [
    commands.commands.filter((command) => shared.has(command.id) && command.id !== 'undo' && command.id !== 'redo'),
    commands.commands.filter((command) => !shared.has(command.id) && command.id !== 'import'),
    commands.commands.filter((command) => command.id === 'undo' || command.id === 'redo'),
  ].filter((group) => group.length > 0);
  return (
    <div className={mx('absolute w-max', classNames)}>
      <Toolbar.Root classNames={mx('w-full', FLOATING_BAR)} data-testid='scene-actions'>
        {groups.map((group, index) => (
          <React.Fragment key={index}>
            {index > 0 && <Toolbar.Separator variant='line' />}
            {group.map((command) => (
              <Button.Root
                key={command.id}
                variant='ghost'
                iconOnly
                icon={command.icon}
                label={command.shortcut ? `${command.label} (${command.shortcut})` : command.label}
                disabled={!command.enabled}
                data-testid={`scene-action-${command.id}`}
                onClick={command.run}
              />
            ))}
          </React.Fragment>
        ))}
      </Toolbar.Root>
    </div>
  );
};

SceneEditorActions.displayName = 'SceneEditor.Actions';

/** The camera bar: fit and zoom this viewer's view, beside the zoom as a percentage of the authored camera's. */
const SceneEditorCamera = ({ classNames = 'bottom-2 left-2' }: { classNames?: string }) => {
  const { camera } = useSceneEditor('SceneEditor.Camera');
  if (!camera) {
    return null;
  }
  return (
    <div className={mx('absolute w-max', classNames)}>
      <CameraToolbar actions={camera.actions}>
        {camera.percent === undefined ? null : `${camera.percent}%`}
      </CameraToolbar>
    </div>
  );
};

SceneEditorCamera.displayName = 'SceneEditor.Camera';

/** The display panel: the look (a default style catalog), the grid, snapping (apart from the grid) and 2D's guides. */
const SceneEditorDisplay = ({ classNames = 'bottom-2 right-2' }: { classNames?: string }) => {
  const { config, display, onDisplayChange, readonly } = useSceneEditor('SceneEditor.Display');
  const themes = useMemo(() => config.display.themes.map(({ id, label }) => ({ id, name: label })), [config.display]);
  return (
    <div className={mx('absolute w-max', classNames)}>
      <DisplayPanel
        readonly={readonly}
        theme={
          themes.find((option) => option.id === display.theme) ??
          themes[0] ?? { id: display.theme, name: display.theme }
        }
        themes={themes}
        override={display.themeOverride}
        onThemeChange={onDisplayChange && ((theme) => onDisplayChange({ themeOverride: theme }))}
        grid={display.grid ? (config.display.grids[0] ?? 'lines') : 'none'}
        gridOptions={config.display.grids}
        onGridChange={onDisplayChange && ((grid) => onDisplayChange({ grid: grid !== undefined && grid !== 'none' }))}
        snap={display.snap}
        onSnapToggle={onDisplayChange && (() => onDisplayChange({ snap: !display.snap }))}
        dim={config.dim}
        axes={display.axes}
        onAxesToggle={onDisplayChange && (() => onDisplayChange({ axes: !display.axes }))}
        guides={config.display.guides ? display.guides : undefined}
        onGuidesToggle={
          config.display.guides && onDisplayChange ? () => onDisplayChange({ guides: !display.guides }) : undefined
        }
      />
    </div>
  );
};

SceneEditorDisplay.displayName = 'SceneEditor.Display';

/** The right-click menu: the command table's items over an element or empty space. */
const SceneEditorContextMenu = () => {
  const { store, commands } = useSceneEditor('SceneEditor.ContextMenu');
  const menu = useAtomValue(store.atoms.menu);
  return (
    <SceneContextMenu
      at={menu?.at}
      items={menu ? commands.menuItems(menu.kind) : []}
      onCommand={(id) => commands.get(id)?.run()}
      onClose={() => store.setMenu(undefined)}
    />
  );
};

SceneEditorContextMenu.displayName = 'SceneEditor.ContextMenu';

/** The last command's message (a refused paste, a failed import). */
const SceneEditorNotice = () => {
  const { store } = useSceneEditor('SceneEditor.Notice');
  const notice = useAtomValue(store.atoms.notice);
  return notice ? (
    <p
      role='alert'
      className={mx('absolute top-2 left-1/2 -translate-x-1/2 text-sm text-error-text', FLOATING_BAR)}
      data-testid='scene-notice'
    >
      {notice}
    </p>
  ) : null;
};

SceneEditorNotice.displayName = 'SceneEditor.Notice';

/**
 * The Timeline panel (decision 16), shared by both dimensions: the shots staging the open scene, played and scrubbed
 * by sampling the shot into the viewport (never written), and keyed from the selection's animatable fields into the
 * shot's timeline; with no shot, the first key makes one.
 */
const SceneEditorTimeline = ({ classNames = 'bottom-14 left-1/2 -translate-x-1/2' }: { classNames?: string }) => {
  const { config, document, layout, store, readonly, shots, onShotChange } = useSceneEditor('SceneEditor.Timeline');
  const selection = useAtomValue(store.atoms.selection);
  const shotId = useAtomValue(store.atoms.shot);
  const time = useAtomValue(store.atoms.time);
  const playing = useAtomValue(store.atoms.playing);
  const registry = useContext(RegistryContext);
  const shot = shots?.find((entry) => entry.id === shotId) ?? shots?.[0];
  const timeline = shot?.timeline;
  const duration = timeline?.duration ?? DEFAULT_SHOT_SECONDS;
  const fps = timelineFps(timeline);
  const keys = useMemo(() => keyTimes(timeline, selection), [timeline, selection]);

  // Playback advances the playhead each frame and stops at the end.
  useEffect(() => {
    if (!playing) {
      return;
    }
    let last = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const next = registry.get(store.atoms.time) + (now - last) / 1000;
      last = now;
      if (next >= duration) {
        registry.set(store.atoms.time, duration);
        registry.set(store.atoms.playing, false);
        return;
      }
      registry.set(store.atoms.time, next);
      frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, duration, registry, store]);

  if (!shots || !onShotChange) {
    return null;
  }
  const key = () =>
    layout !== undefined &&
    onShotChange(
      shot?.id,
      keySelection({ timeline, document, layout, selection, t: time, fields: config.animatable ?? placementFields }),
    );
  return (
    <div className={mx('absolute w-max max-w-[calc(100%-2rem)] flex gap-1 items-center', classNames)}>
      {shots.length > 1 && (
        <Toolbar.Root classNames={FLOATING_BAR} data-testid='timeline-shots'>
          {shots.map((entry, index) => (
            <Button.Root
              key={entry.id}
              variant={entry.id === shot?.id ? 'primary' : 'ghost'}
              label={entry.name ?? `Shot ${index + 1}`}
              data-testid={`timeline-shot-${entry.id}`}
              onClick={() => store.setShot(entry.id)}
            />
          ))}
        </Toolbar.Root>
      )}
      <TimelineBar
        classNames={FLOATING_BAR}
        time={time}
        duration={duration}
        playing={playing}
        fps={fps}
        keys={keys}
        readonly={readonly}
        onPlayingChange={(next) => {
          next && time >= duration && store.setTime(0);
          store.setPlaying(next);
        }}
        onTimeChange={store.setTime}
        onAddKey={selection.length > 0 && !readonly ? key : undefined}
      />
    </div>
  );
};

SceneEditorTimeline.displayName = 'SceneEditor.Timeline';

export const SceneEditor = {
  Root: SceneEditorRoot,
  Inspector: SceneEditorInspector,
  Viewport: SceneEditorViewport,
  Tools: SceneEditorTools,
  Actions: SceneEditorActions,
  Camera: SceneEditorCamera,
  Display: SceneEditorDisplay,
  ContextMenu: SceneEditorContextMenu,
  Notice: SceneEditorNotice,
  Timeline: SceneEditorTimeline,
};
