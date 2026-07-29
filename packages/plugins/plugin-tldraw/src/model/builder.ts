//
// Copyright 2026 DXOS.org
//

//
// tldraw implementation of the illustrator `DrawingBuilder` contract: supplies the record
// encoding (identity in `meta`, page scaffold, binding cleanup) and inherits the command
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

import { Tldraw } from '../types';
import { elementBoxes, readScene } from './read';
import { DOCUMENT_ID, PAGE_ID } from './RecordBuilder';
import { renderObject } from './render';

const isShape = (record: any) => record?.typeName === 'shape';

const handler: ContentHandler = {
  identify: (record) => {
    if (!isShape(record) || typeof record.meta?.object !== 'string' || typeof record.meta?.element !== 'string') {
      return undefined;
    }
    return { object: record.meta.object, element: record.meta.element } satisfies Identity;
  },

  render: (object, placement, content) =>
    renderObject(object, { ...placement, indexStart: nextIndex(content, isShape), external: elementBoxes(content) }),

  read: (content) => readScene(content),

  translate: (record, delta) => {
    record.x += delta.x;
    record.y += delta.y;
  },

  scaffold: (content: ContentMap) => {
    content[DOCUMENT_ID] ??= { gridSize: 10, name: '', meta: {}, id: DOCUMENT_ID, typeName: 'document' };
    content[PAGE_ID] ??= { meta: {}, id: PAGE_ID, name: 'Page 1', index: 'a1', typeName: 'page' };
  },

  // Bindings reference shapes by id; drop any left dangling by a deletion.
  prune: (content: ContentMap) => {
    for (const [key, record] of Object.entries(content)) {
      if (record?.typeName === 'binding' && (!content[record.fromId] || !content[record.toId])) {
        delete content[key];
      }
    }
  },
};

export const TldrawBuilder = makeBuilder({ schema: Tldraw.TLDRAW_SCHEMA, handler });

/**
 * Apply commands straight to a content map, bypassing ECHO — for tests and tooling that hold
 * raw tldraw records. The object-aware path is {@link TldrawBuilder}.
 */
export const applyCommands = (content: ContentMap, commands: readonly Scene.Command[]) =>
  applyContentCommands(content, commands, handler);
