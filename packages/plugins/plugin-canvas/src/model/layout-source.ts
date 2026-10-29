//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj } from '@dxos/echo';
import { type VersionedSource, readPath, sameValue, writePath } from '@dxos/react-ui-canvas/headless';
import { type LayoutIntent, Scene, applyIntent } from '@dxos/scene';

import { plain } from './layout-writer.ts';
import { writeFields } from './write-fields.ts';

/** A 3D layout's elements as plain data, at its Automerge `heads` or now. */
const snapshot = (layout: Scene.Layout3D, heads?: readonly string[]) => {
  const at = heads && heads.length > 0 ? Obj.getVersion(layout, [...heads]) : layout;
  return { elements: plain(at.elements) };
};

const isHeads = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((head) => typeof head === 'string');

const isElement3D = Schema.is(Scene.Element3D);

/**
 * A 3D layout as a versioned source over `{ elements }` (paths `['elements', id, …]`), its heads its Automerge heads,
 * so react-ui-canvas's `recordChanges` and `patchSource` undo and redo edits to it without clobbering a peer's.
 */
export const layoutSource = (layout: Scene.Layout3D): VersionedSource => ({
  heads: () => [...(Obj.version(layout).automergeHeads ?? [])],
  read: (path, heads) =>
    heads === undefined
      ? readPath(snapshot(layout), path)
      : isHeads(heads)
        ? readPath(snapshot(layout, heads), path)
        : undefined,
  write: (writes) =>
    Obj.update(layout, (layout) => {
      for (const { path, value } of writes) {
        const [field, id, ...rest] = path;
        if (field !== 'elements' || id === undefined) {
          continue;
        }
        const current = layout.elements[id];
        const before = current === undefined ? undefined : plain(current);
        const next = rest.length === 0 ? value : writePath(before ?? {}, rest, value);
        if (next === undefined) {
          delete layout.elements[id];
        } else if (isElement3D(next)) {
          current === undefined ? (layout.elements[id] = plain(next)) : writeFields(current, before, plain(next));
        }
      }
    }),
});

/** Applies `intent` to a stored 3D layout, writing only the elements it changed, in one change. */
export const applyLayoutIntent = (layout: Scene.Layout3D, intent: LayoutIntent): void => {
  const before: Scene.LayoutRecord3D = { id: layout.key, dim: '3d', elements: plain(layout.elements) };
  const after = applyIntent(before, intent);
  if (after === before) {
    return;
  }
  const ids = new Set([...Object.keys(before.elements), ...Object.keys(after.elements)]);
  const changed = [...ids].filter((id) => !sameValue(before.elements[id], after.elements[id]));
  if (changed.length === 0) {
    return;
  }
  Obj.update(layout, (layout) => {
    for (const id of changed) {
      const element = after.elements[id];
      const current = layout.elements[id];
      if (element === undefined) {
        delete layout.elements[id];
      } else if (current === undefined) {
        layout.elements[id] = plain(element);
      } else {
        writeFields(current, before.elements[id], plain(element));
      }
    }
  });
};
