//
// Copyright 2026 DXOS.org
//

//
// A plugin-canvas `Canvas` seen as the v2 content records the scene handler, its builder and the canvas operations
// edit: the open scene's layouts read as records, and records written back to those layouts element by element. The
// DSL identity a record carries is kept on its element as its typed `dsl` field, so the illustrator's commands still find the
// elements they manage.
//

import { type ContentMap, applyCommands } from '@dxos/diagram';
import { Obj } from '@dxos/echo';
import type * as IllustratorModel from '@dxos/plugin-illustrator/IllustratorModel';
import { toRenderList2D } from '@dxos/react-ui-canvas/headless';
import { type View, type ViewMap } from '@dxos/react-ui-canvas/headless';
import { Scene, fromEcho } from '@dxos/scene';

import { Canvas } from '#types';

import { openScene } from './canvas-document.ts';
import {
  canvasRecordOf,
  clone,
  isLinkRecord,
  isNodeRecord,
  linkKey,
  nodeKey,
  readViews,
  writeViews,
} from './content.ts';
import { SceneHandler } from './handler.ts';
import { type DecorateLayout, makeLayoutWriter } from './layout-writer.ts';
import { same } from './records.ts';

const CANVAS_KEY = 'canvas';

const openScene2D = (canvas: Canvas.Canvas): Scene.Scene2D | undefined => {
  const scene = openScene(canvas);
  return Obj.instanceOf(Scene.Scene2D, scene) ? scene : undefined;
};

const isDslIdentity = (value: unknown): value is Scene.DslIdentity =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'object') === 'string' &&
  typeof Reflect.get(value, 'element') === 'string';

/** The canvas's open scene and the layouts it reaches as content records, with the canvas's settings record. */
export const readCanvasContent = (canvas: Canvas.Canvas): ContentMap => {
  const scene = openScene2D(canvas);
  const content: ContentMap = {};
  if (!scene) {
    return content;
  }
  const doc = fromEcho(scene);
  const root = scene.layout.target?.key ?? scene.key;
  content[CANVAS_KEY] = { kind: 'canvas', root, ...clone(canvas.settings) };
  const views: ViewMap = Object.fromEntries(
    doc.layouts.flatMap((layout) => (layout.dim === '2d' ? [[layout.id, toRenderList2D(doc, layout)]] : [])),
  );
  writeViews(content, views);
  for (const layout of doc.layouts) {
    for (const [id, element] of Object.entries(layout.elements)) {
      const dsl: unknown = element.dsl;
      const key = element.type === 'link' ? linkKey(id) : nodeKey(id);
      const record = content[key];
      if (isDslIdentity(dsl) && (isNodeRecord(record) || isLinkRecord(record))) {
        content[key] = { ...record, dsl };
      }
    }
  }
  return content;
};

/** Each record's DSL identity, by element id, for the layouts a write updates. */
const identities = (content: ContentMap): ReadonlyMap<string, Scene.DslIdentity> =>
  new Map(
    Object.values(content).flatMap((record) =>
      isNodeRecord(record) && record.dsl
        ? [[record.node.id, record.dsl] as const]
        : isLinkRecord(record) && record.dsl
          ? [[record.link.id, record.dsl] as const]
          : [],
    ),
  );

/**
 * Writes content records back to the canvas: what changed since `previous` (every record, without it) to the
 * layouts, element by element, and the settings record to the canvas's settings.
 */
export const writeCanvasContent = (canvas: Canvas.Canvas, content: ContentMap, previous?: ContentMap) => {
  const scene = openScene2D(canvas);
  if (!scene) {
    return;
  }
  const dsl = identities(content);
  const decorate: DecorateLayout = (record) => ({
    ...record,
    elements: Object.fromEntries(
      Object.entries(record.elements).map(([id, element]) => {
        const identity = dsl.get(id);
        return [id, identity ? { ...element, dsl: identity } : element];
      }),
    ),
  });
  const views: ViewMap = readViews(clone(content));
  const before: Record<string, View> | undefined = previous && readViews(clone(previous));
  makeLayoutWriter(scene, { canvas }).write(views, before, decorate);

  const record = canvasRecordOf(content);
  if (record) {
    const { kind: _kind, root: _root, ...settings } = clone(record);
    if (!same(settings, canvas.settings)) {
      Obj.update(canvas, (canvas) => {
        canvas.settings = settings;
      });
    }
  }
};

/**
 * The illustrator's scene builder over a `Canvas`: the scene handler reads and applies the DSL against the open
 * scene's layouts, through their content records.
 */
export const CanvasLayoutBuilder: IllustratorModel.DrawingBuilder = {
  schema: Canvas.SCENE_SCHEMA,
  read: (canvas) => SceneHandler.read(Canvas.isCanvas(canvas) ? readCanvasContent(canvas) : {}),
  apply: (canvas, commands) => {
    if (!Canvas.isCanvas(canvas)) {
      return { upserted: [], removed: 0 };
    }
    const before = readCanvasContent(canvas);
    const content = clone(before);
    const result = applyCommands(content, commands, SceneHandler);
    writeCanvasContent(canvas, content, before);
    return result;
  },
};
