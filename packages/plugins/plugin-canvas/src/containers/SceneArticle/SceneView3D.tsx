//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useState } from 'react';

import { Entity, Obj } from '@dxos/echo';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { type VersionedSource, combinedSource, patchSource, recordChanges } from '@dxos/react-ui-canvas/headless';
import {
  CameraToolbar,
  DisplayPanel,
  FLOATING_BAR,
  InspectorPanel,
  InspectorSection,
  type InspectorSectionDef,
  ReadonlyToggle,
  type ToolGroup,
  ToolRail,
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
import { type LayoutIntent, Scene, bounds3D, findLayout, reachedObjects, resolveLayout3D } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';
import { downloadBlob } from '@dxos/util';

import { applyLayoutIntent, layoutSource, openScene, writeModelIntent } from '#model';
import { type Canvas } from '#types';

import { CanvasNamespace } from '../../namespace.ts';
import { LibraryPanel } from '../LibraryPanel/index.ts';
import { useSceneDocument } from '../SceneStage/index.ts';
import { ElementForm, elementFormIntents, elementFormValues } from './element-form.ts';
import { grid3D, sceneChrome } from './scene-chrome.ts';
import { type SessionHistory, sessionHistory } from './session-history.ts';
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

const CREATE_KINDS = ['cube', 'sphere', 'cylinder', 'cone'] as const;

const isLayout3D = (value: unknown): value is Scene.Layout3D => Obj.instanceOf(Scene.Layout3D, value);

const KIND_ICONS: Record<(typeof CREATE_KINDS)[number], string> = {
  cube: 'ph--cube--regular',
  sphere: 'ph--circle--regular',
  cylinder: 'ph--cylinder--regular',
  cone: 'ph--triangle--regular',
};

/** The rail's groups: picking and the view, transforming, then making; ids name each tool's label and test id. */
const TOOL_GROUPS: readonly { name: string; entries: readonly { id: string; tool: Tool3D; icon: string }[] }[] = [
  {
    name: 'Tools',
    entries: [
      { id: 'select', tool: 'select', icon: 'ph--cursor--regular' },
      { id: 'orbit', tool: 'orbit', icon: 'ph--globe-simple--regular' },
    ],
  },
  {
    name: 'Transform',
    entries: [
      { id: 'move', tool: 'move', icon: 'ph--arrows-out-cardinal--regular' },
      { id: 'rotate', tool: 'rotate', icon: 'ph--arrow-clockwise--regular' },
      { id: 'scale', tool: 'scale', icon: 'ph--arrows-out--regular' },
    ],
  },
  {
    name: 'Make',
    entries: [
      { id: 'link', tool: 'link', icon: 'ph--line-segment--regular' },
      { id: 'extrude', tool: 'extrude', icon: 'ph--arrow-fat-line-up--regular' },
      ...CREATE_KINDS.map((kind) => ({ id: kind, tool: { create: kind }, icon: KIND_ICONS[kind] })),
    ],
  },
];

const sameTool = (left: Tool3D, right: Tool3D): boolean => JSON.stringify(left) === JSON.stringify(right);

const toolTestId = (entry: { tool: Tool3D }): string =>
  `canvas3d.tool.${typeof entry.tool === 'object' ? ('create' in entry.tool ? entry.tool.create : 'place') : entry.tool}`;

const PROPERTIES: InspectorSectionDef = {
  id: 'properties',
  title: 'Properties',
  icon: 'ph--sliders-horizontal--regular',
  order: 0,
  defaultOpen: true,
};

const LIBRARY: InspectorSectionDef = { id: 'library', title: 'Library', icon: 'ph--package--regular', order: 1 };

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
      direction === 'undo'
        ? patchSource(source, { from: change.after, to: change.before, paths: change.paths })
        : patchSource(source, { from: change.before, to: change.after, paths: change.paths });
      history.current =
        direction === 'undo'
          ? { done: done.slice(0, -1), undone: [...undone, change] }
          : { done: [...done, change], undone: undone.slice(0, -1) };
      setHistoryVersion((version) => version + 1);
    },
    [source],
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
            // Make object moves elements between layouts, which the undo history recorded paths in: its entries would
            // patch elements that are no longer there, so the history starts over rather than skip them silently.
            history.current = { done: [], undone: [] };
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
      TOOL_GROUPS.filter((group) => !readonly || group.name === 'Tools').map((group) => ({
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
    <Panel.Root role={role}>
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
          {selected && (
            <InspectorSection section={{ ...PROPERTIES, title: t('properties.label') }}>
              <Form.Root
                key={selected.id}
                schema={ElementForm}
                values={elementFormValues(selected)}
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
          <InspectorSection section={{ ...LIBRARY, title: t('library.label') }}>
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
