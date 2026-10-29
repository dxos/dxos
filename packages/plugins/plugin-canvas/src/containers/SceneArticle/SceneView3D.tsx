//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as AppNode from '@dxos/app-toolkit/AppNode';
import { Entity, Obj } from '@dxos/echo';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { type VersionedSource, combinedSource, patchSource, recordChanges } from '@dxos/react-ui-canvas/headless';
import {
  CameraToolbar,
  DisplayPanel,
  FLOATING_BAR,
  InspectorPanel,
  InspectorSection,
  PropertiesEmpty,
  ReadonlyToggle,
  type ToolGroup,
  ToolRail,
  propertiesShown,
} from '@dxos/react-ui-canvas/scene';
import { Form } from '@dxos/react-ui-form';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import {
  Scene3DEditor,
  Scene3DView,
  type Tool3D,
  exportSTL,
  fitCamera,
  importMesh,
  loadManifold,
  zoomBy,
  zoomPercent,
} from '@dxos/react-ui-scene';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import {
  type LayoutIntent,
  Scene,
  bounds3D,
  copyElements,
  findLayout,
  pasteIntent,
  placesCycle,
  reachedObjects,
  resolveLayout3D,
} from '@dxos/scene';
import { mx } from '@dxos/ui-theme';
import { downloadBlob } from '@dxos/util';

import {
  applyLayoutIntent,
  canvasDocument,
  fragmentText,
  layoutSource,
  openScene,
  writeDocument,
  writeModelIntent,
} from '#model';
import { type Canvas } from '#types';

import { CanvasNamespace } from '../../namespace.ts';
import { LibraryPanel } from '../LibraryPanel/index.ts';
import { useSceneDocument } from '../SceneStage/index.ts';
import { type SessionHistory, isDocumentStep, sessionHistory } from './canvas-history.ts';
import {
  ELEMENT_FORM_FIELDS,
  ELEMENT_FORM_OVERRIDES,
  ElementForm,
  elementFormIntents,
  elementFormValues,
} from './element-form.ts';
import { SECTIONS_3D, grid3D, sceneChrome } from './scene-chrome.ts';
import { getSessionClipboard, nextPaste, pasteOffset, setSessionClipboard } from './scene-clipboard.ts';
import { TOOL_GROUPS_3D } from './tools-3d.ts';
import { useInspectorDock } from './use-inspector-dock.ts';
import { useScene3DView } from './use-scene3d-view.ts';
import { canvasViewAspect } from './view-state.ts';

export type SceneView3DProps = {
  canvas: Canvas.Canvas;
  role?: string;
  attendableId?: string;
};

/** Opens the browser's file picker for one mesh file; resolves undefined when nothing was picked. */
const pickMeshFile = (): Promise<File | undefined> =>
  new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.obj,.glb';
    input.onchange = () => resolve(input.files?.[0]);
    input.oncancel = () => resolve(undefined);
    input.click();
  });

/** The first id of the form `base-n` the layout does not use. */
const freeElementId = (document: Scene.SceneDocument | undefined, layout: string, base: string): string => {
  const elements = (document && findLayout(document, layout)?.elements) ?? {};
  let index = 1;
  while (elements[`${base}-${index}`]) {
    index++;
  }
  return `${base}-${index}`;
};

const isLayout3D = (value: unknown): value is Scene.Layout3D => Obj.instanceOf(Scene.Layout3D, value);

const sameTool = (left: Tool3D, right: Tool3D): boolean => JSON.stringify(left) === JSON.stringify(right);

const toolTestId = (entry: { tool: Tool3D }): string =>
  `canvas3d.tool.${typeof entry.tool === 'object' ? ('create' in entry.tool ? entry.tool.create : 'place') : entry.tool}`;

const THEMES = [
  { id: 'cad', key: 'theme.cad.label' },
  { id: 'presentation', key: 'theme.presentation.label' },
] as const;

/** How far one zoom step moves the camera, as the 2D canvas's zoom step. */
const ZOOM_STEP = 1.25;

const isTheme3D = (value: string | undefined): value is 'cad' | 'presentation' =>
  value === 'cad' || value === 'presentation';

const label = (key: string): [string, { ns: string }] => [key, { ns: CanvasNamespace.key }];

/**
 * A 3D canvas: its open `Scene3D`, edited with Scene3DEditor under the canvas's floating panels (tools, actions,
 * inspectors, display); every edit is a `LayoutIntent` written to the layout that owns the element, recorded for undo
 * and redo over every 3D layout the scene reaches. Outside an article it is a picture: no chrome and no grid.
 */
export const SceneView3D = ({ canvas, role, attendableId }: SceneView3DProps) => {
  const { t } = UiHooks.useTranslation(CanvasNamespace.key);
  const chrome = sceneChrome(role);
  const scene = openScene(canvas);
  const stored = Obj.instanceOf(Scene.Scene3D, scene) ? scene : undefined;
  const document = useSceneDocument(stored);
  const [tool, setTool] = useState<Tool3D>('select');
  const [selection, setSelection] = useState<string[]>([]);
  const [editing, setEditing] = useState<string>();
  const [notice, setNotice] = useState<string>();

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
    () => ({
      get current() {
        return sessionHistory(canvas);
      },
      set current(next: SessionHistory) {
        Object.assign(sessionHistory(canvas), next);
      },
    }),
    [canvas],
  );
  const [, setHistoryVersion] = useState(0);

  const handleIntent = useCallback(
    (layout: string, intent: LayoutIntent) => {
      const target = layouts.get(layout);
      if (!target) {
        return;
      }
      const [change] = recordChanges([source], () => applyLayoutIntent(target, intent));
      if (change) {
        history.current = { done: [...history.current.done, change], undone: [] };
        setHistoryVersion((version) => version + 1);
      }
    },
    [layouts, source],
  );
  const step = useCallback(
    (direction: 'undo' | 'redo') => {
      const { done, undone } = history.current;
      const change = direction === 'undo' ? done.at(-1) : undone.at(-1);
      if (!change) {
        return;
      }
      if (isDocumentStep(change)) {
        writeDocument(canvas, direction === 'undo' ? change.before : change.after);
      } else {
        direction === 'undo'
          ? patchSource(source, { from: change.after, to: change.before, paths: change.paths })
          : patchSource(source, { from: change.before, to: change.after, paths: change.paths });
      }
      history.current =
        direction === 'undo'
          ? { done: done.slice(0, -1), undone: [...undone, change] }
          : { done: [...done, change], undone: undone.slice(0, -1) };
      setHistoryVersion((version) => version + 1);
    },
    [source, canvas],
  );

  // The orbit, grid and look are this viewer's own view; the scene's camera and theme are the authored ones.
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
  const authored = stored?.camera;
  const current = view.camera ?? authored;
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  // The camera bar moves only this viewer's view, never the scene's authored camera.
  const cameraActions = useMemo(
    () =>
      current && authored
        ? {
            fit: () => {
              const layout = document?.layouts.find((layout) => layout.id === (editing ?? document.scenes[0]?.layout));
              const elements = document && layout?.dim === '3d' ? resolveLayout3D(document, layout) : {};
              view.onCameraChange(fitCamera(current, bounds3D(elements), viewport));
            },
            fitting: false,
            zoomReset: () => view.onCameraChange(authored),
            zoomIn: () => view.onCameraChange(zoomBy(current, 1 / ZOOM_STEP)),
            zoomOut: () => view.onCameraChange(zoomBy(current, ZOOM_STEP)),
          }
        : undefined,
    [current, authored, document, editing, viewport, view.onCameraChange],
  );
  const theme = view.theme ?? (isTheme3D(authoredTheme) ? authoredTheme : 'cad');

  const editingLayout = editing ?? document?.scenes[0]?.layout;
  const record = document?.layouts.find((layout) => layout.id === editingLayout);
  const selected = selection.length === 1 && record?.dim === '3d' ? record.elements[selection[0]] : undefined;
  const resolved =
    selected && document && record?.dim === '3d' ? resolveLayout3D(document, record)[selected.id] : undefined;

  // The clipboard: the selection as a fragment (kept for this session) and as `.dx` text on the system clipboard.
  const copy = useCallback((): boolean => {
    if (!document || !record || record.dim !== '3d' || selection.length === 0) {
      return false;
    }
    const fragment = copyElements(record, selection);
    const text = fragmentText(document, record, fragment);
    setSessionClipboard({ fragment, text, pasted: 0 });
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    return true;
  }, [document, record, selection]);
  const pasteFrom = useCallback(
    (text: string | undefined) => {
      const layout = editingLayout;
      const next = nextPaste(getSessionClipboard(), text, '3d');
      if (!layout || !record || !document || !next) {
        return;
      }
      const taken = new Set(Object.keys(record.elements));
      const paste = pasteIntent(record, next.fragment, {
        offset: pasteOffset(next.pasted, '3d'),
        newId: (prefix) => {
          let index = 1;
          while (taken.has(`${prefix}-${index}`)) {
            index++;
          }
          taken.add(`${prefix}-${index}`);
          return `${prefix}-${index}`;
        },
        refuses: (object) => placesCycle(document, layout, object),
      });
      if (!paste) {
        setNotice(t('paste.refused.message'));
        return;
      }
      setSessionClipboard(next);
      handleIntent(layout, paste.intent);
      setSelection(paste.ids);
    },
    [editingLayout, record, document, handleIntent, t],
  );
  const paste = useCallback(() => {
    // Read the system clipboard when it can be, so text copied elsewhere pastes; the session's copy otherwise.
    const read = navigator.clipboard?.readText?.() ?? Promise.resolve(undefined);
    void read.then(
      (text) => pasteFrom(text),
      () => pasteFrom(undefined),
    );
  }, [pasteFrom]);
  const cut = useCallback(() => {
    if (editingLayout && copy()) {
      handleIntent(editingLayout, { kind: 'delete', ids: selection });
      setSelection([]);
    }
  }, [editingLayout, copy, handleIntent, selection]);
  const duplicate = useCallback(() => {
    if (copy()) {
      pasteFrom(undefined);
    }
  }, [copy, pasteFrom]);

  // The canvas model is the Library; extracting a selection makes a composite object of it.
  const modelId = document?.models[0]?.id;
  const objects = useMemo(() => Object.values(document?.models[0]?.objects ?? {}), [document]);

  // A mesh is defined once in the model and then placed, so placing it again stores no more triangles.
  const onImportMesh = useCallback(async () => {
    const file = await pickMeshFile();
    if (!file || modelId === undefined) {
      return;
    }
    const exit = await Effect.runPromiseExit(importMesh(file));
    if (exit._tag !== 'Success') {
      setNotice(`Could not import "${file.name}".`);
      return;
    }
    const taken = new Set(Object.keys(document?.models.find((model) => model.id === modelId)?.objects ?? {}));
    let id = exit.value.id;
    for (let index = 2; taken.has(id); index++) {
      id = `${exit.value.id}-${index}`;
    }
    const problems = writeModelIntent(canvas, { kind: 'define', model: modelId, object: { ...exit.value, id } });
    if (problems.length > 0) {
      setNotice(problems.map(({ message }) => message).join(' '));
      return;
    }
    setNotice(undefined);
    setTool({ place: id });
  }, [canvas, document, modelId]);

  // The selection as drawn, or every visible element when nothing is selected.
  const onExportSTL = useCallback(async () => {
    const layout = editing ?? document?.scenes[0]?.layout;
    if (!document || !layout) {
      return;
    }
    const wasm = await loadManifold();
    const buffer = exportSTL(document, layout, selection.length > 0 ? selection : undefined, wasm);
    await downloadBlob(new Blob([buffer], { type: 'model/stl' }), `${layout}.stl`);
  }, [document, editing, selection]);

  const menu = useMenuBuilder(() => {
    const builder = MenuBuilder.make();
    const layout = editingLayout;
    builder
      .action(
        'cut',
        {
          label: label('cut.label'),
          icon: 'ph--scissors--regular',
          disabled: selection.length === 0,
          disposition: 'toolbar',
          testId: 'canvas3d.cut',
        },
        cut,
      )
      .action(
        'copy',
        {
          label: label('copy.label'),
          icon: 'ph--copy--regular',
          disabled: selection.length === 0,
          disposition: 'toolbar',
          testId: 'canvas3d.copy',
        },
        () => void copy(),
      )
      .action(
        'paste',
        {
          label: label('paste.label'),
          icon: 'ph--clipboard--regular',
          disposition: 'toolbar',
          testId: 'canvas3d.paste',
        },
        paste,
      )
      .action(
        'duplicate',
        {
          label: label('duplicate.label'),
          icon: 'ph--copy-simple--regular',
          disabled: selection.length === 0,
          disposition: 'toolbar',
          testId: 'canvas3d.duplicate',
        },
        duplicate,
      )
      .separator()
      .action(
        'group',
        {
          label: label('group.label'),
          icon: 'ph--selection-plus--regular',
          disabled: selection.length < 2,
          disposition: 'toolbar',
          testId: 'canvas3d.group',
        },
        () => {
          if (layout) {
            const id = `group-${Date.now().toString(36)}`;
            handleIntent(layout, { kind: 'group', id, members: selection });
            setSelection([id]);
          }
        },
      )
      .action(
        'ungroup',
        {
          label: label('ungroup.label'),
          icon: 'ph--selection-slash--regular',
          disabled: resolved?.kind !== 'group',
          disposition: 'toolbar',
          testId: 'canvas3d.ungroup',
        },
        () => {
          if (layout && selected) {
            handleIntent(layout, { kind: 'ungroup', id: selected.id });
            setSelection([]);
          }
        },
      )
      .action(
        'delete',
        {
          label: label('delete.label'),
          icon: 'ph--trash--regular',
          disabled: selection.length === 0,
          disposition: 'toolbar',
          testId: 'canvas3d.delete',
        },
        () => {
          if (layout) {
            handleIntent(layout, { kind: 'delete', ids: selection });
            setSelection([]);
          }
        },
      )
      .action(
        'join',
        {
          label: label('join.label'),
          icon: 'ph--unite--regular',
          disabled: selection.length < 2,
          disposition: 'toolbar',
          testId: 'canvas3d.join',
        },
        () => {
          if (layout) {
            const id = freeElementId(document, layout, 'union');
            handleIntent(layout, { kind: 'join', id, operands: selection });
            setSelection([id]);
          }
        },
      )
      .action(
        'subtract',
        {
          label: label('subtract.label'),
          icon: 'ph--subtract--regular',
          // The first selected is the base, the second the tool cut from it.
          disabled: selection.length !== 2,
          disposition: 'toolbar',
          testId: 'canvas3d.subtract',
        },
        () => {
          if (layout && selection.length === 2) {
            const id = freeElementId(document, layout, 'difference');
            handleIntent(layout, { kind: 'subtract', id, base: selection[0], tool: selection[1] });
            setSelection([id]);
          }
        },
      )
      .action(
        'make-object',
        {
          label: label('make-object.label'),
          icon: 'ph--package--regular',
          disabled: selection.length === 0 || modelId === undefined,
          disposition: 'toolbar',
          testId: 'canvas3d.make-object',
        },
        () => {
          if (layout && modelId !== undefined) {
            const taken = new Set(Object.keys(document?.models.find((model) => model.id === modelId)?.objects ?? {}));
            let index = 1;
            while (taken.has(`object-${index}`)) {
              index++;
            }
            const id = `object-${index}`;
            const before = canvasDocument(canvas);
            const problems = writeModelIntent(canvas, {
              kind: 'extract',
              model: modelId,
              layout,
              ids: selection,
              object: { id, kind: 'sphere' },
            });
            if (problems.length > 0) {
              setNotice(problems.map(({ message }) => message).join(' '));
              return;
            }
            setNotice(undefined);
            setSelection([]);
            // One undo step: writing back the document from before the edit undoes it.
            history.current = {
              done: [...history.current.done, { kind: 'document', before, after: canvasDocument(canvas) }],
              undone: [],
            };
            setHistoryVersion((version) => version + 1);
            setHistoryVersion((version) => version + 1);
          }
        },
      )
      .separator()
      .action(
        'import-mesh',
        {
          label: label('import-mesh.label'),
          icon: 'ph--upload-simple--regular',
          disabled: modelId === undefined,
          disposition: 'toolbar',
          testId: 'canvas3d.import-mesh',
        },
        () => void onImportMesh().catch((error) => setNotice(`Could not import the mesh: ${String(error)}`)),
      )
      .action(
        'export-stl',
        {
          label: label('export-stl.label'),
          icon: 'ph--download-simple--regular',
          disposition: 'toolbar',
          testId: 'canvas3d.export-stl',
        },
        () => void onExportSTL().catch((error) => setNotice(`Could not export STL: ${String(error)}`)),
      )
      .separator()
      .action(
        'undo',
        {
          label: label('undo.label'),
          icon: 'ph--arrow-counter-clockwise--regular',
          disabled: history.current.done.length === 0,
          disposition: 'toolbar',
          testId: 'canvas3d.undo',
        },
        () => step('undo'),
      )
      .action(
        'redo',
        {
          label: label('redo.label'),
          icon: 'ph--arrow-clockwise--regular',
          disabled: history.current.undone.length === 0,
          disposition: 'toolbar',
          testId: 'canvas3d.redo',
        },
        () => step('redo'),
      );
    return builder.build();
  }, [
    selection,
    editingLayout,
    resolved,
    selected,
    handleIntent,
    step,
    history.current,
    modelId,
    document,
    canvas,
    onImportMesh,
    onExportSTL,
  ]);

  const handleSave = useCallback(
    (values: ElementForm) => {
      if (!editingLayout || !selected) {
        return;
      }
      const intents = elementFormIntents(selected, values);
      intents.length > 0 && handleIntent(editingLayout, { kind: 'batch', intents });
    },
    [editingLayout, selected, handleIntent],
  );

  // Locked, the rail keeps only the tools that look: select and orbit.
  const toolGroups = useMemo<ToolGroup<Tool3D>[]>(
    () =>
      TOOL_GROUPS_3D.filter((group) => !readonly || group.name === 'Tools').map((group) => ({
        name: group.name,
        collapsible: group.name === 'Make',
        entries: group.entries.map((entry) => ({
          tool: entry.tool,
          icon: entry.icon,
          label: t(`tool.${entry.id}.label`),
        })),
      })),
    [t, readonly],
  );
  const themes = useMemo(() => THEMES.map(({ id, key }) => ({ id, name: t(key) })), [t]);

  // The app's edit commands and the same shortcuts as 2D, on the whole article; typing in a field keeps its own.
  const [element, setElement] = useState<HTMLElement | null>(null);
  // Whether the last press was in this article; kept across the effect's re-runs as the selection changes.
  const pressedInside = useRef(false);
  useEffect(() => {
    if (!element || !chrome.editing) {
      return;
    }
    const editable = () => !readonly;
    const unregister = AppNode.registerEditCommands(element, {
      undo: { run: () => step('undo'), enabled: () => editable() && history.current.done.length > 0 },
      redo: { run: () => step('redo'), enabled: () => editable() && history.current.undone.length > 0 },
      cut: { run: cut, enabled: () => editable() && selection.length > 0 },
      copy: { run: () => void copy(), enabled: () => selection.length > 0 },
      paste: { run: paste, enabled: editable },
    });
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (typing || !(event.metaKey || event.ctrlKey) || event.altKey) {
        return;
      }
      const key = event.key.toLowerCase();
      const command =
        key === 'c'
          ? () => void copy()
          : key === 'x' && editable()
            ? cut
            : key === 'v' && editable()
              ? paste
              : key === 'd' && editable()
                ? duplicate
                : key === 'z' && editable()
                  ? () => step(event.shiftKey ? 'redo' : 'undo')
                  : undefined;
      if (command) {
        event.preventDefault();
        command();
      }
    };
    // Shortcuts follow the last press in the article, so they still work once a clicked control drops focus to the
    // page (a toolbar button disabled by its own action).
    const onPointerDown = (event: PointerEvent) => {
      pressedInside.current = event.target instanceof Node && element.contains(event.target);
    };
    const onWindowKeyDown = (event: KeyboardEvent) => {
      const focus = globalThis.document.activeElement;
      pressedInside.current &&
        (focus === null || focus === globalThis.document.body || element.contains(focus)) &&
        onKeyDown(event);
    };
    window.addEventListener('pointerdown', onPointerDown, { capture: true });
    window.addEventListener('keydown', onWindowKeyDown);
    return () => {
      unregister();
      window.removeEventListener('pointerdown', onPointerDown, { capture: true });
      window.removeEventListener('keydown', onWindowKeyDown);
    };
  }, [element, chrome.editing, readonly, selection, cut, copy, paste, duplicate, step]);

  if (!stored || !document) {
    return null;
  }

  // A card, section or slide shows the scene as a picture: the authored view, no chrome and no grid.
  if (!chrome.editing) {
    return (
      <Panel.Root role={role}>
        <Panel.Body>
          <Scene3DView document={document} scene={stored.key} theme={theme} grid={false} orbit={false} />
        </Panel.Body>
      </Panel.Root>
    );
  }

  return (
    <Panel.Root role={role} ref={setElement}>
      <Panel.Body>
        <InspectorPanel.Root docked={!readonly && dock.docked} readonly={readonly} onDockedChange={dock.onDockedChange}>
          <InspectorPanel.Frame>
            <Scene3DEditor
              document={document}
              scene={stored.key}
              editing={editing}
              selection={selection}
              tool={tool}
              readonly={readonly}
              theme={theme}
              grid={grid3D(role, view.grid)}
              // Snapping follows the grid, as in 2D: no grid, no snap.
              snap={grid3D(role, view.grid)}
              onSelect={setSelection}
              onIntent={handleIntent}
              onEdit={(layout) => setEditing(layout === document.scenes[0]?.layout ? undefined : layout)}
              camera={view.camera}
              onCameraChange={view.onCameraChange}
              onResize={setViewport}
            >
              {/* The floating panels, placed as the 2D canvas places its own. */}
              <div className='absolute top-2 bottom-14 left-2 pointer-events-none'>
                <ToolRail
                  groups={toolGroups}
                  tool={tool}
                  same={sameTool}
                  testId={toolTestId}
                  groupEnd={{ Tools: <ReadonlyToggle readonly={readonly} onReadonlyChange={handleReadonlyChange} /> }}
                  onToolChange={setTool}
                />
              </div>
              {/* Every action here edits the scene, so a locked canvas shows none, as the 2D canvas does. */}
              {!readonly && (
                <div className='absolute w-max bottom-2 left-1/2 -translate-x-1/2'>
                  <ActionToolbar {...menu} classNames={FLOATING_BAR} attendableId={attendableId} />
                </div>
              )}
              {cameraActions && current && authored && (
                <div className='absolute w-max bottom-2 left-2'>
                  <CameraToolbar actions={cameraActions}>{zoomPercent(current, authored)}%</CameraToolbar>
                </div>
              )}
              <div className='absolute w-max bottom-2 right-2'>
                <DisplayPanel
                  theme={themes.find((option) => option.id === theme) ?? themes[0]}
                  themes={themes}
                  override={view.theme}
                  onThemeChange={(id) => view.onThemeChange(isTheme3D(id) ? id : undefined)}
                  grid={view.grid ? 'lines' : 'none'}
                  gridOptions={['lines']}
                  onGridChange={(grid) => view.onGridChange(grid === 'lines')}
                />
              </div>
              {notice && (
                <p
                  role='alert'
                  className={mx('absolute top-2 left-1/2 -translate-x-1/2 text-sm text-error-text', FLOATING_BAR)}
                  data-testid='canvas3d.notice'
                >
                  {notice}
                </p>
              )}
            </Scene3DEditor>
          </InspectorPanel.Frame>
          {!selected && propertiesShown({ docked: !readonly && dock.docked, selected: false }) === 'empty' && (
            <PropertiesEmpty />
          )}
          {selected && (
            <InspectorSection section={{ ...SECTIONS_3D.properties, title: t('properties.label') }}>
              <Form.Root
                key={selected.id}
                schema={ElementForm}
                values={elementFormValues(selected)}
                fieldMap={ELEMENT_FORM_FIELDS}
                fieldOverrides={ELEMENT_FORM_OVERRIDES}
                readonly={readonly}
                autoSave
                onSave={handleSave}
              >
                <Form.Viewport scroll={false}>
                  <Form.Content>
                    <Form.Fields />
                  </Form.Content>
                </Form.Viewport>
              </Form.Root>
            </InspectorSection>
          )}
          <InspectorSection section={{ ...SECTIONS_3D.library, title: t('library.label') }}>
            <LibraryPanel
              objects={objects}
              readonly={readonly}
              placing={typeof tool === 'object' && 'place' in tool ? tool.place : undefined}
              onPlace={(id) => setTool({ place: id })}
              onEditParts={(layout) => {
                setSelection([]);
                setEditing(layout);
              }}
            />
          </InspectorSection>
        </InspectorPanel.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

SceneView3D.displayName = 'SceneView3D';
