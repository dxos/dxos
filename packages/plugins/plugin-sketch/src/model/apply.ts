//
// Copyright 2026 DXOS.org
//

//
// Applies scene DSL edit commands to canvas content by mutating the record map in place
// (callers wrap the call in `Obj.update` so a batch commits atomically).
//

import { invariant } from '@dxos/invariant';

import { elementBoxes, readScene } from './read';
import { renderObject } from './render';
import type * as Scene from './scene';
import { type CanvasContent, DOCUMENT_ID, PAGE_ID } from './SketchBuilder';

export type ApplyResult = {
  /** Object ids created or modified. */
  upserted: string[];
  /** Shape records removed. */
  removed: number;
};

/** Apply a batch of edit commands to the canvas content (mutates `content`). */
export const applyCommands = (content: CanvasContent, commands: readonly Scene.Command[]): ApplyResult => {
  ensurePage(content);
  const upserted = new Set<string>();
  let removed = 0;

  for (const command of commands) {
    switch (command.op) {
      case 'upsert-object': {
        const previous = readScene(content).scene.objects.find((object) => object.id === command.object.id);
        removed += remove(content, (record) => record.meta?.object === command.object.id);
        merge(content, command.object, {
          origin: command.object.origin ?? previous?.origin ?? { x: 0, y: 0 },
          scale: command.object.scale ?? previous?.scale ?? 1,
        });
        upserted.add(command.object.id);
        break;
      }
      case 'upsert-elements': {
        const previous = readScene(content).scene.objects.find((object) => object.id === command.objectId);
        invariant(previous, `unknown object: ${command.objectId} (use upsert-object to create it)`);
        const ids = new Set(command.elements.map((element) => element.id));
        removed += remove(
          content,
          (record) => record.meta?.object === command.objectId && ids.has(record.meta?.element),
        );
        merge(
          content,
          { id: command.objectId, elements: command.elements },
          { origin: previous.origin, scale: previous.scale },
        );
        upserted.add(command.objectId);
        break;
      }
      case 'remove-elements': {
        const ids = new Set(command.elementIds);
        removed += remove(
          content,
          (record) => record.meta?.object === command.objectId && ids.has(record.meta?.element),
        );
        break;
      }
      case 'remove-object': {
        removed += remove(content, (record) => record.meta?.object === command.objectId);
        break;
      }
      case 'move-object': {
        const previous = readScene(content).scene.objects.find((object) => object.id === command.objectId);
        invariant(previous, `unknown object: ${command.objectId}`);
        const delta = { x: command.origin.x - previous.origin.x, y: command.origin.y - previous.origin.y };
        for (const record of Object.values(content)) {
          if (record?.typeName === 'shape' && record.meta?.object === command.objectId) {
            record.x += delta.x;
            record.y += delta.y;
          }
        }
        upserted.add(command.objectId);
        break;
      }
    }
  }

  return { upserted: [...upserted], removed };
};

const merge = (
  content: CanvasContent,
  object: Scene.WorldObject | { id: string; elements: readonly Scene.Element[] },
  placement: { origin: Scene.Point; scale: number },
): void => {
  const records = renderObject(object, {
    ...placement,
    indexStart: nextIndex(content),
    external: elementBoxes(content),
  });
  Object.assign(content, records);
};

/** Delete matching shape records, then any bindings left dangling. */
const remove = (content: CanvasContent, predicate: (record: any) => boolean): number => {
  let removed = 0;
  for (const [key, record] of Object.entries(content)) {
    if (record?.typeName === 'shape' && predicate(record)) {
      delete content[key];
      removed++;
    }
  }
  for (const [key, record] of Object.entries(content)) {
    if (record?.typeName === 'binding' && (!content[record.fromId] || !content[record.toId])) {
      delete content[key];
    }
  }
  return removed;
};

/** Seed the fractional-index counter past any existing `a<n>` indexes. */
const nextIndex = (content: CanvasContent): number => {
  let max = 0;
  let shapes = 0;
  for (const record of Object.values(content)) {
    if (record?.typeName !== 'shape') {
      continue;
    }
    shapes++;
    const match = /^a(\d+)$/.exec(record.index ?? '');
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return Math.max(max, shapes);
};

const ensurePage = (content: CanvasContent): void => {
  content[DOCUMENT_ID] ??= { gridSize: 10, name: '', meta: {}, id: DOCUMENT_ID, typeName: 'document' };
  content[PAGE_ID] ??= { meta: {}, id: PAGE_ID, name: 'Page 1', index: 'a1', typeName: 'page' };
};
