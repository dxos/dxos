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
import { type ActiveTool, createEditorStore } from './store.ts';

/** The rail's group for each tool category, as 2D's rail names them. */
const CATEGORY_GROUPS: Readonly<Record<ToolCategory, string>> = {
  select: TOOLS_GROUP,
  transform: 'Transform',
  create: CREATE_GROUP,
};

/** How far one camera-bar zoom step moves the camera, in both dimensions. */
const ZOOM_STEP = 1.25;

/** Whether a role edits the scene: only the article (or no role, in a story); a card, section or slide is a picture. */
export const editsInRole = (role: string | undefined): boolean => role === undefined || role === 'article';

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
  const shown = useMemo(() => withoutHidden(document), [document]);
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

  const [, setHistoryVersion] = useState(0);
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
              zoomReset: () => onCameraChange(authoredCamera),
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
        grid={editing && display.grid}
        snap={editing && display.snap}
        theme={display.theme}
        face={face}
        camera={viewerCamera}
        onSelect={store.select}
        onIntent={onIntent}
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
    const byCategory = new Map<ToolCategory, ToolDef[]>();
    for (const def of config.tools) {
      (!readonly || def.category === 'select') &&
        byCategory.set(def.category, [...(byCategory.get(def.category) ?? []), def]);
    }
    return [...byCategory.entries()].map(([category, defs]) => ({
      name: CATEGORY_GROUPS[category],
      collapsible: category === 'create',
      entries: defs.map((def) => ({
        tool: { id: def.id },
        icon: def.icon,
        label: def.label,
        ...(def.key ? { key: def.key } : {}),
      })),
    }));
  }, [config.tools, readonly]);
  return (
    <div className={mx('absolute pointer-events-none', classNames)}>
      <ToolRail
        groups={groups}
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
    commands.commands.filter((command) => !shared.has(command.id)),
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

export const SceneEditor = {
  Root: SceneEditorRoot,
  Viewport: SceneEditorViewport,
  Tools: SceneEditorTools,
  Actions: SceneEditorActions,
  Camera: SceneEditorCamera,
  Display: SceneEditorDisplay,
  ContextMenu: SceneEditorContextMenu,
  Notice: SceneEditorNotice,
};
