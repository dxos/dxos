//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import {
  type VersionChange,
  type VersionedSource,
  combinedSource,
  patchSource,
  recordChanges,
} from '@dxos/react-ui-canvas/headless';
import { Form } from '@dxos/react-ui-form';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { Scene3DEditor, type Tool3D } from '@dxos/react-ui-scene';
import * as Panel from '@dxos/react-ui/Panel';
import { type LayoutIntent, Scene, reachedObjects, resolveLayout3D } from '@dxos/scene';

import { applyLayoutIntent, layoutSource, openScene } from '#model';
import { type Canvas } from '#types';

import { CanvasNamespace } from '../../namespace.ts';
import { useSceneDocument } from '../SceneStage/index.ts';

export type Scene3DArticleProps = {
  canvas: Canvas.Canvas;
  role?: string;
  attendableId?: string;
};

/** How long the orbit camera must rest before it is written back to the open scene. */
const CAMERA_SETTLE_MS = 500;

const CREATE_KINDS = ['cube', 'sphere', 'cylinder', 'cone'] as const;

const isLayout3D = (value: unknown): value is Scene.Layout3D => Obj.instanceOf(Scene.Layout3D, value);

const label = (key: string): [string, { ns: string }] => [key, { ns: CanvasNamespace.key }];

/** The fields a person edits in the Properties form; geometry and bindings are the gizmos' and tools'. */
const ElementProperties = Schema.Struct({
  label: Scene.Element3D.fields.label,
  style: Scene.Element3D.fields.style,
  center: Scene.Element3D.fields.center,
  rotation: Scene.Element3D.fields.rotation,
  scale: Scene.Element3D.fields.scale,
});

type History = { done: VersionChange[]; undone: VersionChange[] };

/**
 * A 3D canvas: its open `Scene3D`, edited with Scene3DEditor; every edit is a `LayoutIntent` written to the layout
 * that owns the element, recorded for undo and redo over every 3D layout the scene reaches.
 */
export const Scene3DArticle = ({ canvas, role, attendableId }: Scene3DArticleProps) => {
  const scene = openScene(canvas);
  const stored = Obj.instanceOf(Scene.Scene3D, scene) ? scene : undefined;
  const document = useSceneDocument(stored);
  const [tool, setTool] = useState<Tool3D>('select');
  const [selection, setSelection] = useState<string[]>([]);
  const [editing, setEditing] = useState<string>();

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
  const history = useRef<History>({ done: [], undone: [] });
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

  // The orbit camera goes back to the scene once it settles, so the canvas reopens where it was left.
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleCameraChange = useCallback(
    (camera: Scene.Camera3D) => {
      clearTimeout(settle.current);
      settle.current = setTimeout(() => {
        stored &&
          Obj.update(stored, (stored) => {
            stored.camera = { ...camera, target: { ...camera.target } };
          });
      }, CAMERA_SETTLE_MS);
    },
    [stored],
  );
  useEffect(() => () => clearTimeout(settle.current), []);

  const editingLayout = editing ?? document?.scenes[0]?.layout;
  const record = document?.layouts.find((layout) => layout.id === editingLayout);
  const selected = selection.length === 1 && record?.dim === '3d' ? record.elements[selection[0]] : undefined;
  const resolved =
    selected && document && record?.dim === '3d' ? resolveLayout3D(document, record)[selected.id] : undefined;

  const menu = useMenuBuilder(() => {
    const builder = MenuBuilder.make();
    const tools: { id: string; tool: Tool3D; icon: string }[] = [
      { id: 'select', tool: 'select', icon: 'ph--cursor--regular' },
      { id: 'move', tool: 'move', icon: 'ph--arrows-out-cardinal--regular' },
      { id: 'rotate', tool: 'rotate', icon: 'ph--arrow-clockwise--regular' },
      { id: 'scale', tool: 'scale', icon: 'ph--arrows-out--regular' },
      { id: 'link', tool: 'link', icon: 'ph--line-segment--regular' },
      ...CREATE_KINDS.map((kind) => ({
        id: kind,
        tool: { create: kind },
        icon: {
          cube: 'ph--cube--regular',
          sphere: 'ph--circle--regular',
          cylinder: 'ph--cylinder--regular',
          cone: 'ph--triangle--regular',
        }[kind],
      })),
    ];
    for (const entry of tools) {
      builder.action(
        `tool-${entry.id}`,
        {
          label: label(`tool.${entry.id}.label`),
          icon: entry.icon,
          checked: JSON.stringify(entry.tool) === JSON.stringify(tool),
          disposition: 'toolbar',
          testId: `canvas3d.tool.${entry.id}`,
        },
        () => setTool(entry.tool),
      );
    }
    const layout = editingLayout;
    builder
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
  }, [tool, selection, editingLayout, resolved, selected, handleIntent, step, history.current]);

  const handleSave = useCallback(
    (values: Schema.Schema.Type<typeof ElementProperties>) => {
      if (!editingLayout || !selected) {
        return;
      }
      const intents: LayoutIntent[] = (['label', 'style', 'center', 'rotation', 'scale'] as const).flatMap((field) =>
        JSON.stringify(values[field]) === JSON.stringify(selected[field])
          ? []
          : [{ kind: 'update', id: selected.id, path: [field], value: values[field] }],
      );
      intents.length > 0 && handleIntent(editingLayout, { kind: 'batch', intents });
    },
    [editingLayout, selected, handleIntent],
  );

  if (!stored || !document) {
    return null;
  }

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <ActionToolbar {...menu} attendableId={attendableId} />
      </Panel.Header>
      <Panel.Body>
        <div className='relative dx-fill'>
          <Scene3DEditor
            document={document}
            scene={stored.key}
            editing={editing}
            selection={selection}
            tool={tool}
            onSelect={setSelection}
            onIntent={handleIntent}
            onEdit={(layout) => setEditing(layout === document.scenes[0]?.layout ? undefined : layout)}
            onCameraChange={handleCameraChange}
          />
          {selected && (
            <div
              className='absolute top-2 right-2 w-72 max-h-[calc(100%-1rem)] overflow-auto rounded-sm bg-base-surface'
              data-testid='canvas3d.properties'
            >
              <Form.Root
                key={selected.id}
                schema={ElementProperties}
                values={{
                  label: selected.label,
                  style: selected.style,
                  center: selected.center,
                  rotation: selected.rotation,
                  scale: selected.scale,
                }}
                autoSave
                onSave={handleSave}
              >
                <Form.Viewport scroll={false}>
                  <Form.Content>
                    <Form.Fields />
                  </Form.Content>
                </Form.Viewport>
              </Form.Root>
            </div>
          )}
        </div>
      </Panel.Body>
    </Panel.Root>
  );
};

Scene3DArticle.displayName = 'Scene3DArticle';
