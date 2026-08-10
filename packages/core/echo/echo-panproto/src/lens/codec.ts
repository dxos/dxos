//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { Obj, type Type } from '@dxos/echo';

import { plan as compile, readSource } from './mapping';
import { getOverlay } from './overlay';
import {
  type AnyLens,
  type CodedMapping,
  type Lens,
  type Mapping,
  type Plan,
  type ResolvedEntry,
  type Write,
} from './types';

const read = (obj: Obj.Unknown | Obj.Snapshot) => (property: string) => Obj.getValue(obj, [property]);

const project = (obj: Obj.Unknown | Obj.Snapshot, id: string, plan: Plan): Record<string, unknown> => {
  const view: Record<string, unknown> = { id: (obj as { id: string }).id };
  for (const entry of plan.entries) {
    const value = entry.get(readSource(read(obj), entry.from));
    if (value !== undefined) {
      view[entry.property] = value;
    }
  }
  for (const property of plan.overlays) {
    const value = getOverlay(obj, id, property);
    if (value !== undefined) {
      view[property] = value;
    }
  }
  return view;
};

const invert = (view: Record<string, unknown>, obj: Obj.Unknown, id: string, plan: Plan): readonly Write[] => {
  const byProperty = new Map<string, ResolvedEntry>(plan.entries.map((entry) => [entry.property, entry]));
  const overlays = new Set(plan.overlays);
  const writes: Write[] = [];

  for (const [property, value] of Object.entries(view)) {
    if (property === 'id') {
      continue;
    }

    const entry = byProperty.get(property);
    if (entry) {
      if (!entry.put) {
        // Dropping the write silently is the worst outcome: the UI would show a value the object
        // never received. A read-only property must be visibly read-only, so this is loud.
        throw new TypeError(`Lens: "${property}" is read-only.`);
      }
      const changed = entry.put(value, readSource(read(obj), entry.from));
      for (const [target, next] of Object.entries(changed)) {
        writes.push({ kind: 'assign', path: [target], value: next });
      }
      continue;
    }

    if (overlays.has(property)) {
      writes.push({ kind: 'overlay', lens: id, property, value });
      continue;
    }

    throw new TypeError(`Lens: "${property}" is not a property of the target, or is unmapped.`);
  }

  return writes;
};

/**
 * Define a lens between a source ECHO type and a declared target type.
 *
 * The mapping is partial: a target property with a same-named, type-compatible source property maps
 * itself, and one with no counterpart stores itself in the object's annotation dictionary. Neither
 * convenience is silent — `Lens.coverage` reports what was decided.
 */
export const make = <S extends Type.AnyObj, T extends Type.AnyObj | Schema.Schema.Any>(
  id: string,
  source: S,
  target: T,
  mapping: Mapping<Type.InstanceType<S>, TargetOf<T>> = {},
): Lens<Type.InstanceType<S>, TargetOf<T>> => {
  const plan = compile(source, target, mapping as Mapping);
  return {
    id,
    source,
    target,
    plan,
    get: (obj) => project(obj, id, plan) as TargetOf<T>,
    put: (view, obj) => invert(view as Record<string, unknown>, obj, id, plan),
  };
};

/**
 * Define a lens whose transform is opaque — parsing, tree construction, serialization: anything no
 * per-property mapping can express. Indistinguishable from `make` to every consumer.
 */
export const coded = <S extends Type.AnyObj, T extends Type.AnyObj | Schema.Schema.Any>(
  id: string,
  source: S,
  target: T,
  mapping: CodedMapping<Type.InstanceType<S>, TargetOf<T>>,
): Lens<Type.InstanceType<S>, TargetOf<T>> => ({
  id,
  source,
  target,
  get: (obj) => mapping.get(obj as Type.InstanceType<S>),
  put: (view, obj) => mapping.put(view, mapping.get(obj as Type.InstanceType<S>), obj as Type.InstanceType<S>),
});

/** The instance type a target declares, whether it is an ECHO type or a plain schema. */
export type TargetOf<T> = T extends Type.AnyObj
  ? Type.InstanceType<T>
  : T extends Schema.Schema<infer A, any, any>
    ? A
    : never;

/** Project the base object into the target shape (a detached snapshot; see `of` for a live view). */
export const get = <S, T>(obj: Obj.Unknown, lens: Lens<S, T>): T => lens.get(obj);

/** The writes a partial view would produce, without applying them. */
export const writes = (obj: Obj.Unknown, lens: AnyLens, view: Record<string, unknown>): readonly Write[] =>
  lens.put(view, obj);
