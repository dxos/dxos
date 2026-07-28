//
// Copyright 2026 DXOS.org
//

//
// Applies scene DSL edit commands to canvas content by mutating the element map in place
// (callers wrap the call in `Obj.update` so a batch commits atomically).
//

import { invariant } from '@dxos/invariant';
import { type ApplyResult, type Scene } from '@dxos/plugin-illustrator/model';

import { elementBoxes, readScene } from './read';
import { type CanvasContent, renderObject } from './render';

/** Apply a batch of edit commands to the canvas content (mutates `content`). */
export const applyCommands = (content: CanvasContent, commands: readonly Scene.Command[]): ApplyResult => {
  const upserted = new Set<string>();
  let removed = 0;

  for (const command of commands) {
    switch (command.op) {
      case 'upsert-object': {
        const previous = readScene(content).scene.objects.find((object) => object.id === command.object.id);
        removed += remove(content, (record) => record.customData?.object === command.object.id);
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
          (record) => record.customData?.object === command.objectId && ids.has(record.customData?.element),
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
          (record) => record.customData?.object === command.objectId && ids.has(record.customData?.element),
        );
        break;
      }
      case 'remove-object': {
        removed += remove(content, (record) => record.customData?.object === command.objectId);
        break;
      }
      case 'move-object': {
        const previous = readScene(content).scene.objects.find((object) => object.id === command.objectId);
        invariant(previous, `unknown object: ${command.objectId}`);
        const delta = { x: command.origin.x - previous.origin.x, y: command.origin.y - previous.origin.y };
        for (const record of Object.values(content)) {
          if (record?.customData?.object === command.objectId) {
            record.x += delta.x;
            record.y += delta.y;
            record.version = (record.version ?? 0) + 1;
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
  // Bump versions past any replaced elements so the store adapter propagates the change.
  for (const [id, record] of Object.entries(records)) {
    const previous = content[id];
    if (previous) {
      record.version = (previous.version ?? 0) + 1;
    }
    content[id] = record;
  }
};

/** Delete matching elements; companion labels share the object/element ids so they match too. */
const remove = (content: CanvasContent, predicate: (record: any) => boolean): number => {
  let removed = 0;
  for (const [key, record] of Object.entries(content)) {
    if (record && record.customData && predicate(record)) {
      // Read before delete: ECHO proxies dereference lazily, so fields vanish once removed.
      const isLabel = record.customData.part === 'label';
      delete content[key];
      if (!isLabel) {
        removed++;
      }
    }
  }
  return removed;
};

/** Seed the fractional-index counter past any existing `a<n>` indexes. */
const nextIndex = (content: CanvasContent): number => {
  let max = 0;
  let count = 0;
  for (const record of Object.values(content)) {
    if (!record) {
      continue;
    }
    count++;
    const match = /^a(\d+)$/.exec(record.index ?? '');
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return Math.max(max, count);
};
