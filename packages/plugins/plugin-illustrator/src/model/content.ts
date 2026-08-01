//
// Copyright 2026 DXOS.org
//

//
// Renderer-neutral command application over a canvas content map. Every renderer stores its
// canvas as `Record<recordId, record>` and stamps DSL identity onto each managed record, so the
// upsert/remove/move bookkeeping is identical; only the encoding differs. Renderers supply that
// encoding via `ContentHandler` and inherit the command semantics.
//

import { invariant } from '@dxos/invariant';

import type * as Scene from './scene';

/** Opaque map of record id → renderer record. */
export type ContentMap = Record<string, any>;

/** DSL identity stamped onto a managed record. */
export type Identity = {
  object: string;
  element: string;
  /** Set on companion records that belong to an element rather than being one (e.g. arrow labels). */
  part?: string;
};

/** Where an object sits on the canvas: `canvas = origin + local * scale`. */
export type Placement = {
  origin: Scene.Point;
  scale: number;
};

/** An object as accepted by the renderer's compiler; `upsert-elements` supplies only a subset. */
export type ObjectInput = Scene.WorldObject | { id: string; elements: readonly Scene.Element[] };

/** A world object as derived from the canvas: placement is always resolved. */
export type ReadWorldObject = Scene.WorldObject & Placement;

export type ReadResult = {
  scene: { objects: ReadWorldObject[] };
  /** Records on the canvas not managed by the DSL (drawn by hand). */
  unmanaged: number;
};

export type ApplyResult = {
  /** Object ids created or modified. */
  upserted: string[];
  /** Records removed. */
  removed: number;
};

/**
 * The renderer-specific half of command application: how records carry identity, how objects
 * compile to records, and any bookkeeping the renderer's store requires.
 */
export type ContentHandler = {
  /** DSL identity for a record, or undefined when the record isn't managed by the DSL. */
  identify: (record: any) => Identity | undefined;
  /** Compile an object's elements into records keyed by record id. */
  render: (object: ObjectInput, placement: Placement, content: ContentMap) => ContentMap;
  /** Derive the scene from the content map. */
  read: (content: ContentMap) => ReadResult;
  /** Translate an object move into a per-record mutation. */
  translate: (record: any, delta: Scene.Point) => void;
  /** Create any scaffolding the renderer needs before its first record (e.g. a page). */
  scaffold?: (content: ContentMap) => void;
  /** Merge compiled records into the content map; defaults to a plain assign. */
  merge?: (content: ContentMap, records: ContentMap) => void;
  /** Clean up after deletions (e.g. drop bindings left dangling). */
  prune?: (content: ContentMap) => void;
};

/** Apply a batch of edit commands to the canvas content (mutates `content`). */
export const applyCommands = (
  content: ContentMap,
  commands: readonly Scene.Command[],
  handler: ContentHandler,
): ApplyResult => {
  handler.scaffold?.(content);
  const upserted = new Set<string>();
  let removed = 0;

  const find = (objectId: string) => handler.read(content).scene.objects.find((object) => object.id === objectId);

  const merge = (object: ObjectInput, placement: Placement) => {
    const records = handler.render(object, placement, content);
    if (handler.merge) {
      handler.merge(content, records);
    } else {
      Object.assign(content, records);
    }
  };

  // Companion records (labels) are deleted alongside their element but aren't themselves
  // elements, so they don't count toward the reported total.
  const remove = (predicate: (identity: Identity) => boolean): number => {
    let count = 0;
    for (const [key, record] of Object.entries(content)) {
      const identity = handler.identify(record);
      if (identity && predicate(identity)) {
        // Read before delete: ECHO proxies dereference lazily, so fields vanish once removed.
        const isPart = identity.part !== undefined;
        delete content[key];
        if (!isPart) {
          count++;
        }
      }
    }
    handler.prune?.(content);
    return count;
  };

  for (const command of commands) {
    switch (command.op) {
      case 'upsert-object': {
        const previous = find(command.object.id);
        removed += remove((identity) => identity.object === command.object.id);
        merge(command.object, {
          origin: command.object.origin ?? previous?.origin ?? { x: 0, y: 0 },
          scale: command.object.scale ?? previous?.scale ?? 1,
        });
        upserted.add(command.object.id);
        break;
      }

      case 'upsert-elements': {
        const previous = find(command.objectId);
        invariant(previous, `unknown object: ${command.objectId} (use upsert-object to create it)`);
        const ids = new Set(command.elements.map((element) => element.id));
        removed += remove((identity) => identity.object === command.objectId && ids.has(identity.element));
        merge({ id: command.objectId, elements: command.elements }, previous);
        upserted.add(command.objectId);
        break;
      }

      case 'remove-elements': {
        const ids = new Set(command.elementIds);
        removed += remove((identity) => identity.object === command.objectId && ids.has(identity.element));
        break;
      }

      case 'remove-object': {
        removed += remove((identity) => identity.object === command.objectId);
        break;
      }

      case 'move-object': {
        const previous = find(command.objectId);
        invariant(previous, `unknown object: ${command.objectId}`);
        const delta = { x: command.origin.x - previous.origin.x, y: command.origin.y - previous.origin.y };
        for (const record of Object.values(content)) {
          if (handler.identify(record)?.object === command.objectId) {
            handler.translate(record, delta);
          }
        }
        upserted.add(command.objectId);
        break;
      }
    }
  }

  return { upserted: [...upserted], removed };
};

/** Seed a fractional-index counter past any existing `a<n>` indexes. */
export const nextIndex = (content: ContentMap, isCounted: (record: any) => boolean = () => true): number => {
  let max = 0;
  let count = 0;
  for (const record of Object.values(content)) {
    if (!record || !isCounted(record)) {
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
