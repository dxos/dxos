//
// Copyright 2026 DXOS.org
//

//
// SVG variant content handler: the scene DSL is the persistence format. Each element is stored
// verbatim as one record carrying its DSL identity and its object's placement, so
// `applyCommands` provides upsert/remove/move and `read` reconstructs the scene losslessly —
// there is no renderer-native encoding to compile to. The plugin binds it to ECHO as `SvgBuilder`.
//

import { type ContentHandler, type ContentMap, type ReadWorldObject } from './content.ts';
import type * as Scene from './scene.ts';

/** Discriminates the base `Drawing.Canvas` as SVG-rendered scene content. */
export const SVG_SCHEMA = 'dxos.org/svg/1';

type SvgRecord = {
  object: string;
  element: string;
  /** Insertion order, so `read` reproduces element paint order. */
  order: number;
  placement: { origin: Scene.Point; scale: number };
  /** The object's `ref`, repeated on each of its records so `read` restores it. */
  ref?: string;
  /** The object's fractional z-order `index`, repeated like `ref`. */
  index?: string;
  data: Scene.Element;
};

const isSvgRecord = (record: any): record is SvgRecord =>
  typeof record?.object === 'string' && typeof record?.element === 'string' && record?.data !== undefined;

/** Objects without an index paint first, in insertion order; indexed objects follow in index order. */
const byIndex = (left: ReadWorldObject, right: ReadWorldObject): number =>
  left.index === undefined
    ? right.index === undefined
      ? 0
      : -1
    : right.index === undefined
      ? 1
      : left.index < right.index
        ? -1
        : left.index > right.index
          ? 1
          : 0;

export const SvgHandler: ContentHandler = {
  identify: (record) => (isSvgRecord(record) ? { object: record.object, element: record.element } : undefined),

  render: (object, placement, content) => {
    // Past the max, not the count: deletions leave gaps, and a reused order makes paint order
    // ambiguous on read.
    let order =
      Math.max(
        -1,
        ...Object.values(content)
          .filter(isSvgRecord)
          .map((record) => record.order),
      ) + 1;
    // `upsert-elements` supplies only elements; the object's ref and index then come from its
    // existing records.
    const existing = Object.values(content).find((record) => isSvgRecord(record) && record.object === object.id);
    const ref = ('ref' in object && object.ref) || existing?.ref;
    const index = ('index' in object && object.index) || existing?.index;
    const records: ContentMap = {};
    for (const element of object.elements) {
      records[`${object.id}/${element.id}`] = {
        object: object.id,
        element: element.id,
        order: order++,
        placement: { origin: { ...placement.origin }, scale: placement.scale },
        ...(ref ? { ref } : {}),
        ...(index ? { index } : {}),
        // Structured clone: scene elements are plain data, and the record must not alias the input.
        data: JSON.parse(JSON.stringify(element)),
      } satisfies SvgRecord;
    }
    return records;
  },

  read: (content) => {
    const records = Object.values(content)
      .filter(isSvgRecord)
      .sort((left, right) => left.order - right.order);
    const objects = new Map<string, ReadWorldObject>();
    let unmanaged = 0;
    for (const record of Object.values(content)) {
      if (!isSvgRecord(record)) {
        unmanaged++;
      }
    }
    for (const record of records) {
      let object = objects.get(record.object);
      if (!object) {
        object = {
          id: record.object,
          origin: { ...record.placement.origin },
          scale: record.placement.scale,
          ...(record.ref ? { ref: record.ref } : {}),
          ...(record.index ? { index: record.index } : {}),
          elements: [],
        };
        objects.set(record.object, object);
      }
      (object.elements as Scene.Element[]).push(record.data);
    }
    return { scene: { objects: [...objects.values()].sort(byIndex) }, unmanaged };
  },

  translate: (record, delta) => {
    if (isSvgRecord(record)) {
      record.placement.origin = {
        x: record.placement.origin.x + delta.x,
        y: record.placement.origin.y + delta.y,
      };
    }
  },
};
