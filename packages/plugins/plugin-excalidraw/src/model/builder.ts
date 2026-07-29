//
// Copyright 2026 DXOS.org
//

//
// Excalidraw implementation of the illustrator `DrawingBuilder` contract: supplies the record
// encoding (identity in `customData`, label companions, version bumps) and inherits the command
// semantics from the shared content handler.
//

import {
  type ContentHandler,
  type ContentMap,
  type Identity,
  type Scene,
  applyCommands as applyContentCommands,
  makeBuilder,
  nextIndex,
} from '@dxos/plugin-illustrator/model';

import { Excalidraw } from '../types';
import { readScene } from './read';
import { renderObject } from './render';

const handler: ContentHandler = {
  identify: (record) => {
    if (record?.isDeleted || typeof record?.customData?.object !== 'string') {
      return undefined;
    }
    const { object, element, part } = record.customData;
    return typeof element === 'string' ? ({ object, element, part } satisfies Identity) : undefined;
  },

  render: (object, placement, content) =>
    renderObject(object, { ...placement, indexStart: nextIndex(content), external: elementBoxesOf(content) }),

  read: (content) => readScene(content),

  translate: (record, delta) => {
    record.x += delta.x;
    record.y += delta.y;
    record.version = (record.version ?? 0) + 1;
  },

  // Excalidraw's store diffs on `version`; a replaced element must outrank the one it supersedes
  // or the component keeps rendering the stale copy.
  merge: (content: ContentMap, records: ContentMap) => {
    for (const [id, record] of Object.entries(records)) {
      const previous = content[id];
      if (previous) {
        record.version = (previous.version ?? 0) + 1;
      }
      content[id] = record;
    }
  },
};

/** Bounding boxes of managed elements, keyed by `objectId/elementId`, for cross-object arrows. */
const elementBoxesOf = (content: ContentMap) => {
  const boxes: Record<string, { x: number; y: number; w: number; h: number }> = {};
  for (const record of Object.values(content ?? {})) {
    const data = record?.customData;
    if (record && !record.isDeleted && data?.object && data?.element && data.part !== 'label') {
      boxes[`${data.object}/${data.element}`] = {
        x: record.x ?? 0,
        y: record.y ?? 0,
        w: record.width ?? 0,
        h: record.height ?? 0,
      };
    }
  }
  return boxes;
};

export const ExcalidrawBuilder = makeBuilder({ schema: Excalidraw.EXCALIDRAW_SCHEMA, handler });

/**
 * Apply commands straight to a content map, bypassing ECHO — for tests and tooling that hold
 * raw excalidraw elements. The object-aware path is {@link ExcalidrawBuilder}.
 */
export const applyCommands = (content: ContentMap, commands: readonly Scene.Command[]) =>
  applyContentCommands(content, commands, handler);
