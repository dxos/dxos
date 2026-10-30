//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj } from '@dxos/echo';
import { type VersionedSource, readPath, sameValue, writePath } from '@dxos/react-ui-canvas/headless';
import { type LayoutIntent, type LayoutPatch, Scene, applyIntent } from '@dxos/scene';

import { plain } from './records.ts';
import { writeFields } from './write-fields.ts';

/** A 2D layout's own fields that a `layout` intent writes, as plain data. */
const layoutFields = (layout: Scene.Layout2D): LayoutPatch => ({
  ...(layout.lattice !== undefined ? { lattice: plain(layout.lattice) } : {}),
  ...(layout.constraints !== undefined ? { constraints: plain(layout.constraints) } : {}),
});

/** A layout's elements (and a 2D layout's own fields) as plain data, at its Automerge `heads` or now. */
const snapshot = (layout: Scene.Layout2D | Scene.Layout3D, heads?: readonly string[]) => {
  const at = heads && heads.length > 0 ? Obj.getVersion(layout, [...heads]) : layout;
  return { elements: plain(at.elements), ...(Obj.instanceOf(Scene.Layout2D, at) ? layoutFields(at) : {}) };
};

const isHeads = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((head) => typeof head === 'string');

const isElement3D = Schema.is(Scene.Element3D);
const isElement2D = Schema.is(Scene.Element2D);
const isLattice = Schema.is(Scene.Lattice);
const isConstraints = Schema.is(Schema.Array(Scene.Constraint));

/** Writes `next` (undefined unsets it) to the 2D layout field `field`, inside an `Obj.update`. */
const writeLayoutField = (layout: Obj.Mutable<Scene.Layout2D>, field: keyof LayoutPatch, next: unknown): void => {
  if (field === 'lattice') {
    if (next === undefined) {
      delete layout.lattice;
    } else if (isLattice(next)) {
      layout.lattice = plain(next);
    }
  } else if (next === undefined) {
    delete layout.constraints;
  } else if (isConstraints(next)) {
    layout.constraints = plain(next);
  }
};

const isLayoutField = (field: string | undefined): field is keyof LayoutPatch =>
  field === 'lattice' || field === 'constraints';

/**
 * A layout of either dimension as a versioned source over `{ elements }` (paths `['elements', id, …]`) and a 2D
 * layout's own fields (`['constraints']`, `['lattice', …]`), its heads its Automerge heads, so react-ui-canvas's
 * `recordChanges` and `patchSource` undo and redo edits to it without clobbering a peer's.
 */
export const layoutSource = (layout: Scene.Layout2D | Scene.Layout3D): VersionedSource => {
  const dim = Obj.instanceOf(Scene.Layout3D, layout) ? '3d' : '2d';
  return {
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
          if (isLayoutField(field) && Obj.instanceOf(Scene.Layout2D, layout)) {
            const current = layout[field];
            writeLayoutField(
              layout,
              field,
              path.length === 1 ? value : writePath(current && plain(current), path.slice(1), value),
            );
            continue;
          }
          if (field !== 'elements' || id === undefined) {
            continue;
          }
          const current = layout.elements[id];
          const before = current === undefined ? undefined : plain(current);
          const next = rest.length === 0 ? value : writePath(before ?? {}, rest, value);
          if (next === undefined) {
            delete layout.elements[id];
          } else if (current !== undefined) {
            (dim === '3d' ? isElement3D(next) : isElement2D(next)) && writeFields(current, before, plain(next));
          } else if (Obj.instanceOf(Scene.Layout3D, layout)) {
            isElement3D(next) && (layout.elements[id] = plain(next));
          } else if (Obj.instanceOf(Scene.Layout2D, layout)) {
            isElement2D(next) && (layout.elements[id] = plain(next));
          }
        }
      }),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isLayout3D = (layout: Scene.Layout2D | Scene.Layout3D): layout is Scene.Layout3D =>
  Obj.instanceOf(Scene.Layout3D, layout);

/**
 * Applies `intent` to a stored layout of either dimension, writing only the elements it changed, field by field, and a
 * 2D layout's own fields it changed, in one change: the one write path for layouts, so 2D and 3D edits go through the
 * same intent vocabulary and a mode's model is written (and undone) with the elements it places.
 */
export const applyLayoutIntent = (layout: Scene.Layout2D | Scene.Layout3D, intent: LayoutIntent): void => {
  const arrange = layout.arrange && plain(layout.arrange);
  const before: Scene.LayoutRecord = isLayout3D(layout)
    ? { id: layout.key, dim: '3d', elements: plain(layout.elements), ...(arrange ? { arrange } : {}) }
    : {
        id: layout.key,
        dim: '2d',
        elements: plain(layout.elements),
        ...(arrange ? { arrange } : {}),
        ...layoutFields(layout),
      };
  const after = applyIntent(before, intent);
  if (after === before) {
    return;
  }
  const beforeElements: Record<string, unknown> = before.elements;
  const afterElements: Record<string, unknown> = after.elements;
  const ids = new Set([...Object.keys(beforeElements), ...Object.keys(afterElements)]);
  const changed = [...ids].filter((id) => !sameValue(beforeElements[id], afterElements[id]));
  const fields =
    before.dim === '2d' && after.dim === '2d'
      ? (['lattice', 'constraints'] as const).filter((field) => !sameValue(before[field], after[field]))
      : [];
  if (changed.length === 0 && fields.length === 0) {
    return;
  }
  Obj.update(layout, (layout) => {
    if (Obj.instanceOf(Scene.Layout2D, layout) && after.dim === '2d') {
      for (const field of fields) {
        writeLayoutField(layout, field, after[field]);
      }
    }
    const elements: Record<string, Record<string, unknown>> = layout.elements;
    for (const id of changed) {
      const raw = afterElements[id];
      const element = raw === undefined ? undefined : plain(raw);
      const current = elements[id];
      if (!isRecord(element)) {
        delete elements[id];
      } else if (current === undefined) {
        elements[id] = element;
      } else {
        writeFields(current, beforeElements[id], element);
      }
    }
  });
};
