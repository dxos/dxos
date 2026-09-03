//
// Copyright 2026 DXOS.org
//

//
// SVG variant content handler: the scene DSL is the persistence format. Each element is stored
// verbatim as one record carrying its DSL identity and its object's placement, so
// `applyCommands` provides upsert/remove/move and `read` reconstructs the scene losslessly —
// there is no renderer-native encoding to compile to. See `docs/DESIGN.md`.
//

import { makeBuilder } from './builder.ts';
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
  data: Scene.Element;
};

const isSvgRecord = (record: any): record is SvgRecord =>
  typeof record?.object === 'string' && typeof record?.element === 'string' && record?.data !== undefined;

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
    const records: ContentMap = {};
    for (const element of object.elements) {
      records[`${object.id}/${element.id}`] = {
        object: object.id,
        element: element.id,
        order: order++,
        placement: { origin: { ...placement.origin }, scale: placement.scale },
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
          elements: [],
        };
        objects.set(record.object, object);
      }
      (object.elements as Scene.Element[]).push(record.data);
    }
    return { scene: { objects: [...objects.values()] }, unmanaged };
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

/** Scene builder for the SVG variant — a peer of `TldrawBuilder`. */
export const SvgBuilder = makeBuilder({ schema: SVG_SCHEMA, handler: SvgHandler });
